const KEY = process.env.GEMINI_API_KEY;
if (!KEY || KEY.includes("pega_aqui")) {
  console.log("Falta la clave: pégala en el archivo .env y guarda.");
  process.exit(1);
}

const BASE = "https://generativelanguage.googleapis.com/v1beta";

(async () => {
  const r = await fetch(`${BASE}/models?pageSize=100`, {
    headers: { "x-goog-api-key": KEY },
  });
  console.log("Estado:", r.status);
  if (!r.ok) {
    console.log((await r.text()).slice(0, 300));
    return;
  }
  const j = await r.json();
  const nombres = (j.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace("models/", ""));
  console.log("Modelos con generateContent:", nombres.length);
  nombres.filter((n) => n.startsWith("gemini")).forEach((n) => console.log(" -", n));
})();