// paso11_recolectar_seguidores.js
// Abre la lista (seguidores o seguidos, según benford_config.js) de la cuenta analizada y
// lee el número de seguidores de cada cuenta de esa lista, de dos formas:
//   - pasando el cursor sobre el usuario (tarjeta flotante), sin salir de la lista;
//   - si la tarjeta no aparece, abriendo su perfil en otra pestaña (respaldo).
// Guarda el avance tras cada cuenta.
//
//   node paso11_recolectar_seguidores.js --autorizado
//   node paso11_recolectar_seguidores.js --autorizado --reanudar   (continúa un intento cortado)

const { chromium } = require("playwright");
const fs = require("fs");
const C = require("./benford_config");
const { leerNumero, primerDigito } = require("./benford");
const L = require("./lector_instagram");

const URL_PERFIL = `https://www.instagram.com/${C.USUARIO}/`;

// Este script recopila datos de terceros: exige confirmar la autorización de la titular.
if (!process.argv.includes("--autorizado")) {
  console.log("Este script recopila nombres de usuario y contadores de otras personas.");
  console.log("Ejecútalo solo si la titular de la cuenta lo autorizó. Para continuar:");
  console.log("  node paso11_recolectar_seguidores.js --autorizado");
  process.exit(0);
}

// ---- Guardado ----
function guardar(estado) {
  estado.actualizado = new Date().toISOString();
  fs.writeFileSync(C.ARCHIVO_CUENTAS, JSON.stringify(estado, null, 2), "utf-8");
  const cols = ["n", "usuario", "seguidores", "primer_digito", "tipo", "estado", "fuente"];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(",")]
    .concat(estado.filas.map((f) => [f.n, f.usuario, f.valor, f.primer_digito, f.tipo, f.estado, f.fuente].map(esc).join(",")))
    .join("\n");
  fs.writeFileSync(C.CSV_CUENTAS, "﻿" + csv, "utf-8");
}

const hayLogin = async (pagina) =>
  pagina.url().includes("/accounts/login") || pagina.url().includes("/challenge") ||
  (await pagina.locator('input[name="username"]').count()) > 0;

// Abre la ventana de la lista y deja el cursor sobre ella (para poder hacer scroll).
async function abrirLista(pagina) {
  const enlace = pagina.locator("header a").filter({ hasText: C.LISTA });
  if ((await enlace.count()) === 0) {
    console.log(`No encuentro el enlace de "${C.LISTA}" en el perfil.`);
    return false;
  }
  await enlace.first().click();
  await pagina.waitForTimeout(5000);
  const caja = await pagina.locator('div[role="dialog"]').first().boundingBox();
  if (!caja) { console.log("No se abrió la ventana de la lista."); return false; }
  await pagina.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  return true;
}

// Lee el contador de una cuenta: primero la tarjeta, y si falla, el perfil.
// Devuelve { lectura, fuente } o { bloqueo: true }.
async function leerCuenta(paginaLista, paginaPerfil, usuario) {
  if (C.USAR_TARJETA) {
    try {
      const t = await L.leerPorTarjeta(paginaLista, usuario, C);
      if (t) return { lectura: { titulo: "", texto: t.texto }, fuente: "tarjeta" };
    } catch (e) { /* si la tarjeta falla se prueba el respaldo */ }
  }
  if (C.USAR_PERFIL_SI_FALLA) {
    const p = await L.leerPorPerfil(paginaPerfil, usuario, C);
    if (p.bloqueo) return { bloqueo: true };
    if (p.lectura) return { lectura: p.lectura, fuente: "perfil" };
  }
  return { lectura: null, fuente: null };
}

(async () => {
  fs.mkdirSync("datos", { recursive: true });

  let estado = { cuenta: C.USUARIO, lista: C.LISTA, metrica: C.METRICA, filas: [] };
  if (process.argv.includes("--reanudar") && fs.existsSync(C.ARCHIVO_CUENTAS)) {
    estado = JSON.parse(fs.readFileSync(C.ARCHIVO_CUENTAS, "utf-8"));
    if (estado.cuenta !== C.USUARIO || estado.lista !== C.LISTA) {
      console.log("El archivo guardado es de otra cuenta o lista. No se reanuda.");
      return;
    }
    console.log(`Reanudando: ${estado.filas.length} cuentas ya procesadas.`);
  }

  const hechos = new Set(estado.filas.map((f) => f.usuario));
  const validos = () => estado.filas.filter((f) => primerDigito(f.valor) !== null).length;
  let fallosSeguidos = 0;
  let detenido = false;

  const contexto = await chromium.launchPersistentContext("sesion", { headless: false });
  try {
    const pagina = await contexto.newPage(); // aquí queda abierta la lista
    const paginaPerfil = C.USAR_PERFIL_SI_FALLA ? await contexto.newPage() : null; // solo para el respaldo
    await pagina.bringToFront();

    await pagina.goto(URL_PERFIL, { waitUntil: "domcontentloaded" });
    await pagina.waitForTimeout(C.PAUSA_CARGA_MS);
    if (await hayLogin(pagina)) { console.log("RESULTADO: NO hay sesión activa. Ejecuta paso3_sesion.js."); return; }
    if (!(await abrirLista(pagina))) return;

    const conocidos = new Set();
    let ultimoTotal = 0;
    let sinCambios = 0;

    for (let vuelta = 0; vuelta < C.MAX_VUELTAS && !detenido && validos() < C.META_CUENTAS; vuelta++) {
      const m = await pagina.evaluate(L.MEDIR);
      if (!m) {
        console.log(await hayLogin(pagina) ? "Instagram pidió iniciar sesión o verificar. Se detiene." : "No encuentro la zona desplazable.");
        break;
      }
      m.usuarios.forEach((u) => conocidos.add(u));
      const pendientes = m.usuarios.filter((u) => u !== C.USUARIO && !hechos.has(u));
      console.log(`Vuelta ${vuelta}: ${conocidos.size} usuarios cargados, ${pendientes.length} por leer`);

      for (const usuario of pendientes) {
        if (validos() >= C.META_CUENTAS) break;
        const fila = { n: estado.filas.length + 1, usuario, valor: null, tipo: null, primer_digito: null, estado: "error", fuente: null, error: null };
        try {
          const r = await leerCuenta(pagina, paginaPerfil, usuario);
          if (r.bloqueo) {
            console.log("Instagram pidió iniciar sesión o verificar. Se detiene para no insistir.");
            guardar(estado);
            detenido = true;
            break;
          }
          const numero = r.lectura ? leerNumero(r.lectura.titulo, r.lectura.texto) : null;
          if (numero) {
            Object.assign(fila, {
              valor: numero.valor, tipo: numero.tipo, primer_digito: primerDigito(numero.valor),
              fuente: r.fuente, estado: numero.valor === 0 ? "cero" : "ok",
            });
          } else {
            fila.estado = "sin_dato";
          }
        } catch (e) {
          fila.error = String(e.message).slice(0, 200);
        }
        hechos.add(usuario);
        estado.filas.push(fila);
        guardar(estado);
        console.log(`${fila.n} | válidos ${validos()}/${C.META_CUENTAS} | ${fila.estado}${fila.fuente ? " (" + fila.fuente + ")" : ""}`);

        fallosSeguidos = fila.estado === "ok" || fila.estado === "cero" ? 0 : fallosSeguidos + 1;
        if (fallosSeguidos >= C.FALLOS_SEGUIDOS_MAX) {
          console.log(`${fallosSeguidos} cuentas seguidas sin dato: posible bloqueo. Se detiene; usa --reanudar más tarde.`);
          detenido = true;
          break;
        }
        await pagina.waitForTimeout(C.PAUSA_ENTRE_CUENTAS_MS);
      }
      if (detenido || validos() >= C.META_CUENTAS) break;

      // ¿la lista sigue creciendo?
      sinCambios = conocidos.size === ultimoTotal ? sinCambios + 1 : 0;
      if (sinCambios >= 3) { console.log("No aparecen más usuarios."); break; }
      ultimoTotal = conocidos.size;

      // bajar hasta el final de lo cargado para que Instagram cargue más
      const m2 = (await pagina.evaluate(L.MEDIR)) || m;
      const caja = await pagina.locator('div[role="dialog"]').first().boundingBox();
      if (caja) await pagina.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
      await pagina.mouse.wheel(0, Math.max(m2.scrollHeight - m2.clientHeight - m2.scrollTop, 100));
      await pagina.waitForTimeout(C.PAUSA_LISTA_MS);
    }

    // Resumen honesto
    const cuenta = (e) => estado.filas.filter((f) => f.estado === e).length;
    console.log("Cuentas procesadas:", estado.filas.length);
    console.log("Con número (>0):", cuenta("ok"), "| Con 0 seguidores:", cuenta("cero"),
                "| Sin dato:", cuenta("sin_dato"), "| Con error:", cuenta("error"));
    console.log("Leídas por tarjeta:", estado.filas.filter((f) => f.fuente === "tarjeta").length,
                "| por perfil (respaldo):", estado.filas.filter((f) => f.fuente === "perfil").length);
    console.log("Válidos para Benford:", validos(), validos() >= C.META_CUENTAS ? "(meta alcanzada)" : `(MUESTRA INCOMPLETA: meta ${C.META_CUENTAS})`);
  } finally {
    await contexto.close();
  }
})();