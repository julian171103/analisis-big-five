// benford_config.js

const LISTA = "seguidores"; 

module.exports = {
  USUARIO: "sausage_player", 
  LISTA,
  METRICA: "seguidores", 

  META_CUENTAS: 250, 
  MAX_VUELTAS: 80, 
  FALLOS_SEGUIDOS_MAX: 5, 

  // Cómo se lee el contador de cada cuenta
  USAR_TARJETA: true, 
  USAR_PERFIL_SI_FALLA: true, 
  ESPERA_TARJETA_MS: 6000, 

  PAUSA_CARGA_MS: 6000, 
  PAUSA_LISTA_MS: 3000, 
  PAUSA_ENTRE_CUENTAS_MS: 1000, 
  PAUSA_PERFIL_MS: 4000, 

  // Archivos (el nombre incluye la lista para no pisar los de "seguidos")
  ARCHIVO_CUENTAS: `datos/cuentas_${LISTA}.json`,
  CSV_CUENTAS: `datos/cuentas_${LISTA}.csv`,
  ARCHIVO_TABLA: `datos/benford_${LISTA}_tabla.csv`,
  ARCHIVO_RESUMEN: `datos/benford_${LISTA}_resumen.json`,
  ARCHIVO_GRAFICO: `datos/benford_${LISTA}_grafico.html`,
};
