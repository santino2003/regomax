const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule, dispatch } = require('../test-support/loadModule');

function crearContexto() {
  const cuentas = { administrador: { username: 'administrador', role: 'admin' }, lector: { username: 'lector', role: 'user', permissions: {} } };
  const servicio = { register: mock.fn(async datos => ({ user: { username: datos.username } })) };
  const controlador = loadModule('src/controllers/authController.js', {
    '../services/authService': servicio,
    '../services/loginProtection': { createLoginProtection: () => ({}) },
    '../config/db': {}, '../repositories/userRepository': {}, '../utils/hash': {}, '../config/permissionsConfig': {}
  });
  const autenticacion = loadModule('src/middleware/auth.js', { '../utils/hash': { verifyToken: token => cuentas[token] } });
  const rutas = loadModule('src/routes/authRoutes.js', {
    '../controllers/authController': controlador,
    '../middleware/auth': autenticacion,
    '../middleware/historialMiddleware': { registrarHistorial: () => (req, res, next) => next() }
  });
  return { servicio, cuentas, solicitar: (token, datos = {}, url = '/register', prefijo = '/api/auth') => dispatch(rutas, {
    method: 'POST', url, originalUrl: prefijo + url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: { username: 'nuevo', password: 'clave', ...datos }
  }) };
}

test('Rutas de registro: todas las variantes rechazan solicitudes anónimas antes de llamar al servicio', async () => {
  const f = crearContexto();
  for (const prefijo of ['/api/auth', '/api/users', '/users']) {
    for (const url of ['/register', '/']) {
      assert.ok([401, 302].includes((await f.solicitar(null, { role: 'admin' }, url, prefijo)).status));
    }
  }
  assert.equal(f.servicio.register.mock.callCount(), 0);
});

test('Rutas de registro: el permiso de creación se exige antes de llamar al servicio', async () => {
  const f = crearContexto();
  assert.equal((await f.solicitar('lector')).status, 403);
  assert.equal(f.servicio.register.mock.callCount(), 0);
});

test('Rutas de registro: ambas rutas entregan el actor autenticado al servicio simulado', async () => {
  const f = crearContexto();
  for (const url of ['/register', '/']) assert.equal((await f.solicitar('administrador', {}, url)).status, 201);
  assert.equal(f.servicio.register.mock.callCount(), 2);
  assert.ok(f.servicio.register.mock.calls.every(llamada => llamada.arguments[1] === f.cuentas.administrador));
});

test('Rutas de registro: las credenciales inválidas se rechazan antes de invocar al servicio', async () => {
  const f = crearContexto();
  for (const datos of [{ username: {} }, { username: ' ' }, { password: [] }, { password: '' }]) {
    assert.equal((await f.solicitar('administrador', datos)).status, 400);
  }
  assert.equal(f.servicio.register.mock.callCount(), 0);
});
