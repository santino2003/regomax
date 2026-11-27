const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const ejs = require('ejs');
const { loadModule, dispatch } = require('../test-support/loadModule');
const fechaUtils = require('../src/utils/fecha');

mock.method(console, 'error', () => {});

function crearRutas(registrarEgreso = async id => ({ id: 42, ingreso_id: Number(id), tipo_movimiento: 'EGRESO' })) {
  const servicio = { registrarEgreso: mock.fn(registrarEgreso) };
  const controlador = loadModule('src/controllers/ingresoController.js', { '../services/ingresoService': servicio });
  const cuentas = {
    operador: { username: 'operador', role: 'user', permissions: { 'ingresos:create': true } },
    sinPermiso: { username: 'otro', role: 'user', permissions: {} }
  };
  const autenticacion = loadModule('src/middleware/auth.js', { '../utils/hash': { verifyToken: token => cuentas[token] } });
  const rutas = loadModule('src/routes/ingresoRoutes.js', {
    '../controllers/ingresoController': controlador, '../middleware/auth': autenticacion,
    '../controllers/personalController': { registrarIngreso(req, res) { res.json({ success: true }); } }
  });
  return { servicio, solicitar: token => dispatch(rutas, {
    method: 'POST', url: '/movimientos/7/egreso', originalUrl: '/api/ingresos/movimientos/7/egreso',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: { nombre: 'Persona manipulada', ingreso_id: 99, fecha_movimiento: '2000-01-01' }
  }) };
}

test('Egresos: la ruta exige sesión y el permiso de ingresos antes de registrar una salida', async () => {
  const f = crearRutas();
  assert.equal((await f.solicitar(null)).status, 401);
  assert.equal((await f.solicitar('sinPermiso')).status, 403);
  assert.equal(f.servicio.registrarEgreso.mock.callCount(), 0);
});

test('Egresos: la ruta utiliza el ingreso de la URL y descarta los datos enviados por el cliente', async () => {
  const f = crearRutas();
  assert.deepEqual(await f.solicitar('operador'), {
    status: 201, data: { success: true, movimiento: { id: 42, ingreso_id: 7, tipo_movimiento: 'EGRESO' } }
  });
  assert.deepEqual(f.servicio.registrarEgreso.mock.calls[0].arguments, ['7']);
});

for (const status of [400, 404, 409, undefined]) {
  test(`Egresos: la ruta conserva el estado ${status || 500} sin exponer errores internos`, async () => {
    const f = crearRutas(async () => { throw Object.assign(new Error('Detalle de la falla'), { status }); });
    const respuesta = await f.solicitar('operador');
    assert.equal(respuesta.status, status || 500);
    assert.equal(respuesta.data.success, false);
    assert.equal(respuesta.data.error, status ? 'Detalle de la falla' : 'No se pudo registrar el egreso. Intente nuevamente.');
  });
}

test('Egresos: el repositorio bloquea el ingreso y consulta la salida usando la misma conexión', async () => {
  const conexion = {};
  const ingreso = { id: 7, tipo_movimiento: 'INGRESO' };
  const query = mock.fn(async () => [ingreso]);
  const repositorio = loadModule('src/repositories/movimientoIngresoRepository.js', { '../config/db': { query } });
  assert.equal(await repositorio.obtenerParaEgreso(7, conexion), ingreso);
  await repositorio.obtenerEgreso(7, conexion);
  for (const llamada of query.mock.calls) {
    const [sql, parametros, recibida] = llamada.arguments;
    assert.match(sql, /FOR UPDATE/);
    assert.deepEqual(parametros, [7]);
    assert.equal(recibida, conexion);
  }
  assert.match(query.mock.calls[1].arguments[0], /WHERE ingreso_id = \?/);
});

test('Egresos: se guarda el vínculo en la transacción y se deja que la base asigne la hora actual', async () => {
  const conexion = {};
  const query = mock.fn(async () => ({ insertId: 42 }));
  const repositorio = loadModule('src/repositories/movimientoIngresoRepository.js', { '../config/db': { query } });
  const egreso = { tipo_movimiento: 'EGRESO', ingreso_id: 7, motivo: 'CNFU/NFU', nombre: 'Ana', apellido: 'García',
    patente: 'AB123CD', empresa: 'Empresa de prueba' };
  assert.deepEqual(await repositorio.crear(egreso, conexion), { id: 42, ...egreso });
  const [sql, parametros, recibida] = query.mock.calls[0].arguments;
  assert.match(sql, /empresa, ingreso_id, orden_venta_id, archivo_jpg, personal_id, auto, cargo, turno, descripcion, empresa_ingreso_id\)/);
  assert.doesNotMatch(sql, /fecha_movimiento/);
  assert.deepEqual(parametros, ['EGRESO', 'CNFU/NFU', 'Ana', 'García', 'AB123CD', 'Empresa de prueba', 7, null, null, null, null, null, null, null, null]);
  assert.equal(recibida, conexion);
});

async function renderizarListado(movimientos, extras = {}) {
  return ejs.renderFile(path.resolve(__dirname, '../views/ingresosListado.ejs'), {
    username: 'operador', registrado: false, egresoRegistrado: false, errorListado: false,
    movimientos, total: movimientos.length, pagina: 2, paginas: 3, fechaUtils, ...extras
  });
}

test('Egresos: el listado ofrece Dar egreso solo para ingresos sin salida y muestra la empresa', async () => {
  const base = { motivo: 'CNFU/NFU', nombre: 'Ana', apellido: 'García', patente: 'AB123CD', empresa: 'Empresa de prueba',
    fecha_movimiento: new Date('2026-11-23T15:00:00Z') };
  const html = await renderizarListado([
    { ...base, id: 7, tipo_movimiento: 'INGRESO', egreso_id: null },
    { ...base, id: 8, tipo_movimiento: 'INGRESO', egreso_id: 42, fecha_egreso: base.fecha_movimiento },
    { ...base, id: 42, tipo_movimiento: 'EGRESO', ingreso_id: 8 }
  ], { egresoRegistrado: true });
  assert.equal((html.match(/data-dar-egreso/g) || []).length, 1);
  assert.match(html, /data-ingreso-id="7"/);
  assert.match(html, /Egresado/);
  assert.match(html, /Ingreso #8/);
  assert.match(html, /Empresa de prueba/);
  assert.match(html, /Egreso registrado correctamente/);
  assert.match(html, /page=1/);
  assert.match(html, /page=3/);
});

test('Egresos: los nombres y empresas se escapan también en los datos de confirmación', async () => {
  const ataque = '\"><img src=x onerror=alert(1)>';
  const html = await renderizarListado([{ id: 7, tipo_movimiento: 'INGRESO', nombre: ataque, apellido: ataque,
    empresa: ataque, patente: ataque, motivo: ataque, fecha_movimiento: null }]);
  assert.ok(!html.includes(ataque));
  assert.match(html, /&lt;img/);
});

test('Egresos: el listado vacío y un error de carga no ofrecen acciones sobre ingresos', async () => {
  for (const errorListado of [false, true]) {
    const html = await renderizarListado([], { errorListado });
    assert.doesNotMatch(html, /data-dar-egreso/);
    assert.match(html, errorListado ? /No se pudo cargar el listado/ : /No hay ingresos ni egresos registrados/);
  }
});

test('Ingresos y egresos: los filtros conservan la búsqueda en la paginación y escapan los textos', async () => {
  const html = await renderizarListado([], { filtros: { persona: 'Ana & García', motivo: 'Personal', estado: 'pendientes' } });
  assert.match(html, /value="Ana &amp; García"/);
  assert.match(html, /persona=Ana\+%26\+Garc%C3%ADa/);
  assert.match(html, /estado=pendientes/);
  assert.match(html, /page=3/);
});

test('Ingresos y egresos: contar y listar usan los mismos filtros y la fecha hasta incluye todo el día', async () => {
  const query = mock.fn(async sql => sql.includes('COUNT(*)') ? [{ total: 1 }] : []);
  const repositorio = loadModule('src/repositories/movimientoIngresoRepository.js', { '../config/db': { query } });
  const filtros = { persona: 'Ana García', patente: 'AB123', estado: 'pendientes', fecha_hasta: '2026-11-25' };
  await repositorio.contar(filtros);
  await repositorio.listar(50, 0, filtros);
  const [conteo, listado] = query.mock.calls.map(llamada => llamada.arguments);
  assert.deepEqual(conteo[1], ['%Ana%', '%García%', '%AB123%', '2026-11-25 00:00:00']);
  assert.deepEqual(listado[1], conteo[1]);
  for (const [sql] of [conteo, listado]) {
    assert.match(sql, /movimiento.tipo_movimiento = 'INGRESO' AND egreso.id IS NULL/);
    assert.match(sql, /fecha_movimiento < DATE_ADD\(\?, INTERVAL 1 DAY\)/);
  }
  assert.match(listado[0], /ORDER BY CASE WHEN/);
});
