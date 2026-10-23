const { chromium } = require("playwright");
const fs = require("fs");

const USUARIO = "sausage_player";
const URL = `https://www.instagram.com/${USUARIO}/`;
const META = 10;

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

  const perfil = await pagina.evaluate(() => {
    const t = [...document.querySelectorAll('header span[dir="auto"]')].map((e) =>
      e.innerText.replace(/\n/g, " ").trim()
    );
    const buscar = (p) => t.find((x) => x.includes(p)) ?? null;
    const numero = (x) => (x ? x.split(" ")[0] : null);
    const i = t.findIndex((x) => x.includes("publicaciones"));
    const og = document.querySelector('meta[property="og:description"]')?.content ?? "";
    return {
      usuario: document.querySelector("header h2, header h1")?.innerText ?? null,
      nombre_visible: i > 0 ? t[i - 1] : null,
      biografia: t.filter((x) => x.length > 40 && !/(publicaciones|seguidores|seguidos)$/.test(x))[0] ?? null,
      seguidores: numero(buscar("seguidores")),
      seguidos: numero(buscar("seguidos")),
      publicaciones: numero(buscar("publicaciones")) ?? og.match(/([\d.,]+)\s+publicaciones/)?.[1] ?? null,
    };
  });
  fs.writeFileSync("datos/perfil.json", JSON.stringify(perfil, null, 2), "utf-8");
  console.log("Perfil guardado. Campos nulos:", Object.entries(perfil).filter(([, v]) => v === null).map(([k]) => k));

  const enlaces = await pagina.evaluate(() => [
    ...new Set([...document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')].map((a) => a.href)),
  ]);
  console.log("Enlaces visibles en el perfil:", enlaces.length);
  const lista = enlaces.slice(0, META);

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
      // Solo el texto de la publicación, sin el prefijo de likes y comentarios
      fila.texto = fila.og_description?.match(/:\s*"([\s\S]*)"\.?\s*$/)?.[1]?.trim() ?? null;
    } catch (e) {
      fila.error = String(e.message).slice(0, 200);
    }
    filas.push(fila);
    console.log(`${n + 1}/${lista.length}`, fila.error ? "ERROR" : "ok");
  }
  await contexto.close();

  fs.writeFileSync("datos/publicaciones.json", JSON.stringify(filas, null, 2), "utf-8");

  const fechas = filas.map((f) => f.fecha_hora).filter(Boolean).sort();
  const largos = filas.filter((f) => f.texto).map((f) => f.texto.length);
  console.log("Filas guardadas:", filas.length);
  console.log("Con error:", filas.filter((f) => f.error).length);
  console.log("Con fecha:", filas.filter((f) => f.fecha_hora).length);
  console.log("Con texto utilizable:", largos.length);
  console.log("Largo del texto (mín / máx):", largos.length ? `${Math.min(...largos)} / ${Math.max(...largos)}` : "—");
  console.log("Reels:", filas.filter((f) => f.tipo === "reel").length,
              "| Publicaciones:", filas.filter((f) => f.tipo === "publicacion").length);
  console.log("De otras cuentas:", filas.filter((f) => f.cuenta_en_enlace !== USUARIO).length);
  console.log("Rango:", fechas[0], "->", fechas[fechas.length - 1]);
})();
