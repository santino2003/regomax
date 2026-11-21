const { test, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { connectDatabase, closeDatabase, checkTables, createScope } = require('./database');

mock.method(console, 'log', () => {});
mock.method(console, 'error', () => {});

let db, ventas, despachos;
before(async () => {
  db = await connectDatabase();
  await checkTables(db, ['ordenes_venta', 'ordenes_venta_detalle', 'despachos', 'despachos_detalle', 'bolsones']);
  ventas = require('../src/services/ordenDeVentaService');
  despachos = require('../src/services/despachoService');
});
after(async () => closeDatabase(db));

function fixture(t) {
  const scope = createScope();
  const codes = [];
  let nextOrder = 0;
  t.after(async () => {
    await db.withTransaction(async connection => {
      await db.query(`DELETE dd FROM despachos_detalle dd
        INNER JOIN despachos d ON dd.despacho_id = d.id
        INNER JOIN ordenes_venta ov ON d.orden_venta_id = ov.id
        WHERE ov.responsable = ?`, [scope.user], connection);
      await db.query('DELETE FROM despachos WHERE orden_venta_id IN (SELECT id FROM ordenes_venta WHERE responsable = ?)', [scope.user], connection);
      await db.query('DELETE FROM ordenes_venta_detalle WHERE orden_venta_id IN (SELECT id FROM ordenes_venta WHERE responsable = ?)', [scope.user], connection);
      await db.query('DELETE FROM ordenes_venta WHERE responsable = ?', [scope.user], connection);
      for (const code of codes) {
        await db.query('DELETE FROM bolsones WHERE codigo = ? AND responsable = ?', [code, scope.user], connection);
      }
    });
    const remaining = await db.query(`SELECT
      (SELECT COUNT(*) FROM ordenes_venta WHERE responsable = ?) AS orders,
      (SELECT COUNT(*) FROM bolsones WHERE responsable = ?) AS bags`, [scope.user, scope.user]);
    assert.equal(Number(remaining[0].orders), 0, 'Se eliminaron las órdenes creadas por la prueba');
    assert.equal(Number(remaining[0].bags), 0, 'Se eliminaron los bolsones creados por la prueba');
  });

  const product = `${scope.prefix}-product`;
  const orderData = (items = [{ producto: product, cantidad: 10 }]) => ({
    fecha: '2026-01-01', cliente: `${scope.prefix}-customer`, clienteFinal: 'integration',
    codigoDeVenta: `${scope.prefix}-${++nextOrder}`, observaciones: scope.prefix,
    responsable: scope.user, productosYCantidades: items
  });
  return {
    ...scope, product, orderData,
    async createOrder(items) { return (await ventas.crearOrdenDeVenta(orderData(items))).codigo; },
    async createBag(weight = 10) {
      // Los códigos numéricos respetan el rango de enteros seguros de JavaScript y el campo BIGINT.
      const code = String(700000000000000 + parseInt(randomUUID().replaceAll('-', '').slice(0, 10), 16));
      codes.push(code);
      await db.query(`INSERT INTO bolsones (codigo, producto, peso, precinto, fecha, hora, responsable)
        VALUES (?, ?, ?, ?, CURRENT_DATE(), ?, ?)`, [code, product, weight, scope.prefix, '00:00', scope.user]);
      return code;
    },
    async order(id) { return ventas.obtenerOrdenPorId(id); },
    async dispatchCount() {
      const rows = await db.query('SELECT COUNT(*) AS total FROM despachos WHERE responsable = ?', [scope.user]);
      return Number(rows[0].total);
    },
    async bagDispatched(code) {
      const rows = await db.query('SELECT despachado FROM bolsones WHERE codigo = ? AND responsable = ?', [code, scope.user]);
      return Number(rows[0].despachado);
    }
  };
}

test('MySQL: la creación de una venta confirma su cabecera y todos sus detalles', async t => {
  const f = fixture(t);
  const orderId = await f.createOrder([{ producto: f.product, cantidad: 10 }, { producto: `${f.product}-second`, cantidad: 2.5 }]);
  const order = await f.order(orderId);
  assert.equal(order.responsable, f.user);
  const expected = { [f.product]: 10, [`${f.product}-second`]: 2.5 };
  assert.deepEqual(Object.fromEntries(order.productos.map(row => [row.producto, Number(row.cantidad)])), expected);
  assert.deepEqual(Object.fromEntries(order.productos.map(row => [row.producto, Number(row.cantidad_inicial)])), expected);
});

test('MySQL: una falla en un detalle posterior revierte la cabecera y el detalle anterior de la venta', async t => {
  const f = fixture(t);
  const data = f.orderData([{ producto: f.product, cantidad: 10 }, { producto: `${f.product}-invalid`, cantidad: null }]);
  await assert.rejects(ventas.crearOrdenDeVenta(data), /cantidad no definidos/);
  const rows = await db.query('SELECT id FROM ordenes_venta WHERE responsable = ?', [f.user]);
  assert.equal(rows.length, 0);
});

test('MySQL: una restricción de la base al editar una venta restaura la cabecera y los detalles eliminados', async t => {
  const f = fixture(t);
  const orderId = await f.createOrder();
  const original = await f.order(orderId);
  await assert.rejects(ventas.actualizarOrden(orderId, {
    cliente: 'changed customer',
    productos: [{ producto: `${f.product}-replacement`, cantidad: 3 }, { producto: `${f.product}-invalid`, cantidad: null }]
  }), /cannot be null/);
  const current = await f.order(orderId);
  assert.equal(current.cliente, original.cliente);
  assert.deepEqual(current.productos, original.productos);
});

test('MySQL: el despacho por escaneo confirma juntos los detalles, el estado del bolsón y las cantidades de la orden', async t => {
  const f = fixture(t);
  const orderId = await f.createOrder();
  const code = await f.createBag();
  const result = await despachos.procesarDespacho({ ordenVentaId: orderId, responsable: f.user, codigos: [code] });
  assert.equal(result.ordenCompleta, true);
  assert.equal(await f.dispatchCount(), 1);
  assert.equal(await f.bagDispatched(code), 1);
  const order = await f.order(orderId);
  assert.equal(order.estado, 'en_logistica');
  assert.equal(Number(order.productos[0].cantidad), 0);
  const details = await db.query('SELECT * FROM despachos_detalle WHERE despacho_id = ?', [result.despachoId]);
  assert.equal(details.length, 1);
  assert.equal(String(details[0].bolson_codigo), code);
});

test('MySQL: un bolsón inexistente revierte el detalle ya registrado y la marca del bolsón anterior', async t => {
  const f = fixture(t);
  const orderId = await f.createOrder();
  const first = await f.createBag(4);
  const missing = await f.createBag(4);
  await db.query('DELETE FROM bolsones WHERE codigo = ? AND responsable = ?', [missing, f.user]);
  await assert.rejects(despachos.procesarDespacho({ ordenVentaId: orderId, responsable: f.user, codigos: [first, missing] }), /no existe/);
  assert.equal(await f.dispatchCount(), 0);
  assert.equal(await f.bagDispatched(first), 0);
  assert.equal(Number((await f.order(orderId)).productos[0].cantidad), 10);
});

test('MySQL: dos órdenes distintas no pueden despachar el mismo bolsón simultáneamente', { timeout: 20000 }, async t => {
  const f = fixture(t);
  const firstOrder = await f.createOrder();
  const secondOrder = await f.createOrder();
  const code = await f.createBag();
  const results = await Promise.allSettled([firstOrder, secondOrder].map(ordenVentaId =>
    despachos.procesarDespacho({ ordenVentaId, responsable: f.user, codigos: [code] })));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.match(results.find(result => result.status === 'rejected').reason.message, /ya fue despachado/);
  assert.equal(await f.dispatchCount(), 1);
  const details = await db.query('SELECT id FROM despachos_detalle WHERE bolson_codigo = ?', [code]);
  assert.equal(details.length, 1);
  const pending = Number((await f.order(firstOrder)).productos[0].cantidad) + Number((await f.order(secondOrder)).productos[0].cantidad);
  assert.equal(pending, 10);
});

test('MySQL: los despachos simultáneos de una orden conservan ambos cambios de cantidad', { timeout: 20000 }, async t => {
  const f = fixture(t);
  const orderId = await f.createOrder();
  const first = await f.createBag(4), second = await f.createBag(4);
  await Promise.all([first, second].map(code => despachos.procesarDespacho({ ordenVentaId: orderId, responsable: f.user, codigos: [code] })));
  assert.equal(await f.dispatchCount(), 2);
  assert.equal(Number((await f.order(orderId)).productos[0].cantidad), 2);
  assert.equal(await f.bagDispatched(first), 1);
  assert.equal(await f.bagDispatched(second), 1);
});

test('MySQL: el despacho manual confirma su detalle y la cantidad pendiente', async t => {
  const f = fixture(t);
  const orderId = await f.createOrder();
  const result = await despachos.procesarDespachoManual({ ordenVentaId: orderId, responsable: f.user, productosManual: [{ producto: f.product, cantidad: 4 }] });
  assert.equal(result.ordenCompleta, false);
  assert.equal(await f.dispatchCount(), 1);
  assert.equal(Number((await f.order(orderId)).productos[0].cantidad), 6);
  const rows = await db.query('SELECT es_manual, peso FROM despachos_detalle WHERE despacho_id = ?', [result.despachoId]);
  assert.equal(Number(rows[0].es_manual), 1);
  assert.equal(Number(rows[0].peso), 4);
});

test('MySQL: una falla en un producto posterior del despacho manual restaura la primera cantidad y revierte los registros', async t => {
  const f = fixture(t);
  const orderId = await f.createOrder();
  await assert.rejects(despachos.procesarDespachoManual({
    ordenVentaId: orderId, responsable: f.user,
    productosManual: [{ producto: f.product, cantidad: 4 }, { producto: `${f.product}-missing`, cantidad: 1 }]
  }), /no encontrado/);
  assert.equal(await f.dispatchCount(), 0);
  assert.equal(Number((await f.order(orderId)).productos[0].cantidad), 10);
});
