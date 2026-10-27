// paso12_benford.js
// Lee datos/cuentas_<lista>.json (lo crea paso11), aplica la Ley de Benford al primer
// dígito del número de seguidores y genera tabla, resumen y gráfico en datos/.
//
//   node paso12_benford.js

const fs = require("fs");
const C = require("./benford_config");
const B = require("./benford");

if (!fs.existsSync(C.ARCHIVO_CUENTAS)) {
  console.log(`No encuentro ${C.ARCHIVO_CUENTAS}. Ejecuta primero paso11_recolectar_seguidores.js.`);
  process.exit(1);
}
const datos = JSON.parse(fs.readFileSync(C.ARCHIVO_CUENTAS, "utf-8"));
const res = B.analizar(datos.filas, C.META_CUENTAS);

if (res.validos === 0) {
  console.log("No hay registros válidos: no se puede calcular la distribución.");
  console.log("Registros examinados:", res.examinados, "| Descartados por motivo:", res.motivos);
  process.exit(1);
}

const f2 = (v) => v.toFixed(2).replace(".", ",");

// ---- Consola ----
console.log(`\nLey de Benford sobre el número de seguidores (lista: ${C.LISTA})`);
console.log(`Registros examinados: ${res.examinados} | válidos usados: ${res.validos} de ${C.META_CUENTAS}` +
            (res.completa ? "" : "  <-- MUESTRA INCOMPLETA"));
console.log("Descartados por motivo:", res.motivos);
console.log(`Números exactos: ${res.exactos} | aproximados (texto abreviado): ${res.aproximados}\n`);
console.table(res.tabla.map((f) => ({
  Dígito: f.digito, Observada: f.observada, "Obs. %": f2(f.porcentaje), "Teórica %": f2(f.esperada), "Dif. (pp)": f2(f.diferencia_pp),
})));

// ---- Interpretación prudente ----
const mayor = res.tabla.reduce((a, f) => (Math.abs(f.diferencia_pp) > Math.abs(a.diferencia_pp) ? f : a));
const notas = [
  `Muestra: ${res.validos} cuentas válidas de ${res.examinados} examinadas (meta ${C.META_CUENTAS}). ` +
    (res.completa ? "" : "La muestra está incompleta. ") +
    `Descartados: duplicados ${res.motivos.duplicado}, sin dato ${res.motivos.sin_dato}, con error ${res.motivos.error}, valor cero o inválido ${res.motivos.cero_o_invalido}. Válidos sobrantes sin usar (por encima de la meta): ${res.motivos.excedente}.`,
  `La mayor diferencia está en el dígito ${mayor.digito}: ${f2(mayor.porcentaje)} % observado frente a ${f2(mayor.esperada)} % esperado (${f2(mayor.diferencia_pp)} puntos porcentuales).`,
];
if (res.chi) {
  notas.push(
    `Chi-cuadrado: ${f2(res.chi.estadistico)} con ${res.chi.gl} grados de libertad; ` +
      `${res.chi.supera_5 ? "supera" : "no supera"} el valor crítico de 15,51 (5 %) y ${res.chi.supera_1 ? "supera" : "no supera"} el de 20,09 (1 %). ` +
      (res.chi.advertencia ?? "")
  );
}
if (res.mad) notas.push(`MAD: ${res.mad.valor.toFixed(4).replace(".", ",")} (${res.mad.categoria} según los umbrales de Nigrini para el primer dígito).`);
notas.push(
  "Limitaciones: la Ley de Benford no determina si una cuenta es un bot. Una desviación solo indica un patrón que merece revisión adicional, y una distribución parecida a Benford tampoco prueba que todas las cuentas sean auténticas. " +
    "Con unos 250 registros las pruebas tienen poca potencia, y la muestra puede estar sesgada por el orden de la lista, el método de extracción y las características de esta población concreta."
);
notas.forEach((n) => console.log("- " + n));

// ---- Archivos ----
const cols = ["digito", "observada", "porcentaje_observado", "porcentaje_teorico", "diferencia_pp"];
const csv = [cols.join(",")].concat(
  res.tabla.map((f) => [f.digito, f.observada, f.porcentaje.toFixed(2), f.esperada.toFixed(2), f.diferencia_pp.toFixed(2)].join(","))
).join("\n");
fs.writeFileSync(C.ARCHIVO_TABLA, "\uFEFF" + csv, "utf-8");

fs.writeFileSync(
  C.ARCHIVO_RESUMEN,
  JSON.stringify({ generado: new Date().toISOString(), cuenta: C.USUARIO, lista: C.LISTA, ...res, interpretacion: notas }, null, 2),
  "utf-8"
);
fs.writeFileSync(
  C.ARCHIVO_GRAFICO,
  B.graficoHTML(res, { titulo: `Primer dígito del número de seguidores: distribución observada y teórica de Benford (${C.LISTA})`, notas }),
  "utf-8"
);
console.log(`\nArchivos: ${C.ARCHIVO_TABLA}, ${C.ARCHIVO_RESUMEN}, ${C.ARCHIVO_GRAFICO}`);
console.log(`Abre el gráfico con:  start ${C.ARCHIVO_GRAFICO.replace("/", "\\")}`);
