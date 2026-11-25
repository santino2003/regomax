const { test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { loadModule, dispatch } = require('../test-support/loadModule');
const User = require('../src/models/userModel');

const pass = (req, res, next) => next();
function authentication(accounts) {
  return loadModule('src/middleware/auth.js', { '../utils/hash': { verifyToken: token => accounts[token] } });
}

function paymentFixture() {
  const calls = [];
  const payment = { id: 42, monto_pago: '123.45', proveedor_nombre: '=1+1', orden_codigo: 'OC-1', pagado: true, detalle_pago: 'Transferencia' };
  const controller = loadModule('src/controllers/pagoController.js', {
    '../services/pagosService': { async obtenerResumenPorFecha() { return { total: 123.45 }; } },
    '../services/ordenCompraService': {}, '../repositories/proveedorRepository': {},
    '../repositories/pagoRepository': {
      async obtenerPagosConFiltros(filters, limit, offset) { calls.push({ filters, limit, offset }); return { pagos: [payment], total: 1 }; },
      async obtenerPorId(id) { return { ...payment, id }; }
    }
  });
  const router = loadModule('src/routes/pagoRoutes.js', {
    '../controllers/pagoController': controller,
    '../middleware/auth': authentication({
      exporter: { username: 'exporter', role: 'user', permissions: { 'pagos:export': true } },
      viewer: { username: 'viewer', role: 'user', permissions: { 'pagos:view': true, 'pagos:summary': true } }
    }),
    '../config/permissionsConfig': { PERMISSIONS: { PAGOS: { VIEW: 'pagos:view', EXPORT: 'pagos:export', SUMMARY: 'pagos:summary', EDIT: 'pagos:edit', MARK_PAID: 'pagos:mark_paid' } } },
    '../middleware/historialMiddleware': { pago: { marcarPagado: () => pass, refinanciar: () => pass } }
  });
  return { calls, request: (url, token, query) => dispatch(router, {
    url, originalUrl: '/pagos' + url, query, headers: token ? { authorization: `Bearer ${token}` } : {}
  }) };
}

test('La exportación de pagos exige el permiso correspondiente y devuelve un archivo Excel válido', async () => {
  const f = paymentFixture();
  const result = await f.request('/exportar', 'exporter', { proveedor_id: '12', pagado: 'true', fecha_desde: '2026-01-01' });
  assert.equal(result.status, 200);
  assert.ok(Buffer.isBuffer(result.data));
  assert.match(result.headers['content-type'], /spreadsheetml/);
  assert.match(result.headers['content-disposition'], /pagos.xlsx/);
  assert.equal(f.calls[0].filters.proveedor_id, '12');
  assert.equal(f.calls[0].filters.pagado, 'true');
  assert.equal(f.calls[0].limit, null);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(result.data);
  const sheet = workbook.getWorksheet('Pagos');
  assert.equal(sheet.getCell('G2').value, 123.45);
  assert.equal(sheet.getCell('I2').value, 'Pagado');
  assert.equal(sheet.getCell('C2').value, '=1+1', 'Los nombres de proveedores se guardan como texto y no como fórmulas');
});

test('El permiso de consulta no permite evitar el permiso de exportación mediante la ruta de detalle', async () => {
  const f = paymentFixture();
  assert.equal((await f.request('/exportar', 'viewer')).status, 403);
  assert.equal(f.calls.length, 0);
});

test('La exportación de pagos requiere autenticación', async () => {
  const f = paymentFixture();
  assert.equal((await f.request('/exportar')).status, 302);
  assert.equal(f.calls.length, 0);
});

test('Los identificadores de pagos llegan al controlador de detalle', async () => {
  const result = await paymentFixture().request('/42', 'viewer');
  assert.equal(result.view, 'pagoDetalle');
  assert.equal(result.data.pago.id, '42');
});

test('La ruta del resumen se resuelve de forma independiente de los identificadores de pagos', async () => {
  const result = await paymentFixture().request('/api/resumen', 'viewer', { fecha_inicio: '2026-01-01', fecha_fin: '2026-02-01' });
  assert.equal(result.status, 200);
  assert.equal(result.data.data.total, 123.45);
});

function usersFixture() {
  const user = new User({ id: 1, username: 'operator', password: 'sensitive-password-hash', role: 'user' });
  const controller = loadModule('src/controllers/authController.js', {
    '../services/loginProtection': { createLoginProtection: () => ({}) }, '../config/db': {},
    '../services/authService': {}, '../utils/hash': {},
    '../repositories/userRepository': { async findAll() { return [user]; } },
    '../config/permissionsConfig': { async getAllPermissionsByCategory() { return {}; } }
  });
  const router = loadModule('src/routes/authRoutes.js', {
    '../controllers/authController': controller,
    '../middleware/auth': authentication({ reader: { username: 'reader', permissions: { 'users:view': true } }, basic: { username: 'basic' } }),
    '../middleware/historialMiddleware': { registrarHistorial: () => pass }
  });
  return { request: (baseUrl, url = '/', token = 'reader') => dispatch(router, {
    baseUrl, url, originalUrl: baseUrl + url, headers: token ? { authorization: `Bearer ${token}` } : {}
  }) };
}

test('La página de usuarios devuelve HTML y las rutas de la API devuelven JSON sin hashes de contraseñas', async () => {
  const f = usersFixture();
  assert.equal((await f.request('/users')).view, 'users');
  for (const prefix of ['/api/users', '/api/auth']) {
    const result = await f.request(prefix);
    assert.equal(result.status, 200);
    assert.equal(result.view, undefined);
    assert.equal(result.data.data[0].username, 'operator');
    assert.ok(!JSON.stringify(result.data).includes('sensitive-password-hash'));
  }
});

test('Los listados de usuarios requieren autenticación y el permiso users:view', async () => {
  const f = usersFixture();
  assert.equal((await f.request('/api/users', '/', null)).status, 401);
  assert.equal((await f.request('/api/users', '/', 'basic')).status, 403);
});

test('Las rutas verify y check validan la sesión antes de la ruta genérica de usuarios', async () => {
  const f = usersFixture();
  for (const url of ['/verify', '/check']) {
    const result = await f.request('/api/auth', url, 'basic');
    assert.equal(result.status, 200);
    assert.equal(result.data.user.username, 'basic');
    assert.equal((await f.request('/api/auth', url, null)).status, 401);
  }
});
