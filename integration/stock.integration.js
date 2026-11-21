const { test, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('../test-support/loadModule');
const { connectDatabase, closeDatabase, checkTables, createStockFixture } = require('./database');

mock.method(console, 'log', () => {});
mock.method(console, 'error', () => {});

let db, bienService, kitService, salidaService, ajusteService;
const notifications = [];
const notificationReaders = new Map();

before(async () => {
  db = await connectDatabase();
  await checkTables(db, ['bienes', 'bien_componentes', 'movimientos_stock', 'bienes_archivos',
    'categorias', 'unidades_medida', 'almacenes', 'familias', 'bienes_familias']);
  // Only notification delivery is substituted. Services, repositories, SQL and transactions are real.
  bienService = loadModule('src/services/bienService.js', {
    '../repositories/configAlertasStockRepository': { async obtenerEmailsActivos() { return ['integration@example.invalid']; } },
    '../utils/emailService': { async enviarAlertaStockCritico(bien) {
      const rows = await db.query('SELECT cantidad_stock FROM bienes WHERE id = ?', [bien.id], notificationReaders.get(bien.id));
      notifications.push({ id: bien.id, notified: Number(bien.cantidad_stock), persisted: Number(rows[0].cantidad_stock) });
    } }
  });
  kitService = loadModule('src/services/kitService.js', { './bienService': bienService });
  salidaService = loadModule('src/services/salidaService.js', { './bienService': bienService, './kitService': kitService });
  ajusteService = loadModule('src/services/ajusteInventarioService.js', { './bienService': bienService });
});

after(async () => closeDatabase(db));

function salida(f, overrides = {}) {
  return { item_id: f.first, tipo_item: 'bien', cantidad: 2, responsable_salida: f.user, usuario_sistema: f.user, ...overrides };
}

function ajuste(f, overrides = {}) {
  return { item_id: f.first, tipo_item: 'bien', cantidad: 2, tipo_movimiento: 'AJUSTE_ENTRADA', responsable: f.user, ...overrides };
}

test('MySQL: simultaneous withdrawals cannot consume the same stock twice', { timeout: 15000 }, async t => {
  const f = await createStockFixture(t, db);
  const results = await Promise.allSettled([bienService.descontarStock(f.first, 7), bienService.descontarStock(f.first, 7)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const rejected = results.find(result => result.status === 'rejected');
  assert.match(rejected.reason.message, /Stock insuficiente/);
  assert.equal(await f.balance(), 3);
});

test('MySQL: simultaneous increments and withdrawals preserve every successful change', { timeout: 15000 }, async t => {
  const f = await createStockFixture(t, db);
  await Promise.all([bienService.incrementarStock(f.first, '5'), bienService.incrementarStock(f.first, 7), bienService.descontarStock(f.first, 2)]);
  assert.equal(await f.balance(), 20);
});

test('MySQL: decimal withdrawals and movement balances persist without truncation', async t => {
  const f = await createStockFixture(t, db);
  const result = await salidaService.procesarSalida(salida(f, { cantidad: '0.25' }));
  assert.deepEqual(result.data, { stock_anterior: 10, stock_nuevo: 9.75 });
  assert.equal(await f.balance(), 9.75);
  const movements = await f.movements();
  assert.equal(movements.length, 1);
  assert.equal(Number(movements[0].cantidad), 0.25);
  assert.equal(Number(movements[0].stock_nuevo), 9.75);
});

test('MySQL: insufficient second kit component rolls back the first component and its alert', async t => {
  const f = await createStockFixture(t, db, { kit: true, secondStock: 0, critical: 9 });
  await assert.rejects(kitService.descontarStock(f.kitId, 1), /Stock insuficiente/);
  assert.equal(await f.balance(), 10);
  assert.equal(await f.balance(f.second), 0);
  assert.ok(!notifications.some(notification => notification.id === f.first));
});

test('MySQL: a successful kit withdrawal commits every component', async t => {
  const f = await createStockFixture(t, db, { kit: true, secondStock: 2 });
  const result = await kitService.descontarStock(f.kitId, 2);
  assert.equal(await f.balance(), 6);
  assert.equal(await f.balance(f.second), 0);
  assert.equal(result.stock_anterior, 2);
  assert.equal(result.stock_nuevo, 0);
});

test('MySQL: simultaneous kit withdrawals respect component availability', { timeout: 15000 }, async t => {
  const f = await createStockFixture(t, db, { kit: true, secondStock: 1 });
  const results = await Promise.allSettled([kitService.descontarStock(f.kitId, 1), kitService.descontarStock(f.kitId, 1)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(await f.balance(), 8);
  assert.equal(await f.balance(f.second), 0);
});

test('MySQL: a real NOT NULL violation recording a withdrawal rolls back stock and its alert', async t => {
  const f = await createStockFixture(t, db, { critical: 9 });
  await assert.rejects(salidaService.procesarSalida(salida(f, { usuario_sistema: null })), { code: 'ER_BAD_NULL_ERROR' });
  assert.equal(await f.balance(), 10);
  assert.equal((await f.movements()).length, 0);
  assert.ok(!notifications.some(notification => notification.id === f.first));
});

test('MySQL: failure recording a kit movement rolls back all components', async t => {
  const f = await createStockFixture(t, db, { kit: true });
  await assert.rejects(salidaService.procesarSalida(salida(f, { item_id: f.kitId, tipo_item: 'kit', usuario_sistema: null })), { code: 'ER_BAD_NULL_ERROR' });
  assert.equal(await f.balance(), 10);
  assert.equal(await f.balance(f.second), 10);
});

test('MySQL: simultaneous adjustments record continuous balances', { timeout: 15000 }, async t => {
  const f = await createStockFixture(t, db);
  const results = await Promise.all([ajusteService.procesarAjuste(ajuste(f), f.user), ajusteService.procesarAjuste(ajuste(f), f.user)]);
  assert.ok(results.every(result => result.success));
  assert.equal(await f.balance(), 14);
  const movements = await f.movements();
  assert.deepEqual(movements.map(row => [Number(row.stock_anterior), Number(row.stock_nuevo)]), [[10, 12], [12, 14]]);
});

test('MySQL: failure recording an adjustment leaves the stored stock unchanged', async t => {
  const f = await createStockFixture(t, db);
  const result = await ajusteService.procesarAjuste(ajuste(f, { responsable: null }), f.user);
  assert.equal(result.success, false);
  assert.equal(await f.balance(), 10);
  assert.equal((await f.movements()).length, 0);
});

test('MySQL: stock alerts observe the committed value through another connection', async t => {
  const f = await createStockFixture(t, db, { critical: 9 });
  // Reserve an observer so the transaction cannot reuse its physical connection.
  const observer = await db.pool.getConnection();
  notificationReaders.set(f.first, observer);
  try {
    await salidaService.procesarSalida(salida(f));
    assert.deepEqual(notifications.filter(notification => notification.id === f.first), [{ id: f.first, notified: 8, persisted: 8 }]);
    assert.equal((await f.movements()).length, 1);
  } finally {
    notificationReaders.delete(f.first);
    observer.release();
  }
});
