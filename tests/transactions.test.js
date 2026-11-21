const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('../test-support/loadModule');
const { withTransaction } = require('../src/utils/transaction');

mock.method(console, 'error', () => {});

function fixture(failure = () => false) {
  const events = [], queries = [], committed = [];
  let writes = [];
  const connection = {
    async beginTransaction() { events.push('begin'); },
    async commit() { events.push('commit'); committed.push(...writes); },
    async rollback() { events.push('rollback'); writes = []; },
    release() { events.push('release'); },
    async query(sql, params) {
      queries.push({ sql, params });
      if (failure(sql, params)) throw new Error('Falla simulada de escritura');
      if (/^\s*(INSERT|UPDATE|DELETE)/.test(sql)) {
        writes.push({ sql, params });
        return [{ insertId: 1, affectedRows: 1 }];
      }
      if (sql.includes('SELECT id FROM ordenes_venta')) return [[{ id: 1 }]];
      if (sql.includes('SELECT ov.*')) return [[{ id: 1, cliente: 'customer', detalle_id: 1, producto: 'product', cantidad: 10 }]];
      if (sql.includes('FROM bolsones')) return [[{ codigo: 'B1', producto: 'product', peso: 10, precinto: 'P1' }]];
      if (sql.includes('SELECT * FROM despachos_detalle')) return [[]];
      if (sql.includes('SELECT id, producto, cantidad')) return [[{ id: 1, cantidad: 10 }]];
      if (sql.includes('SUM(cantidad)')) return [[{ total_pendiente: 0 }]];
      throw new Error(`Consulta SQL inesperada: ${sql}`);
    }
  };
  const db = {
    withTransaction: work => withTransaction({ async getConnection() { return connection; } }, work),
    async query(sql, params, current) {
      assert.equal(current, connection, 'Cada consulta debe usar la conexión reservada');
      const [rows] = await current.query(sql, params);
      return rows;
    }
  };
  const bolsones = loadModule('src/repositories/bolsonRepository.js', { '../config/db': db });
  const despachoRepository = loadModule('src/repositories/despachoRepository.js', {
    '../config/db': db, './bolsonRepository': bolsones
  });
  const ventasRepository = loadModule('src/repositories/ordenDeVentaRepository.js', { '../config/db': db });
  return {
    events, queries, committed, connection, db,
    ventas: loadModule('src/services/ordenDeVentaService.js', {
      '../repositories/ordenDeVentaRepository': ventasRepository, '../config/db': db
    }),
    despachos: loadModule('src/services/despachoService.js', {
      '../repositories/despachoRepository': despachoRepository,
      '../repositories/bolsonRepository': bolsones, '../config/db': db
    })
  };
}

const orden = { fecha: '2026-11-21', cliente: 'customer', productosYCantidades: [{ producto: 'product', cantidad: 10 }] };
const despacho = { ordenVentaId: 1, responsable: 'operator', codigos: ['B1'] };

test('La creación de una orden confirma la cabecera y sus detalles en una misma conexión', async () => {
  const f = fixture();
  assert.equal((await f.ventas.crearOrdenDeVenta(orden)).success, true);
  assert.equal(f.committed.length, 2);
  assert.deepEqual(f.events, ['begin', 'commit', 'release']);
});

test('Una falla en un detalle de la orden revierte la cabecera', async () => {
  const f = fixture(sql => sql.includes('INSERT INTO ordenes_venta_detalle'));
  await assert.rejects(f.ventas.crearOrdenDeVenta(orden), /Falla simulada de escritura/);
  assert.equal(f.committed.length, 0);
  assert.deepEqual(f.events, ['begin', 'rollback', 'release']);
});

test('La edición bloquea la orden y restaura la cabecera y los detalles eliminados si ocurre una falla', async () => {
  const f = fixture(sql => sql.includes('INSERT INTO ordenes_venta_detalle'));
  await assert.rejects(f.ventas.actualizarOrden(1, { productos: [{ producto: 'replacement', cantidad: 2 }] }));
  assert.match(f.queries[0].sql, /FOR UPDATE/);
  assert.ok(f.queries.some(q => q.sql.includes('DELETE FROM ordenes_venta_detalle')));
  assert.equal(f.committed.length, 0);
  assert.deepEqual(f.events, ['begin', 'rollback', 'release']);
});

test('La edición confirma el reemplazo completo y consulta el resultado en la misma conexión', async () => {
  const f = fixture();
  await f.ventas.actualizarOrden(1, { productos: [{ producto: 'replacement', cantidad: 2 }] });
  assert.equal(f.committed.length, 3);
  assert.deepEqual(f.events, ['begin', 'commit', 'release']);
});

test('El despacho por escaneo bloquea la orden y los bolsones y confirma todos los cambios juntos', async () => {
  const f = fixture();
  const result = await f.despachos.procesarDespacho(despacho);
  assert.equal(result.ordenCompleta, true);
  assert.match(f.queries[0].sql, /ordenes_venta.*FOR UPDATE/);
  assert.ok(f.queries.some(q => /bolsones.*FOR UPDATE/.test(q.sql)));
  assert.equal(f.committed.length, 5);
  assert.deepEqual(f.events, ['begin', 'commit', 'release']);
});

test('Una falla al marcar un bolsón revierte la cabecera y el detalle del despacho', async () => {
  const f = fixture(sql => sql.includes('UPDATE bolsones'));
  await assert.rejects(f.despachos.procesarDespacho(despacho), /Falla simulada de escritura/);
  assert.equal(f.committed.length, 0);
  assert.deepEqual(f.events, ['begin', 'rollback', 'release']);
});

test('El despacho manual revierte las cantidades si falla el registro del detalle', async () => {
  const f = fixture(sql => sql.includes('INSERT INTO despachos_detalle'));
  await assert.rejects(f.despachos.procesarDespachoManual({ ordenVentaId: 1, productosManual: [{ producto: 'product', cantidad: 10 }] }));
  assert.equal(f.committed.length, 0);
  assert.deepEqual(f.events, ['begin', 'rollback', 'release']);
});

test('El despacho manual confirma la operación completa', async () => {
  const f = fixture();
  await f.despachos.procesarDespachoManual({ ordenVentaId: 1, productosManual: [{ producto: 'product', cantidad: 10 }] });
  assert.equal(f.committed.length, 4);
  assert.deepEqual(f.events, ['begin', 'commit', 'release']);
});

test('Una falla al confirmar intenta revertir la transacción y libera la conexión', async () => {
  const f = fixture();
  f.connection.commit = async () => { throw new Error('Falló la confirmación de la transacción'); };
  await assert.rejects(f.db.withTransaction(async () => 1), /Falló la confirmación de la transacción/);
  assert.deepEqual(f.events, ['begin', 'rollback', 'release']);
});

test('Una falla al revertir conserva el error original y destruye la conexión dañada', async () => {
  const f = fixture();
  f.connection.rollback = async () => { throw new Error('Falló la reversión de la transacción'); };
  f.connection.destroy = () => f.events.push('destroy');
  const original = new Error('original');
  await assert.rejects(f.db.withTransaction(async () => { throw original; }), error => error === original && error.rollbackError.message === 'Falló la reversión de la transacción');
  assert.deepEqual(f.events, ['begin', 'destroy', 'release']);
});
