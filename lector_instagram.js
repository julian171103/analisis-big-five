// lector_instagram.js
// Todo lo que "toca" Instagram está aquí: el código que se ejecuta dentro de la página
// y las dos formas de leer el contador de seguidores de una cuenta:
//   1) leerPorTarjeta: pasar el cursor sobre el usuario en la lista y leer la tarjeta flotante.
//   2) leerPorPerfil:  abrir el perfil completo (más lento; sirve de respaldo).
// Si Instagram cambia su diseño, los selectores que se ajustan están en este archivo.

// ---- Código que se ejecuta DENTRO de la página ----

// Busca la zona con scroll de la ventana y devuelve los usuarios visibles.
const MEDIR = () => {
  const d = document.querySelector('div[role="dialog"]');
  if (!d) return null;
  const z = [...d.querySelectorAll("*")].find(
    (e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 5
  );
  if (!z) return null;
  const usuarios = [
    ...new Set(
      [...d.querySelectorAll("a[href]")]
        .map((a) => a.getAttribute("href"))
        .filter((h) => /^\/[A-Za-z0-9._]+\/$/.test(h))
        .map((h) => h.replaceAll("/", ""))
    ),
  ];
  return { scrollTop: Math.round(z.scrollTop), scrollHeight: z.scrollHeight, clientHeight: z.clientHeight, usuarios };
};

// ¿Hay alguna tarjeta flotante abierta? (cuenta las etiquetas "seguidores" sueltas)
const HAY_TARJETA = (metrica) =>
  [...document.querySelectorAll("span,div")].some((e) => e.children.length === 0 && e.innerText.trim() === metrica);

// Lee la tarjeta flotante. Estructura observada en DevTools:
//   <div> <div><span><span>434</span></span></div>  <div><span>seguidores</span></div> </div>
// Para no leer por error la tarjeta de la cuenta anterior, solo se acepta si el nombre del
// usuario pedido está dentro de la tarjeta (sin salir de ella hacia la lista o la página).
const LEER_TARJETA = ({ usuario, metrica }) => {
  const etiquetas = [...document.querySelectorAll("span,div")].filter(
    (e) => e.children.length === 0 && e.innerText.trim() === metrica
  );
  for (const etiqueta of etiquetas) {
    const numero = etiqueta.parentElement?.previousElementSibling;
    if (!numero) continue;
    let tarjeta = etiqueta;
    for (let i = 0; i < 10 && tarjeta.parentElement; i++) {
      tarjeta = tarjeta.parentElement;
      if (tarjeta.querySelector('[role="dialog"]')) break; // ya incluye la ventana de la lista: no es la tarjeta
      const texto = (tarjeta.innerText || "").toLowerCase();
      if (texto.length > 400) break; // zona demasiado grande
      if (texto.includes(usuario)) return { texto: numero.innerText.replace(/\s+/g, " ").trim() };
    }
  }
  return null;
};

// Lee el contador en la página de un perfil: texto visible y atributo title (número exacto).
const LEER_CONTADOR = (metrica) => {
  const patron = new RegExp(`^[\\d.,]+\\s*(?:mil|mill\\.?|millones|k|m)?\\s*${metrica}$`, "i");
  const span = [...document.querySelectorAll("header span")].find((e) =>
    patron.test(e.innerText.replace(/\s+/g, " ").trim())
  );
  if (!span) return null;
  return {
    texto: span.innerText.replace(/\s+/g, " ").trim(),
    titulo: span.querySelector("[title]")?.title ?? span.title ?? "",
  };
};

// ---- Funciones de Playwright ----

// Lleva el cursor al título de la ventana para que la tarjeta se cierre.
async function apartarCursor(pagina) {
  const caja = await pagina.locator('div[role="dialog"]').first().boundingBox();
  if (caja) await pagina.mouse.move(caja.x + caja.width / 2, caja.y + 20);
}

// Espera a que se cierre la tarjeta anterior (así la que aparezca después es la nueva).
async function esperarSinTarjeta(pagina, C, maxMs = 3000) {
  const limite = Date.now() + maxMs;
  while (Date.now() < limite) {
    if (!(await pagina.evaluate(HAY_TARJETA, C.METRICA))) return true;
    await pagina.waitForTimeout(150);
  }
  return false; // sigue abierta: la comprobación del nombre en LEER_TARJETA protege igualmente
}

// Pasa el cursor sobre el usuario en la lista abierta y lee la tarjeta.
// Devuelve { texto } o null si la tarjeta no apareció a tiempo.
async function leerPorTarjeta(pagina, usuario, C) {
  const enlace = pagina
    .locator('div[role="dialog"]')
    .locator(`a[href="/${usuario}/"]`)
    .filter({ hasText: usuario })
    .first();
  if ((await enlace.count()) === 0) return null;
  await apartarCursor(pagina);
  await esperarSinTarjeta(pagina, C);
  await enlace.hover({ timeout: 5000 });
  const limite = Date.now() + C.ESPERA_TARJETA_MS;
  let lectura = null;
  while (Date.now() < limite) {
    lectura = await pagina.evaluate(LEER_TARJETA, { usuario: usuario.toLowerCase(), metrica: C.METRICA });
    if (lectura) break;
    await pagina.waitForTimeout(250);
  }
  await apartarCursor(pagina);
  return lectura;
}

// Abre el perfil completo en otra pestaña. Devuelve { lectura } o { bloqueo: true }.
async function leerPorPerfil(pagina, usuario, C) {
  await pagina.goto(`https://www.instagram.com/${usuario}/`, { waitUntil: "domcontentloaded" });
  await pagina.waitForTimeout(C.PAUSA_PERFIL_MS);
  const url = pagina.url();
  if (url.includes("/accounts/login") || url.includes("/challenge") ||
      (await pagina.locator('input[name="username"]').count()) > 0) {
    return { bloqueo: true };
  }
  return { lectura: await pagina.evaluate(LEER_CONTADOR, C.METRICA) };
}

module.exports = { MEDIR, HAY_TARJETA, LEER_TARJETA, LEER_CONTADOR, apartarCursor, esperarSinTarjeta, leerPorTarjeta, leerPorPerfil };
