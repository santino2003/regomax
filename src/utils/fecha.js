// utils/fecha.js
// ------------------------------------------------------------
// Helpers para manejar fechas en horario local (Buenos Aires)
// y formatearlas para MySQL SIN usar toISOString().

function pad(n){ return String(n).padStart(2, '0'); }

function formatMySQLLocal(dt){
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())} ` +
         `${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

// 'YYYY-MM-DD' -> Date en horario local 00:00:00
function parseLocalDate(ymd){
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m-1, d, 0, 0, 0, 0);
}

// Dada una fecha 'YYYY-MM-DD', devuelve
//   inicio: ese día a las 06:00 (local)
//   fin:    día siguiente a las 05:59:59.999 (local)
function ventanaTurnoDiario(ymd){
  const base = parseLocalDate(ymd);
  const inicio = new Date(base); inicio.setHours(6,0,0,0);
  const fin = new Date(base);    fin.setDate(fin.getDate()+1); fin.setHours(5,59,59,999);
  return { inicio, fin };
}

// Dada una fecha 'YYYY-MM-DD', devuelve la ventana del MES OPERATIVO:
// [ 1° del mes 06:00, 1° del mes siguiente 05:59:59.999 ]
function ventanaMesOperativo(ymd){
  const f = parseLocalDate(ymd);
  const mes = f.getMonth() + 1;
  const anio = f.getFullYear();
  const inicio = new Date(anio, mes-1, 1, 6, 0, 0, 0);
  const fin    = new Date(anio, mes,   1, 5, 59, 59, 999);
  return { inicio, fin };
}

module.exports = { pad, formatMySQLLocal, parseLocalDate, ventanaTurnoDiario, ventanaMesOperativo };
