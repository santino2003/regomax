const db = require('../config/db');

async function consultar({ desde, hasta, producto, page }) {
  const rango = 'fecha >= ? AND fecha < DATE_ADD(?, INTERVAL 1 DAY)';
  const params = [desde, hasta];
  const where = rango + (producto ? ' AND producto = ?' : '');
  const filtrados = producto ? [...params, producto] : params;
  const resultados = await Promise.allSettled([
    db.query(`SELECT producto, COALESCE(SUM(peso), 0) AS kilos, COUNT(*) AS cantidad
      FROM bolsones WHERE ${rango} GROUP BY producto ORDER BY producto`, params),
    db.query(`SELECT COUNT(*) AS total FROM bolsones WHERE ${where}`, filtrados),
    db.query('SELECT DISTINCT producto FROM bolsones WHERE producto IS NOT NULL ORDER BY producto')
  ]);
  for (const result of resultados) if (result.status === 'rejected') throw result.reason;
  const [resumen, conteo, productos] = resultados.map(result => result.value);
  const total = Number(conteo[0].total);
  const totalPages = Math.max(1, Math.ceil(total / 50));
  const pagina = Math.min(page, totalPages);
  const bolsones = await db.query(`SELECT id, codigo, precinto, producto, peso, fecha, despachado
    FROM bolsones WHERE ${where} ORDER BY fecha DESC, id DESC LIMIT 50 OFFSET ${(pagina - 1) * 50}`, filtrados);
  return { resumen, productos, bolsones, totalKilos: resumen.reduce((sum, row) => sum + Number(row.kilos), 0),
    pagination: { page: pagina, total, totalPages, limit: 50 } };
}
module.exports = { consultar };
