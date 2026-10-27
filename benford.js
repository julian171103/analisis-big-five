// benford.js
// Funciones puras para la Ley de Benford. No usan Playwright ni leen archivos,
// por eso se pueden probar con datos sintéticos (pruebas/benford.test.js).

const DIGITOS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const CRITICO_CHI = { gl: 8, p05: 15.507, p01: 20.09 }; // chi-cuadrado, 8 grados de libertad

// ---------- Fórmula de Benford ----------
// P(d) = log10(1 + 1/d)
function probabilidadBenford(d) {
  return Math.log10(1 + 1 / d);
}

// ---------- Lectura de números ----------
// Primer dígito significativo de un entero positivo. null si no es válido (0, negativo, NaN, texto).
function primerDigito(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const entero = Math.floor(n);
  if (entero < 1) return null;
  return Number(String(entero)[0]);
}

// Convierte lo que muestra Instagram en un número.
//  - titulo: atributo title del contador (exacto, con puntos de miles: "1.070.524")
//  - texto:  texto visible ("966 seguidores", "15,5 mil seguidores", "1 M seguidores")
// Devuelve { valor, tipo } con tipo "exacto" o "aproximado", o null si no se entiende.
function leerNumero(titulo, texto) {
  const t = String(titulo ?? "").trim();
  if (t && /^[\d.,\s\u00a0]+$/.test(t) && /\d/.test(t)) {
    return { valor: Number(t.replace(/\D/g, "")), tipo: "exacto" };
  }
  const limpio = String(texto ?? "").replace(/\s+/g, " ").trim();
  const m = limpio.match(/^([\d.,]+)\s*(millones|mill\.?|mil|k|m)?(?:\s|$)/i);
  if (!m) return null;
  const [, numero, sufijo] = m;
  if (!sufijo) {
    // sin sufijo, puntos y comas son separadores de miles: "1.234" = 1234
    if (!/\d/.test(numero)) return null;
    return { valor: Number(numero.replace(/\D/g, "")), tipo: "exacto" };
  }
  // con sufijo, la coma (o el punto) es decimal: "15,5 mil" = 15500
  const decimal = Number(numero.replace(",", "."));
  if (!Number.isFinite(decimal)) return null;
  const multiplicador = /^(millones|mill\.?|m)$/i.test(sufijo) ? 1e6 : 1e3;
  return { valor: Math.round(decimal * multiplicador), tipo: "aproximado" };
}

// ---------- Conteos y tabla comparativa ----------
function contarDigitos(valores) {
  const conteos = Object.fromEntries(DIGITOS.map((d) => [d, 0]));
  for (const v of valores) {
    const d = primerDigito(v);
    if (d) conteos[d]++;
  }
  return conteos;
}

function tablaComparacion(conteos) {
  const total = DIGITOS.reduce((a, d) => a + conteos[d], 0);
  return DIGITOS.map((d) => {
    const p = probabilidadBenford(d);
    const relativa = total ? conteos[d] / total : 0;
    return {
      digito: d,
      observada: conteos[d], // frecuencia absoluta
      relativa, // 0 a 1
      porcentaje: relativa * 100, // frecuencia observada en %
      esperada: p * 100, // frecuencia teórica en %
      esperada_abs: p * total, // cuántas veces se esperaría
      diferencia_pp: relativa * 100 - p * 100, // puntos porcentuales
    };
  });
}

// ---------- Pruebas complementarias ----------
// Chi-cuadrado: suma de (observado - esperado)^2 / esperado, con 8 grados de libertad.
function chiCuadrado(tabla) {
  const total = tabla.reduce((a, f) => a + f.observada, 0);
  if (!total) return null;
  const estadistico = tabla.reduce((a, f) => a + (f.observada - f.esperada_abs) ** 2 / f.esperada_abs, 0);
  const minEsperada = Math.min(...tabla.map((f) => f.esperada_abs));
  return {
    estadistico,
    gl: CRITICO_CHI.gl,
    critico_5: CRITICO_CHI.p05,
    critico_1: CRITICO_CHI.p01,
    supera_5: estadistico > CRITICO_CHI.p05,
    supera_1: estadistico > CRITICO_CHI.p01,
    advertencia: minEsperada < 5 ? "Algún dígito tiene menos de 5 casos esperados: la prueba pierde fiabilidad." : null,
  };
}

// MAD (desviación absoluta media) con los umbrales de Nigrini para el primer dígito.
function mad(tabla) {
  const total = tabla.reduce((a, f) => a + f.observada, 0);
  if (!total) return null;
  const valor = tabla.reduce((a, f) => a + Math.abs(f.relativa - f.esperada / 100), 0) / tabla.length;
  const categoria =
    valor <= 0.006 ? "conformidad cercana" : valor <= 0.012 ? "conformidad aceptable" : valor <= 0.015 ? "conformidad marginal" : "no conformidad";
  return { valor, categoria };
}

// ---------- Análisis completo ----------
// filas: [{ usuario, valor, tipo, estado }] tal como las guarda paso11.
// Los registros inválidos no entran al cálculo, pero se cuentan por motivo.
function analizar(filas, meta = 250) {
  const vistos = new Set();
  const motivos = { duplicado: 0, sin_dato: 0, error: 0, cero_o_invalido: 0, excedente: 0 };
  const usados = [];
  for (const f of filas) {
    const clave = String(f.usuario ?? "").trim().toLowerCase();
    if (clave && vistos.has(clave)) { motivos.duplicado++; continue; }
    if (clave) vistos.add(clave);
    if (f.estado === "error") { motivos.error++; continue; }
    if (f.estado === "sin_dato" || f.valor === null || f.valor === undefined) { motivos.sin_dato++; continue; }
    if (primerDigito(f.valor) === null) { motivos.cero_o_invalido++; continue; }
    if (usados.length >= meta) { motivos.excedente++; continue; }
    usados.push(f);
  }
  const conteos = contarDigitos(usados.map((f) => f.valor));
  const tabla = tablaComparacion(conteos);
  const sumaObservada = tabla.reduce((a, f) => a + f.observada, 0);
  const sumaTeorica = DIGITOS.reduce((a, d) => a + probabilidadBenford(d) * 100, 0);
  return {
    examinados: filas.length,
    validos: usados.length,
    meta,
    completa: usados.length >= meta,
    motivos,
    exactos: usados.filter((f) => f.tipo === "exacto").length,
    aproximados: usados.filter((f) => f.tipo === "aproximado").length,
    conteos,
    tabla,
    chi: chiCuadrado(tabla),
    mad: mad(tabla),
    comprobaciones: {
      suma_observada_igual_a_validos: sumaObservada === usados.length,
      suma_teorica_pct: sumaTeorica,
      suma_teorica_ok: Math.abs(sumaTeorica - 100) < 1e-9,
    },
  };
}

// ---------- Gráfico comparativo (HTML con SVG, sin dependencias) ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pct = (v) => v.toFixed(1).replace(".", ",") + " %";

function graficoHTML(res, { titulo, notas = [] }) {
  const W = 780, H = 470, m = { t: 78, r: 30, b: 100, l: 64 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const maxVal = Math.max(...res.tabla.map((f) => Math.max(f.porcentaje, f.esperada)));
  const tope = Math.ceil((maxVal * 1.15) / 5) * 5;
  const cx = (i) => m.l + (iw / 9) * (i + 0.5);
  const y = (v) => m.t + ih - (v / tope) * ih;
  const anchoBarra = (iw / 9) * 0.5;

  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(titulo)}" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Arial, sans-serif">`;
  for (let v = 0; v <= tope; v += 5) {
    svg += `<line x1="${m.l}" y1="${y(v)}" x2="${W - m.r}" y2="${y(v)}" stroke="#e3e7ec"/>`;
    svg += `<text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end" font-size="12" fill="#566275">${v}</text>`;
  }
  svg += `<text transform="translate(18 ${m.t + ih / 2}) rotate(-90)" text-anchor="middle" font-size="13" fill="#1b2a41">Frecuencia (%)</text>`;
  res.tabla.forEach((f, i) => {
    const x = cx(i) - anchoBarra / 2;
    svg += `<rect class="barra" x="${x}" y="${y(f.porcentaje)}" width="${anchoBarra}" height="${m.t + ih - y(f.porcentaje)}" fill="#1F4E79"/>`;
    svg += `<text x="${cx(i)}" y="${m.t + ih + 20}" text-anchor="middle" font-size="14" fill="#1b2a41" font-weight="600">${f.digito}</text>`;
    svg += `<text x="${cx(i)}" y="${m.t + ih + 40}" text-anchor="middle" font-size="11" fill="#1F4E79">obs. ${pct(f.porcentaje)}</text>`;
    svg += `<text x="${cx(i)}" y="${m.t + ih + 56}" text-anchor="middle" font-size="11" fill="#9a6a00">teo. ${pct(f.esperada)}</text>`;
  });
  const puntos = res.tabla.map((f, i) => `${cx(i)},${y(f.esperada)}`).join(" ");
  svg += `<polyline class="teorica" points="${puntos}" fill="none" stroke="#C98A00" stroke-width="2.5"/>`;
  res.tabla.forEach((f, i) => { svg += `<circle cx="${cx(i)}" cy="${y(f.esperada)}" r="4.5" fill="#C98A00" stroke="#fff" stroke-width="1.5"/>`; });
  svg += `<text x="${m.l + iw / 2}" y="${H - 14}" text-anchor="middle" font-size="13" fill="#1b2a41">Primer dígito significativo</text>`;
  svg += `<rect x="${m.l}" y="34" width="14" height="14" fill="#1F4E79"/><text x="${m.l + 20}" y="46" font-size="13" fill="#1b2a41">Observada (n = ${res.validos})</text>`;
  svg += `<line x1="${m.l + 230}" y1="41" x2="${m.l + 252}" y2="41" stroke="#C98A00" stroke-width="2.5"/><circle cx="${m.l + 241}" cy="41" r="4.5" fill="#C98A00"/><text x="${m.l + 260}" y="46" font-size="13" fill="#1b2a41">Teórica (Ley de Benford)</text>`;
  svg += `</svg>`;

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>body{font-family:"Segoe UI",Arial,sans-serif;max-width:820px;margin:24px auto;padding:0 16px;color:#1b2a41}
h1{font-size:20px}svg{width:100%;height:auto}.nota{font-size:14px;line-height:1.5;color:#33415a}</style></head>
<body><h1>${esc(titulo)}</h1>${svg}
${notas.map((n) => `<p class="nota">${esc(n)}</p>`).join("\n")}
</body></html>`;
}

module.exports = {
  DIGITOS, CRITICO_CHI, probabilidadBenford, primerDigito, leerNumero, contarDigitos,
  tablaComparacion, chiCuadrado, mad, analizar, graficoHTML,
};
