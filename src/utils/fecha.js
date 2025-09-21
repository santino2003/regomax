// utils/fecha.js
// ------------------------------------------------------------
// Helpers para manejar fechas en horario de Buenos Aires
// y formatearlas para MySQL SIN usar toISOString().

function pad(n){ return String(n).padStart(2, '0'); }

// Obtiene componentes de fecha en zona horaria Buenos Aires
function getPartsBA(fecha) {
  const f = new Date(fecha);
  const fmt = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  const parts = {};
  for (const {type, value} of fmt.formatToParts(f)) {
    if (type !== 'literal') parts[type] = value;
  }
  return {
    year: parseInt(parts.year),
    month: parseInt(parts.month),
    day: parseInt(parts.day),
    hour: parseInt(parts.hour),
    minute: parseInt(parts.minute),
    second: parseInt(parts.second)
  };
}

// Devuelve string "YYYY-MM-DD hh:mm:ss" en hora de BA
function formatMySQLLocal(dt){
  if (!dt) return null; // Retornar null para valores nulos
  
  try {
    const p = getPartsBA(dt);
    return `${p.year}-${pad(p.month)}-${pad(p.day)} ` +
           `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
  } catch (error) {
    console.error('Error al formatear fecha para MySQL:', dt, error);
    return null; // Retornar null en caso de error
  }
}

// 'YYYY-MM-DD' -> Date en horario Buenos Aires 00:00:00
function parseLocalDate(ymd){
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m-1, d, 3, 0, 0)); 
  // UTC+3 aproximado para BA (el objeto queda en UTC, pero se interpreta luego como BA)
}

// Turno diario [06:00, siguiente día 05:59:59.999] en BA
function ventanaTurnoDiario(ymd){
  const base = parseLocalDate(ymd);
  const inicio = new Date(base); inicio.setUTCHours(9,0,0,0);   // 06 BA = 09 UTC
  const fin = new Date(base); fin.setUTCDate(fin.getUTCDate()+1);
  fin.setUTCHours(8,59,59,999); // 05:59 BA = 08:59 UTC
  return { inicio, fin };
}

// Mes operativo [1° 06:00 BA, 1° sig. mes 05:59:59.999 BA]
function ventanaMesOperativo(ymd){
  const f = parseLocalDate(ymd);
  const anio = f.getUTCFullYear();
  const mes = f.getUTCMonth();

  // Inicio: primer día del mes a las 06:00 (hora BA = 09:00 UTC)
  const inicio = new Date(Date.UTC(anio, mes, 1, 9, 0, 0, 0));

  // Fin: primer día del mes siguiente a las 05:59:59.999 (hora BA = 08:59 UTC)
  const fin = new Date(Date.UTC(anio, mes + 1, 1, 8, 59, 59, 999));

  return { inicio, fin };
}

// Fecha y hora actual en Buenos Aires
function fechaActual() {
  // Crear una fecha en hora local del servidor
  const now = new Date();
  
  // Obtener la representación de fecha/hora en zona horaria Buenos Aires
  const parts = getPartsBA(now);
  
  // Crear una nueva fecha con esos componentes
  return new Date(parts.year, parts.month-1, parts.day, parts.hour, parts.minute, parts.second);
}

// Formatea solo fecha dd/mm/yyyy
function formatearFechaLocal(fecha) {
  if (!fecha) return ''; // Retornar string vacío para valores nulos
  
  try {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      timeZone: 'America/Argentina/Buenos_Aires'
    }).format(new Date(fecha));
  } catch (error) {
    console.error('Error al formatear fecha local:', fecha, error);
    return ''; // Retornar string vacío en caso de error
  }
}

// Formatea fecha y hora dd/mm/yyyy hh:mm:ss
function formatearFechaHoraLocal(fecha) {
  if (!fecha) return ''; // Retornar string vacío para valores nulos
  
  try {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires',
      hour12: false
    }).format(new Date(fecha));
  } catch (error) {
    console.error('Error al formatear fecha:', fecha, error);
    return ''; // Retornar string vacío en caso de error
  }
}

module.exports = { 
  pad, 
  formatMySQLLocal, 
  parseLocalDate, 
  ventanaTurnoDiario, 
  ventanaMesOperativo,
  fechaActual,
  formatearFechaLocal,
  formatearFechaHoraLocal
};
