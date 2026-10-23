const fs = require("fs");

const MIN = 30; // caracteres mínimos para considerar un texto útil
const filas = JSON.parse(fs.readFileSync("datos/publicaciones.json", "utf-8"));

console.log("n | año | largo | utilizable");
filas.forEach((f) => {
  const largo = f.texto ? f.texto.length : 0;
  console.log(`${f.n} | ${f.fecha_hora?.slice(0, 4)} | ${largo} | ${largo >= MIN ? "sí" : "no"}`);
});

const ok = filas.filter((f) => f.texto && f.texto.length >= MIN);
console.log("Utilizables:", ok.length, "de", filas.length);
console.log("Caracteres utilizables en total:", ok.reduce((a, f) => a + f.texto.length, 0));
console.log("Años:", [...new Set(filas.map((f) => f.fecha_hora?.slice(0, 4)))].sort().join(", "));