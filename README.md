# Estimación exploratoria Big Five a partir de publicaciones de Instagram

**Autor:** JULIAN GUEVARA
**Materia:** ARQUITECTURA DE SOFTWARE SI7-001
**Fecha:** 27-10-2026

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
| `benford_config.js` | Constantes del módulo Benford (cuenta, lista, meta de 250 cuentas, método de lectura, pausas) |
| `benford.js` | Funciones de la Ley de Benford, pruebas estadísticas y gráfico |
| `lector_instagram.js` | Lectura de la lista y de la tarjeta flotante de cada cuenta (lo único que depende del diseño de Instagram) |
| `paso11_recolectar_seguidores.js` | Lista de seguidores y número de seguidores de cada cuenta |
| `paso12_benford.js` | Tabla, resumen y gráfico de la Ley de Benford |

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

## 9. Ley de Benford sobre el número de seguidores

**Objetivo.** Comparar la distribución del primer dígito del número de seguidores de una muestra de hasta 250 cuentas de la lista de seguidores con la distribución teórica de la Ley de Benford, P(d) = log10(1 + 1/d). Es un análisis exploratorio: **no determina si una cuenta es un bot**.

**Consentimiento y privacidad.** La titular de la cuenta autorizó que se recopile su lista de seguidores. Los nombres de usuario y los números quedan solo en `datos/` (excluida de Git); en este repositorio solo se publican conteos por dígito.

**Cómo ejecutarlo** (PowerShell, desde la carpeta del proyecto, con la sesión ya iniciada con `paso3_sesion.js`):

```powershell
npm test
node paso11_recolectar_seguidores.js --autorizado
node paso12_benford.js
```

El paso 11 guarda el avance tras cada cuenta; si se corta, se continúa con `--reanudar`. El paso 12 crea en `datos/` la tabla, el resumen y un gráfico HTML (`benford_seguidores_grafico.html`) que se abre con doble clic.

**Qué se cambia y dónde.** Todo está en `benford_config.js`: `USUARIO` (cuenta), `LISTA` (`"seguidores"` o `"seguidos"`), `META_CUENTAS` (250), `USAR_TARJETA`, `USAR_PERFIL_SI_FALLA` y las pausas.

**Lectura de los números.** Para cada cuenta de la lista se pasa el cursor sobre su nombre y se lee la tarjeta flotante que muestra Instagram, sin abrir su perfil. La tarjeta solo trae el texto visible: números pequeños exactos (`434`) y abreviados desde las decenas de miles o los millones (`15,5 mil`, `1,7 M`); en ese caso el registro se marca como aproximado. Como para Benford solo importa el **primer dígito**, el valor aproximado sirve: `1,7 M` empieza por 1. El único riesgo es el redondeo en el borde (un valor de 9.960 podría mostrarse como `10 mil`), que afecta como máximo a unas pocas cuentas grandes. Si la tarjeta no aparece, se abre el perfil en otra pestaña, donde sí hay un atributo `title` con el número exacto (ver `USAR_PERFIL_SI_FALLA`). Para no leer la tarjeta de la cuenta anterior, se espera a que se cierre y se exige que el nombre del usuario aparezca dentro de la tarjeta. Cada fila guarda su fuente (`tarjeta` o `perfil`). Se descartan, y se cuentan por motivo, los duplicados, los registros sin dato, con error o con valor cero.

**Pruebas estadísticas.** Chi-cuadrado (8 grados de libertad) y MAD con los umbrales de Nigrini para el primer dígito. Con unos 250 registros tienen poca potencia, así que no son concluyentes.

**Pruebas del código.** `npm test` verifica con datos sintéticos el cálculo de dígitos, la fórmula, los descartes, las sumas y el gráfico. El scraping real no se puede probar de forma automática; se comprobó a mano con una prueba corta de 10 cuentas antes de la corrida completa de 250.


## 10. Fuentes y uso de IA

- Datos: páginas públicas de Instagram, extraídas con Playwright y verificadas con DevTools.
- **Claude (Anthropic)** guió el proyecto paso a paso, redactó los scripts. 
- **Gemini (Google)** realizó la estimación Big Five. Su salida se guardó junto con el prompt y la versión del modelo.
- El autor inició sesión, ejecutó los scripts, revisó las salidas y decidió qué incluir.
- Los números provienen de las salidas de los scripts.
