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
  // Se sustituye únicamente el envío de notificaciones; los servicios, repositorios, consultas y transacciones son reales.
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

test('MySQL: los descuentos simultáneos no pueden consumir dos veces el mismo stock', { timeout: 15000 }, async t => {
  const f = await createStockFixture(t, db);
  const results = await Promise.allSettled([bienService.descontarStock(f.first, 7), bienService.descontarStock(f.first, 7)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const rejected = results.find(result => result.status === 'rejected');
  assert.match(rejected.reason.message, /Stock insuficiente/);
  assert.equal(await f.balance(), 3);
});

test('MySQL: los incrementos y descuentos simultáneos conservan todos los cambios exitosos', { timeout: 15000 }, async t => {
  const f = await createStockFixture(t, db);
  await Promise.all([bienService.incrementarStock(f.first, '5'), bienService.incrementarStock(f.first, 7), bienService.descontarStock(f.first, 2)]);
  assert.equal(await f.balance(), 20);
});

test('MySQL: los descuentos decimales y los saldos de movimientos se guardan sin truncarse', async t => {
  const f = await createStockFixture(t, db);
  const result = await salidaService.procesarSalida(salida(f, { cantidad: '0.25' }));
  assert.deepEqual(result.data, { stock_anterior: 10, stock_nuevo: 9.75 });
  assert.equal(await f.balance(), 9.75);
  const movements = await f.movements();
  assert.equal(movements.length, 1);
  assert.equal(Number(movements[0].cantidad), 0.25);
  assert.equal(Number(movements[0].stock_nuevo), 9.75);
});

test('MySQL: la falta de stock del segundo componente revierte el primero y su alerta', async t => {
  const f = await createStockFixture(t, db, { kit: true, secondStock: 0, critical: 9 });
  await assert.rejects(kitService.descontarStock(f.kitId, 1), /Stock insuficiente/);
  assert.equal(await f.balance(), 10);
  assert.equal(await f.balance(f.second), 0);
  assert.ok(!notifications.some(notification => notification.id === f.first));
});

test('MySQL: el descuento exitoso de un kit confirma todos sus componentes', async t => {
  const f = await createStockFixture(t, db, { kit: true, secondStock: 2 });
  const result = await kitService.descontarStock(f.kitId, 2);
  assert.equal(await f.balance(), 6);
  assert.equal(await f.balance(f.second), 0);
  assert.equal(result.stock_anterior, 2);
  assert.equal(result.stock_nuevo, 0);
});

test('MySQL: los descuentos simultáneos de kits respetan la disponibilidad de sus componentes', { timeout: 15000 }, async t => {
  const f = await createStockFixture(t, db, { kit: true, secondStock: 1 });
  const results = await Promise.allSettled([kitService.descontarStock(f.kitId, 1), kitService.descontarStock(f.kitId, 1)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(await f.balance(), 8);
  assert.equal(await f.balance(f.second), 0);
});

test('MySQL: una restricción NOT NULL al registrar una salida revierte el stock y su alerta', async t => {
  const f = await createStockFixture(t, db, { critical: 9 });
  await assert.rejects(salidaService.procesarSalida(salida(f, { usuario_sistema: null })), { code: 'ER_BAD_NULL_ERROR' });
  assert.equal(await f.balance(), 10);
  assert.equal((await f.movements()).length, 0);
  assert.ok(!notifications.some(notification => notification.id === f.first));
});

test('MySQL: una falla al registrar el movimiento de un kit revierte todos sus componentes', async t => {
  const f = await createStockFixture(t, db, { kit: true });
  await assert.rejects(salidaService.procesarSalida(salida(f, { item_id: f.kitId, tipo_item: 'kit', usuario_sistema: null })), { code: 'ER_BAD_NULL_ERROR' });
  assert.equal(await f.balance(), 10);
  assert.equal(await f.balance(f.second), 10);
});

test('MySQL: los ajustes simultáneos registran saldos continuos', { timeout: 15000 }, async t => {
  const f = await createStockFixture(t, db);
  const results = await Promise.all([ajusteService.procesarAjuste(ajuste(f), f.user), ajusteService.procesarAjuste(ajuste(f), f.user)]);
  assert.ok(results.every(result => result.success));
  assert.equal(await f.balance(), 14);
  const movements = await f.movements();
  assert.deepEqual(movements.map(row => [Number(row.stock_anterior), Number(row.stock_nuevo)]), [[10, 12], [12, 14]]);
});

test('MySQL: una falla al registrar un ajuste conserva el stock almacenado', async t => {
  const f = await createStockFixture(t, db);
  const result = await ajusteService.procesarAjuste(ajuste(f, { responsable: null }), f.user);
  assert.equal(result.success, false);
  assert.equal(await f.balance(), 10);
  assert.equal((await f.movements()).length, 0);
});

test('MySQL: las alertas de stock consultan el valor confirmado desde otra conexión', async t => {
  const f = await createStockFixture(t, db, { critical: 9 });
  // Reserva una conexión de observación para que la transacción utilice otra conexión física.
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
