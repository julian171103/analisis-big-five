const { chromium } = require("playwright");
const fs = require("fs");

const USUARIO = "sausage_player";
const URL = `https://www.instagram.com/${USUARIO}/`;
const META = 50;
const MAX_SCROLLS = 15;
const MIN = 30;

(async () => {
  fs.mkdirSync("datos", { recursive: true });
  const contexto = await chromium.launchPersistentContext("sesion", { headless: false });
  const pagina = await contexto.newPage();
  await pagina.goto(URL, { waitUntil: "domcontentloaded" });
  await pagina.waitForTimeout(6000);

  const pideLogin =
    pagina.url().includes("/accounts/login") ||
    (await pagina.locator('input[name="username"]').count()) > 0;
  console.log(pideLogin ? "RESULTADO: NO hay sesión activa." : "RESULTADO: parece haber sesión activa.");
  if (pideLogin) { await contexto.close(); return; }

  // Fase 1: reunir enlaces con scroll suave
  const enlaces = [];
  let sinCambios = 0;
  for (let i = 0; i < MAX_SCROLLS; i++) {
    const antes = enlaces.length;
    const actuales = await pagina.evaluate(() => [
      ...new Set([...document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')].map((a) => a.href)),
    ]);
    for (const e of actuales) if (!enlaces.includes(e)) enlaces.push(e);
    console.log(`Scroll ${i}: ${enlaces.length} enlaces`);
    if (enlaces.length >= META) break;
    sinCambios = enlaces.length === antes ? sinCambios + 1 : 0;
    if (sinCambios >= 3) { console.log("No aparecen más enlaces."); break; }
    await pagina.mouse.wheel(0, 1500);
    await pagina.waitForTimeout(3000);
  }
  const lista = enlaces.slice(0, META);

  // Fase 2: leer fecha y texto de cada publicación
  const filas = [];
  for (let n = 0; n < lista.length; n++) {
    const enlace = lista[n];
    const fila = {
      n: n + 1,
      enlace,
      tipo: enlace.includes("/reel/") ? "reel" : "publicacion",
      cuenta_en_enlace: enlace.split("instagram.com/")[1].split("/")[0],
      fecha_hora: null,
      og_description: null,
      texto: null,
      error: null,
    };
    try {
      await pagina.goto(enlace, { waitUntil: "domcontentloaded" });
      await pagina.waitForTimeout(4000);
      Object.assign(fila, await pagina.evaluate(() => ({
        fecha_hora: document.querySelector("time")?.getAttribute("datetime") ?? null,
        og_description: document.querySelector('meta[property="og:description"]')?.content ?? null,
      })));
      fila.texto = fila.og_description?.match(/:\s*"([\s\S]*)"\.?\s*$/)?.[1]?.trim() ?? null;
    } catch (e) {
      fila.error = String(e.message).slice(0, 200);
    }
    filas.push(fila);
    console.log(`${n + 1}/${lista.length}`, fila.error ? "ERROR" : "ok");
  }
  await contexto.close();

  fs.writeFileSync("datos/publicaciones_50.json", JSON.stringify(filas, null, 2), "utf-8");

  const fechas = filas.map((f) => f.fecha_hora).filter(Boolean).sort();
  const utiles = filas.filter((f) => f.texto && f.texto.length >= MIN);
  console.log("Filas guardadas:", filas.length);
  console.log("Únicas:", new Set(filas.map((f) => f.enlace)).size);
  console.log("Con error:", filas.filter((f) => f.error).length);
  console.log("Con fecha:", filas.filter((f) => f.fecha_hora).length);
  console.log(`Con texto de al menos ${MIN} caracteres:`, utiles.length);
  console.log("Caracteres utilizables en total:", utiles.reduce((a, f) => a + f.texto.length, 0));
  console.log("Reels:", filas.filter((f) => f.tipo === "reel").length,
              "| Publicaciones:", filas.filter((f) => f.tipo === "publicacion").length);
  console.log("De otras cuentas:", filas.filter((f) => f.cuenta_en_enlace !== USUARIO).length);
  console.log("Rango:", fechas[0], "->", fechas[fechas.length - 1]);
  const porAnio = {};
  filas.forEach((f) => { const a = f.fecha_hora?.slice(0, 4); porAnio[a] = (porAnio[a] ?? 0) + 1; });
  console.log("Publicaciones por año:", porAnio);
})();