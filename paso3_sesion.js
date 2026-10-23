const { chromium } = require("playwright");

(async () => {
  const contexto = await chromium.launchPersistentContext("sesion", {
    headless: false,
  });
  const pagina = await contexto.newPage();
  await pagina.goto("https://www.instagram.com/accounts/login/");

  console.log("Inicia sesión manualmente en la ventana de Chromium.");
  console.log("Cuando veas tu feed, cierra la ventana del navegador.");

  await new Promise((resolver) => contexto.on("close", resolver));
})();