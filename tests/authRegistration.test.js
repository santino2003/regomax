const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule, dispatch } = require('../test-support/loadModule');

function fixture() {
  const created = [];
  const service = loadModule('src/services/authService.js', {
    '../repositories/userRepository': {
      async findByUsername() { return null; },
      async create(data) {
        created.push(data);
        return { ...data, id: 1, toPublicJSON() { const { password, toPublicJSON, ...user } = this; return user; } };
      }
    },
    '../utils/hash': { async hashPassword() { return 'hashed'; }, generateToken() { return 'new-user-token'; } }
  });
  const controller = loadModule('src/controllers/authController.js', {
    '../services/authService': service,
    '../services/loginProtection': { createLoginProtection: () => ({}) },
    '../config/db': {}, '../repositories/userRepository': {}, '../utils/hash': {}, '../config/permissionsConfig': {}
  });
  const accounts = {
    admin: { username: 'admin', role: 'admin' },
    creator: { username: 'creator', role: 'user', permissions: { 'users:create': true } },
    reader: { username: 'reader', role: 'user', permissions: {} }
  };
  const authentication = loadModule('src/middleware/auth.js', {
    '../utils/hash': { verifyToken: token => accounts[token] }
  });
  const router = loadModule('src/routes/authRoutes.js', {
    '../controllers/authController': controller,
    '../middleware/auth': authentication,
    '../middleware/historialMiddleware': { registrarHistorial: () => (req, res, next) => next() }
  });
  return { created, service, request: (token, body, url = '/register', prefix = '/api/auth') => dispatch(router, {
    method: 'POST', url, originalUrl: prefix + url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: { username: 'new-user', password: 'password', email: 'user@example.invalid', ...body }
  }) };
}

test('Todas las rutas de registro rechazan solicitudes anónimas antes de guardar usuarios', async () => {
  const f = fixture();
  for (const prefix of ['/api/auth', '/api/users', '/users']) {
    for (const url of ['/register', '/']) {
      const response = await f.request(null, { role: 'admin' }, url, prefix);
      assert.ok([401, 302].includes(response.status));
    }
  }
  assert.equal(f.created.length, 0);
});

test('Un usuario autenticado sin el permiso users:create no puede registrar usuarios', async () => {
  const f = fixture();
  assert.equal((await f.request('reader', { role: 'admin' })).status, 403);
  assert.equal(f.created.length, 0);
});

test('El permiso users:create no permite asignar roles privilegiados ni permisos', async () => {
  const f = fixture();
  for (const body of [{ role: 'admin' }, { role: 'supervisor' }, { permissions: { 'users:delete': true } }]) {
    assert.equal((await f.request('creator', body)).status, 403);
  }
  assert.equal(f.created.length, 0);
});

test('El permiso users:create permite crear un usuario común sin permisos', async () => {
  const f = fixture();
  assert.equal((await f.request('creator', {})).status, 201);
  assert.equal(f.created[0].role, 'user');
  assert.deepEqual(f.created[0].permissions, {});
  assert.equal(f.created[0].password, 'hashed');
});

test('Los administradores pueden crear administradores mediante ambas rutas de registro', async () => {
  const f = fixture();
  for (const url of ['/register', '/']) {
    assert.equal((await f.request('admin', { role: 'admin', permissions: { 'users:view': true } }, url)).status, 201);
  }
  assert.equal(f.created.length, 2);
  assert.equal(f.created[0].role, 'admin');
});

test('Se rechazan los roles, formatos de permisos y credenciales inválidos', async () => {
  const f = fixture();
  for (const body of [{ role: 'owner' }, { permissions: [] }, { permissions: 'all' },
    { permissions: { 'users:view': 'true' } }, { username: {} }, { password: [] }]) {
    assert.equal((await f.request('admin', body)).status, 400);
  }
  assert.equal(f.created.length, 0);
});

test('El servicio también comprueba la autorización de forma independiente de las rutas HTTP', async () => {
  const f = fixture();
  await assert.rejects(f.service.register({ username: 'new-user', role: 'admin' }), { statusCode: 401 });
  assert.equal(f.created.length, 0);
});
