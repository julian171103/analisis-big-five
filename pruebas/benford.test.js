// Pruebas de benford.js con datos SINTÉTICOS (no son datos de Instagram).
// Ejecutar:  npm test
const test = require("node:test");
const assert = require("node:assert");
const B = require("../benford.js");

const fila = (usuario, valor, extra = {}) => ({ usuario, valor, tipo: "exacto", estado: "ok", ...extra });

test("primerDigito: 1250 da 1, 843 da 8 y 325 da 3", () => {
  assert.strictEqual(B.primerDigito(1250), 1);
  assert.strictEqual(B.primerDigito(843), 8);
  assert.strictEqual(B.primerDigito(325), 3);
  assert.strictEqual(B.primerDigito(9), 9);
});

test("primerDigito: el cero y los valores inválidos devuelven null", () => {
  for (const v of [0, -5, NaN, Infinity, null, undefined, "123", 0.4]) assert.strictEqual(B.primerDigito(v), null);
});

test("leerNumero: usa el title exacto con puntos de miles", () => {
  assert.deepStrictEqual(B.leerNumero("1.070.524", "1 M seguidores"), { valor: 1070524, tipo: "exacto" });
  assert.deepStrictEqual(B.leerNumero("966", "966 seguidores"), { valor: 966, tipo: "exacto" });
});

test("leerNumero: sin title interpreta el texto abreviado como aproximado", () => {
  assert.deepStrictEqual(B.leerNumero("", "15,5 mil seguidores"), { valor: 15500, tipo: "aproximado" });
  assert.deepStrictEqual(B.leerNumero("", "1 M seguidores"), { valor: 1000000, tipo: "aproximado" });
  assert.deepStrictEqual(B.leerNumero("", "1,2 K seguidores"), { valor: 1200, tipo: "aproximado" });
  assert.deepStrictEqual(B.leerNumero("", "2,5 mill. seguidores"), { valor: 2500000, tipo: "aproximado" });
});

test("leerNumero: texto sin sufijo y valores no interpretables", () => {
  assert.deepStrictEqual(B.leerNumero("", "2.592 seguidores"), { valor: 2592, tipo: "exacto" });
  assert.deepStrictEqual(B.leerNumero("", "966 seguidores"), { valor: 966, tipo: "exacto" });
  for (const t of ["", null, undefined, "seguidores", "abc"]) assert.strictEqual(B.leerNumero("", t), null);
});

test("el primer dígito se conserva aunque el número sea abreviado", () => {
  assert.strictEqual(B.primerDigito(B.leerNumero("", "15,5 mil seguidores").valor), 1);
  assert.strictEqual(B.primerDigito(B.leerNumero("", "9,9 mil seguidores").valor), 9);
});

test("distribución teórica: coincide con la tabla y suma 100 %", () => {
  const esperado = [30.1, 17.61, 12.49, 9.69, 7.92, 6.69, 5.8, 5.12, 4.58];
  B.DIGITOS.forEach((d, i) => assert.ok(Math.abs(B.probabilidadBenford(d) * 100 - esperado[i]) < 0.006));
  const suma = B.DIGITOS.reduce((a, d) => a + B.probabilidadBenford(d), 0);
  assert.ok(Math.abs(suma - 1) < 1e-12);
});

test("contarDigitos ignora ceros, negativos y nulos", () => {
  const c = B.contarDigitos([1250, 843, 325, 0, -4, null, 17, 1999]);
  assert.strictEqual(c[1], 3);
  assert.strictEqual(c[8], 1);
  assert.strictEqual(c[3], 1);
  assert.strictEqual(B.DIGITOS.reduce((a, d) => a + c[d], 0), 5);
});

test("tablaComparacion: las frecuencias observadas suman el total y el 100 %", () => {
  const t = B.tablaComparacion(B.contarDigitos([1, 1, 2, 3, 3, 3, 9]));
  assert.strictEqual(t.reduce((a, f) => a + f.observada, 0), 7);
  assert.ok(Math.abs(t.reduce((a, f) => a + f.porcentaje, 0) - 100) < 1e-9);
  assert.ok(Math.abs(t.reduce((a, f) => a + f.esperada, 0) - 100) < 1e-9);
  const f3 = t[2];
  assert.ok(Math.abs(f3.diferencia_pp - (f3.porcentaje - f3.esperada)) < 1e-12);
});

test("analizar: duplicados, sin dato, error y ceros no entran al cálculo y se cuentan", () => {
  const filas = [
    fila("ana", 1250), fila("ANA", 1250), fila("luis", 843),
    fila("sol", null, { estado: "sin_dato" }), fila("rio", null, { estado: "error" }),
    fila("cero", 0), fila("mar", 325),
  ];
  const r = B.analizar(filas, 250);
  assert.strictEqual(r.examinados, 7);
  assert.strictEqual(r.validos, 3);
  assert.deepStrictEqual(r.motivos, { duplicado: 1, sin_dato: 1, error: 1, cero_o_invalido: 1, excedente: 0 });
  assert.strictEqual(r.comprobaciones.suma_observada_igual_a_validos, true);
  assert.strictEqual(r.comprobaciones.suma_teorica_ok, true);
});

test("analizar: usa como máximo la meta y marca la muestra completa", () => {
  const filas = Array.from({ length: 12 }, (_, i) => fila(`u${i}`, 100 + i));
  const r = B.analizar(filas, 10);
  assert.strictEqual(r.validos, 10);
  assert.strictEqual(r.completa, true);
  assert.strictEqual(r.motivos.excedente, 2);
});

test("analizar: una muestra incompleta o vacía no falla", () => {
  const poca = B.analizar([fila("a", 10), fila("b", 20)], 250);
  assert.strictEqual(poca.completa, false);
  assert.strictEqual(poca.validos, 2);
  const vacia = B.analizar([], 250);
  assert.strictEqual(vacia.validos, 0);
  assert.strictEqual(vacia.chi, null);
  assert.strictEqual(vacia.mad, null);
});

test("estadística: una muestra con proporciones de Benford casi no se desvía", () => {
  const filas = [];
  B.DIGITOS.forEach((d) => {
    const n = Math.round(B.probabilidadBenford(d) * 1000);
    for (let i = 0; i < n; i++) filas.push(fila(`u${d}_${i}`, d * 10 + (i % 10)));
  });
  const r = B.analizar(filas, 5000);
  assert.ok(r.chi.estadistico < 1);
  assert.strictEqual(r.chi.supera_5, false);
  assert.strictEqual(r.mad.categoria, "conformidad cercana");
});

test("estadística: una muestra donde todo empieza por 9 se desvía mucho", () => {
  const r = B.analizar(Array.from({ length: 250 }, (_, i) => fila(`u${i}`, 900 + i % 90)), 250);
  assert.strictEqual(r.chi.supera_1, true);
  assert.strictEqual(r.mad.categoria, "no conformidad");
});

test("graficoHTML: contiene las dos series, 9 barras, leyenda y ejes", () => {
  const r = B.analizar(Array.from({ length: 30 }, (_, i) => fila(`u${i}`, 1 + i * 37)), 250);
  const html = B.graficoHTML(r, { titulo: "Prueba <x>", notas: ["nota"] });
  assert.strictEqual((html.match(/class="barra"/g) || []).length, 9);
  assert.ok(html.includes('class="teorica"'));
  assert.ok(html.includes("Observada (n = 30)"));
  assert.ok(html.includes("Teórica (Ley de Benford)"));
  assert.ok(html.includes("Primer dígito significativo") && html.includes("Frecuencia (%)"));
  assert.ok(html.includes("Prueba &lt;x&gt;"));
});

test("leerNumero: formatos de la tarjeta flotante (sin title, con espacio no separable)", () => {
  assert.deepStrictEqual(B.leerNumero("", "0"), { valor: 0, tipo: "exacto" });
  assert.deepStrictEqual(B.leerNumero("", "434"), { valor: 434, tipo: "exacto" });
  assert.deepStrictEqual(B.leerNumero("", "6 M"), { valor: 6000000, tipo: "aproximado" });
  assert.deepStrictEqual(B.leerNumero("", "1,7 M"), { valor: 1700000, tipo: "aproximado" });
  assert.deepStrictEqual(B.leerNumero("", "15,5 mil"), { valor: 15500, tipo: "aproximado" });
  // lo que importa para Benford: el primer dígito
  assert.strictEqual(B.primerDigito(B.leerNumero("", "6 M").valor), 6);
  assert.strictEqual(B.primerDigito(B.leerNumero("", "1,7 M").valor), 1);
});

test("analizar: una cuenta con 0 seguidores (estado cero) se descarta y se cuenta", () => {
  const filas = [fila("a", 434), fila("b", 0, { estado: "cero" }), fila("c", 152)];
  const r = B.analizar(filas, 250);
  assert.strictEqual(r.validos, 2);
  assert.strictEqual(r.motivos.cero_o_invalido, 1);
});