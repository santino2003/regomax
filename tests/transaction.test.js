const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { withTransaction, afterCommit } = require('../src/utils/transaction');

mock.method(console, 'error', () => {});

function crearContexto() {
  const conexion = Object.fromEntries(['beginTransaction', 'commit', 'rollback', 'release', 'destroy']
    .map(nombre => [nombre, mock.fn(async () => {})]));
  const pool = { getConnection: mock.fn(async () => conexion) };
  return { conexion, pool };
}

test('Transacciones: una tarea exitosa se confirma y libera su conexión', async () => {
  const { conexion, pool } = crearContexto();
  assert.equal(await withTransaction(pool, async recibida => { assert.equal(recibida, conexion); return 42; }), 42);
  assert.equal(conexion.commit.mock.callCount(), 1);
  assert.equal(conexion.rollback.mock.callCount(), 0);
  assert.equal(conexion.release.mock.callCount(), 1);
});

test('Transacciones: una falla al confirmar se revierte y conserva su error original', async () => {
  const { conexion, pool } = crearContexto();
  const error = new Error('Falló la confirmación');
  conexion.commit.mock.mockImplementation(async () => { throw error; });
  await assert.rejects(withTransaction(pool, async () => 1), recibido => recibido === error);
  assert.equal(conexion.rollback.mock.callCount(), 1);
  assert.equal(conexion.release.mock.callCount(), 1);
});

test('Transacciones: una falla al revertir conserva el error original y destruye la conexión', async () => {
  const { conexion, pool } = crearContexto();
  const original = new Error('Error original'), reversion = new Error('Falló la reversión');
  conexion.rollback.mock.mockImplementation(async () => { throw reversion; });
  await assert.rejects(withTransaction(pool, async () => { throw original; }),
    error => error === original && error.rollbackError === reversion);
  assert.equal(conexion.destroy.mock.callCount(), 1);
  assert.equal(conexion.release.mock.callCount(), 1);
});

test('Transacciones: las notificaciones se ejecutan después de confirmar y liberar la conexión', async () => {
  const { conexion, pool } = crearContexto();
  const notificar = mock.fn(() => {
    assert.equal(conexion.commit.mock.callCount(), 1);
    assert.equal(conexion.release.mock.callCount(), 1);
  });
  await withTransaction(pool, async actual => {
    afterCommit(actual, notificar);
    assert.equal(notificar.mock.callCount(), 0);
  });
  assert.equal(notificar.mock.callCount(), 1);
});

test('Transacciones: una tarea fallida descarta las notificaciones pendientes', async () => {
  const { pool } = crearContexto();
  const notificar = mock.fn();
  await assert.rejects(withTransaction(pool, async conexion => {
    afterCommit(conexion, notificar);
    throw new Error('Falló la tarea');
  }));
  assert.equal(notificar.mock.callCount(), 0);
});

test('Transacciones: una falla de notificación no revierte una operación confirmada', async () => {
  const { conexion, pool } = crearContexto();
  const resultado = await withTransaction(pool, async actual => {
    afterCommit(actual, () => { throw new Error('Falló el aviso'); });
    return 42;
  });
  assert.equal(resultado, 42);
  assert.equal(conexion.rollback.mock.callCount(), 0);
});
