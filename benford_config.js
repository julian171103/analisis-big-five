// benford_config.js
// Todo lo que puede cambiar entre pruebas está aquí. Si el profesor pide cambiar
// de "Seguidores" a "Seguidos", se cambia LISTA y nada más.

const LISTA = "seguidores"; // "seguidores" o "seguidos": qué lista se abre en el perfil

module.exports = {
  USUARIO: "sausage_player", // cuenta cuya lista se analiza (igual que en paso4 y paso9)
  LISTA,
  METRICA: "seguidores", // qué contador se lee en cada cuenta (texto en español, en minúsculas)

  META_CUENTAS: 250, // registros válidos que se buscan
  MAX_VUELTAS: 80, // tope de scrolls en la ventana de la lista
  FALLOS_SEGUIDOS_MAX: 5, // se detiene si fallan tantas cuentas seguidas (posible bloqueo)

  // Cómo se lee el contador de cada cuenta
  USAR_TARJETA: true, // true: pasar el cursor sobre el usuario y leer la tarjeta flotante
  USAR_PERFIL_SI_FALLA: true, // si la tarjeta no aparece, abrir el perfil en otra pestaña
  ESPERA_TARJETA_MS: 6000, // máximo que se espera a que aparezca la tarjeta

  PAUSA_CARGA_MS: 6000, // espera al abrir el perfil analizado
  PAUSA_LISTA_MS: 3000, // espera entre scrolls de la lista
  PAUSA_ENTRE_CUENTAS_MS: 1000, // espera entre una cuenta y la siguiente
  PAUSA_PERFIL_MS: 4000, // espera al abrir un perfil completo (solo en el respaldo)

  // Archivos (el nombre incluye la lista para no pisar los de "seguidos")
  ARCHIVO_CUENTAS: `datos/cuentas_${LISTA}.json`,
  CSV_CUENTAS: `datos/cuentas_${LISTA}.csv`,
  ARCHIVO_TABLA: `datos/benford_${LISTA}_tabla.csv`,
  ARCHIVO_RESUMEN: `datos/benford_${LISTA}_resumen.json`,
  ARCHIVO_GRAFICO: `datos/benford_${LISTA}_grafico.html`,
};