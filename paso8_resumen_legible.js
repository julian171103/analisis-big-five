const fs = require("fs");

const r = JSON.parse(fs.readFileSync("datos/resultado_big_five.json", "utf-8"));
const a = r.analisis;
const nombres = {
  apertura: "Apertura a la experiencia",
  responsabilidad: "Responsabilidad",
  extraversion: "Extraversión",
  amabilidad: "Amabilidad",
  neuroticismo: "Neuroticismo (sensibilidad emocional)",
};

let t = "ESTIMACIÓN EXPLORATORIA BIG FIVE\n";
t += "Esto NO es un test psicológico ni un diagnóstico. Es una estimación hecha por una IA\n";
t += `a partir de ${r.publicaciones_usadas.length} publicaciones de texto.\n`;
t += `Modelo: ${r.modelo_version_devuelta ?? r.modelo_solicitado}. Fecha: ${r.fecha.slice(0, 10)}\n\n`;

for (const [k, titulo] of Object.entries(nombres)) {
  const x = a.rasgos?.[k];
  if (!x) continue;
  t += `${titulo}\n  Nivel: ${x.nivel} | Puntaje: ${x.puntaje ?? "—"} | Confianza: ${x.confianza}\n  ${x.evidencia}\n\n`;
}
t += `Resumen\n${a.perfil_resumen}\n\nLimitaciones\n${a.limitaciones}\n`;

fs.writeFileSync("datos/para_la_companera.txt", t, "utf-8");
console.log("Creado: datos/para_la_companera.txt");