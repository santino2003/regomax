const repository = require('../repositories/bolsonPlanificacionRepository');

function fechaValida(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1000-01-01' || value > '9999-12-30') return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
async function mostrar(req, res) {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const { desde = hoy.slice(0, 8) + '01', hasta = hoy, producto = '', page = '1' } = req.query;
  if (!fechaValida(desde) || !fechaValida(hasta) || desde > hasta || typeof producto !== 'string' || producto.length > 255 || typeof page !== 'string' || !/^[1-9]\d*$/.test(page) || !Number.isSafeInteger(Number(page))) {
    return res.status(400).render('error', { message: 'Revisá el rango de fechas, producto y página solicitada.', error: {} });
  }
  try {
    const data = await repository.consultar({ desde, hasta, producto, page: Number(page) });
    return res.render('bolsonesPlanificacion', { ...data, username: req.user.username, filtros: { desde, hasta, producto } });
  } catch (error) {
    console.error('Error en consulta de bolsones de planificación:', error);
    return res.status(500).render('error', { message: 'No se pudieron cargar los bolsones. Intentá nuevamente.', error: {} });
  }
}
module.exports = { mostrar, fechaValida };
