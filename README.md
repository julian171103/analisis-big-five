# Estimación exploratoria Big Five a partir de publicaciones de Instagram

**Autor:** JULIAN GUEVARA
**Materia:** ARQUITECTURA DE SOFTWARE SI7-001
**Fecha:** 23-10-2026

## 1. Objetivo

Extraer publicaciones de una cuenta pública de Instagram (@sausage_player) con DevTools, JavaScript y Playwright, y estimar rasgos del modelo Big Five con la API de Gemini. Es un ejercicio académico exploratorio, **no un diagnóstico psicológico**.

## 2. Ética y consentimiento

- La cuenta pertenece a una compañera de clase que aceptó participar. 
- Antes de enviar texto a Gemini se reemplazaron las menciones (@usuario) y los enlaces. Aun así, el contenido de las publicaciones sale hacia un servicio externo (Google).
- El repositorio es publico y no incluye textos de publicaciones, resultados completos, la cookie ni la API key.

## 3. Requisitos e instalación

Windows 11, Node.js v24.21.0, Playwright, Visual Studio Code y una API key de Google AI Studio.

```powershell
npm install
npx playwright install chromium
Copy-Item .env.example .env
```

Después se pega la clave propia en `.env` (variable `GEMINI_API_KEY`). El archivo `.env` está en `.gitignore`.

## 4. Uso de la cookie de sesión

1. `paso3_sesion.js` abre Chromium con un perfil persistente en `sesion/`.
2. El autor inicia sesión **manualmente** con su cuenta personal. Se completaron las verificaciones que Instagram pidió.
3. Los demás scripts reutilizan esa carpeta con `launchPersistentContext("sesion")`.

La cookie no se copió a mano, no está en el código ni en el chat, y `sesion/` está en `.gitignore`. No se usó la pestaña Network de DevTools.

## 5. Scripts

| Script | Función |
|---|---|
| `paso3_sesion.js` | Inicio de sesión manual |
| `paso4_extraer.js` | Perfil y 10 publicaciones |
| `paso5_probar_gemini.js` | Prueba de la API key y lista de modelos |
| `paso6_revisar_textos.js` | Revisión de la longitud de los textos |
| `paso7_big_five.js` | Análisis Big Five con 10 publicaciones |
| `paso8_resumen_legible.js` | Texto legible del resultado |
| `paso9_extraer_50.js` | Extracción de 50 publicaciones |
| `paso10_big_five_50.js` | Análisis Big Five con 50 publicaciones y comparación |

## 6. Resultados de la extracción

| Medida | 10 publicaciones | 50 publicaciones |
|---|---|---|
| Filas guardadas / con error | 10 / 0 | 50 / 0 |
| Con fecha | 10 | 50 |
| Texto de al menos 30 caracteres | 6 | 14 |
| Caracteres utilizables | 2,401 | 2,935 |
| Reels / publicaciones | 0 / 10 | 11 / 39 |
| Rango de fechas | 2017 a 2026 | 2015 a 2026 |

En las 50 publicaciones, 32 son de 2015 a 2017 y 3 son de 2026. Los textos se acotaron a los de 30 caracteres o más, un criterio del autor.

## 7. Resultados Big Five (modelo gemini-3.8-flash)

| Rasgo | 6 textos | 14 textos |
|---|---|---|
| Apertura | medio (3, confianza baja) | medio (3, baja) |
| Responsabilidad | evidencia insuficiente | medio (3, baja) |
| Extraversión | evidencia insuficiente | bajo (2, media) |
| Amabilidad | alto (5, media) | alto (4, media) |
| Neuroticismo | alto (4, media) | alto (4, media) |

Los resultados completos y el prompt usado están en `datos/` (excluida de Git). 

## 8. Interpretación y limitaciones

- El Big Five se mide con cuestionarios validados. Esta estimación **no es un test** y con pocos textos solo puede ser exploratoria. No clasifica "tipos" de persona; describe cinco dimensiones.
- Los textos son pocos, cortos y casi todos sobre el vínculo con mascotas y duelo. El neuroticismo alto puede reflejar un momento y no un rasgo estable.
- Los textos abarcan más de una década y la mayoría es antigua; no describen necesariamente a la persona hoy.
- Ambos análisis usan el mismo modelo y casi el mismo material, así que su coincidencia no los valida.
- Los resultados pueden variar entre ejecuciones y entre versiones del modelo.
- Los selectores dependen del diseño actual de Instagram.

## 10. Fuentes y uso de IA

- Datos: páginas públicas de Instagram, extraídas con Playwright y verificadas con DevTools.
- **Claude (Anthropic)** guió el proyecto paso a paso, redactó los scripts y propuso los criterios. Dos veces propuso un modelo de Gemini que no estaba disponible o estaba saturado y se corrigió con las respuestas reales de la API.
- **Gemini (Google)** realizó la estimación Big Five. Su salida se guardó junto con el prompt y la versión del modelo.
- El autor inició sesión, ejecutó los scripts, revisó las salidas y decidió qué incluir.
- Los números provienen de las salidas de los scripts.
