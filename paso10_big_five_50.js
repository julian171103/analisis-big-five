const fs = require("fs");

const MODELOS = ["gemini-3.8-flash", "gemini-flash-latest"];
const MIN = 30;
const KEY = process.env.GEMINI_API_KEY;

if (!KEY || KEY.includes("pega_aqui")) {
  console.log("Falta la clave en .env");
  process.exit(1);
}

const limpiar = (t) =>
  t.replace(/@[\w.]+/g, "@usuario").replace(/https?:\/\/\S+/g, "[enlace]");

const filas = JSON.parse(fs.readFileSync("datos/publicaciones_50.json", "utf-8"));
const usados = filas
  .filter((f) => f.texto && f.texto.length >= MIN)
  .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));

const textos = usados
  .map((f) => `Publicación ${f.n} (${f.fecha_hora.slice(0, 4)}): ${limpiar(f.texto)}`)
  .join("\n\n");

const SISTEMA = `Eres un asistente que realiza una estimación exploratoria de rasgos del modelo Big Five (apertura, responsabilidad, extraversión, amabilidad, neuroticismo) a partir de textos de publicaciones.
Reglas:
- Basa cada afirmación solo en los textos entregados. No inventes datos.
- Los textos abarcan años distintos. Indica si los rasgos parecen cambiar entre épocas y no asumas que lo de hace años describe a la persona hoy.
- Con pocos textos, usa confianza baja y di "evidencia insuficiente" cuando corresponda.
- No hagas diagnósticos clínicos ni infieras salud, orientación sexual, religión ni posturas políticas.
- En "evidencia" cita el número de publicación y parafrasea; no copies más de 8 palabras seguidas.
- Responde únicamente con JSON válido y en español, con esta forma exacta:
{"rasgos":{"apertura":{"nivel":"bajo|medio|alto|evidencia insuficiente","puntaje":1-5 o null,"confianza":"baja|media|alta","evidencia":"..."},"responsabilidad":{...},"extraversion":{...},"amabilidad":{...},"neuroticismo":{...}},"perfil_resumen":"máximo 80 palabras, descriptivo, sin etiquetas absolutas","cambios_entre_epocas":"máximo 40 palabras","limitaciones":"..."}`;

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function llamar(modelo) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SISTEMA }] },
        contents: [{ role: "user", parts: [{ text: textos }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json", maxOutputTokens: 8192 },
      }),
    }
  );
}

(async () => {
  console.log(`Publicaciones enviadas: ${usados.length} (${textos.length} caracteres)`);

  let r;
  let modeloUsado = null;
  for (const m of MODELOS) {
    for (let intento = 1; intento <= 3; intento++) {
      r = await llamar(m);
      console.log(`Modelo ${m}, intento ${intento}: estado ${r.status}`);
      if (r.status !== 503 && r.status !== 429) break;
      if (intento < 3) await espera(intento * 15000);
    }
    if (r.ok) { modeloUsado = m; break; }
  }
  if (!r.ok) {
    console.log("Ningún modelo respondió. Último mensaje:");
    console.log((await r.text()).slice(0, 300));
    return;
  }

  const j = await r.json();
  const cand = j.candidates?.[0];
  console.log("Motivo de fin:", cand?.finishReason);
  if (!cand?.content?.parts) {
    console.log("La respuesta no trae contenido. No se guardó nada.");
    return;
  }

  let analisis;
  try {
    analisis = JSON.parse(cand.content.parts.map((p) => p.text ?? "").join(""));
  } catch (e) {
    console.log("La respuesta no es JSON válido. No se guardó nada.");
    return;
  }

  const rasgos = ["apertura", "responsabilidad", "extraversion", "amabilidad", "neuroticismo"];
  const faltan = rasgos.filter((k) => !analisis.rasgos?.[k]);
  if (faltan.length) console.log("Faltan rasgos en la respuesta:", faltan.join(", "));

  fs.writeFileSync(
    "datos/resultado_big_five_50.json",
    JSON.stringify({
      modelo_solicitado: modeloUsado,
      modelo_version_devuelta: j.modelVersion ?? null,
      fecha: new Date().toISOString(),
      publicaciones_usadas: usados.map((f) => f.n),
      caracteres_enviados: textos.length,
      prompt_sistema: SISTEMA,
      analisis,
    }, null, 2),
    "utf-8"
  );
  console.log("Guardado en datos/resultado_big_five_50.json");

  // Comparación con el análisis de 6 textos, si existe
  let previo = null;
  if (fs.existsSync("datos/resultado_big_five.json")) {
    previo = JSON.parse(fs.readFileSync("datos/resultado_big_five.json", "utf-8")).analisis;
  }
  console.log("\nrasgo | 6 textos | 14 textos");
  rasgos.forEach((k) => {
    const n = analisis.rasgos?.[k];
    const p = previo?.rasgos?.[k];
    const f = (x) => (x ? `${x.nivel} (${x.puntaje ?? "—"}, conf. ${x.confianza})` : "—");
    console.log(`${k} | ${f(p)} | ${f(n)}`);
  });
  console.log("\nResumen:", analisis.perfil_resumen);
  console.log("Cambios entre épocas:", analisis.cambios_entre_epocas);
  console.log("Limitaciones:", analisis.limitaciones);
})();