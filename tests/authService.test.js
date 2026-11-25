const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');
mock.method(console, 'error', () => {});

function crearContexto() {
  const repositorio = {
    findByUsername: mock.fn(async () => null),
    create: mock.fn(async datos => ({ id: 1, ...datos, toPublicJSON() { return { id: 1, username: datos.username, role: datos.role, permissions: datos.permissions }; } }))
  };
  const hash = { hashPassword: mock.fn(async () => 'hash-simulado'), generateToken: mock.fn(() => 'token-simulado') };
  return { repositorio, hash, servicio: cargarServicio('authService', { '../repositories/userRepository': repositorio, '../utils/hash': hash }) };
}
const datos = { username: 'nuevo', password: 'clave', role: 'user' };
const administrador = { role: 'admin' }, creador = { role: 'user', permissions: { 'users:create': true } };

test('Autenticación: registrar exige un actor autenticado y autorizado antes de consultar usuarios', async () => {
  const f = crearContexto();
  await assert.rejects(f.servicio.register(datos), { statusCode: 401 });
  await assert.rejects(f.servicio.register(datos, { role: 'user' }), { statusCode: 403 });
  assert.equal(f.repositorio.findByUsername.mock.callCount(), 0);
});

test('Autenticación: el permiso de creación no permite asignar roles privilegiados ni permisos', async () => {
  const f = crearContexto();
  for (const cambio of [{ role: 'admin' }, { role: 'supervisor' }, { permissions: { 'users:delete': true } }]) {
    await assert.rejects(f.servicio.register({ ...datos, ...cambio }, creador), { statusCode: 403 });
  }
  assert.equal(f.repositorio.create.mock.callCount(), 0);
});

test('Autenticación: un creador autorizado registra un usuario común con contraseña hasheada', async () => {
  const f = crearContexto();
  const resultado = await f.servicio.register(datos, creador);
  assert.equal(f.repositorio.create.mock.calls[0].arguments[0].password, 'hash-simulado');
  assert.deepEqual(resultado.user.permissions, {});
  assert.equal(resultado.user.role, 'user');
  assert.equal(resultado.token, 'token-simulado');
  assert.equal(resultado.user.password, undefined);
});

test('Autenticación: un administrador puede asignar el rol y los permisos solicitados', async () => {
  const f = crearContexto();
  await f.servicio.register({ ...datos, role: 'admin', permissions: { 'users:view': true } }, administrador);
  assert.equal(f.hash.generateToken.mock.calls[0].arguments[0].role, 'admin');
  assert.deepEqual(f.repositorio.create.mock.calls[0].arguments[0].permissions, { 'users:view': true });
});

test('Autenticación: rechaza los roles y formatos de permisos inválidos antes de guardar', async () => {
  const f = crearContexto();
  for (const cambio of [{ role: 'otro' }, { permissions: [] }, { permissions: 'todos' }, { permissions: { 'users:view': 'true' } }]) {
    await assert.rejects(f.servicio.register({ ...datos, ...cambio }, administrador), { statusCode: 400 });
  }
  assert.equal(f.repositorio.create.mock.callCount(), 0);
});

test('Autenticación: un nombre de usuario existente impide hashear y guardar otro usuario', async () => {
  const f = crearContexto();
  f.repositorio.findByUsername.mock.mockImplementation(async () => ({ id: 1 }));
  await assert.rejects(f.servicio.register(datos, administrador), /ya está en uso/);
  assert.equal(f.hash.hashPassword.mock.callCount(), 0);
  assert.equal(f.repositorio.create.mock.callCount(), 0);
});
