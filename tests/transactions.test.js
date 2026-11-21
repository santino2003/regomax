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
      if (failure(sql, params)) throw new Error('simulated write failure');
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
      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };
  const db = {
    withTransaction: work => withTransaction({ async getConnection() { return connection; } }, work),
    async query(sql, params, current) {
      assert.equal(current, connection, 'every query must use the reserved connection');
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

test('creating an order commits its header and details together on one connection', async () => {
  const f = fixture();
  assert.equal((await f.ventas.crearOrdenDeVenta(orden)).success, true);
  assert.equal(f.committed.length, 2);
  assert.deepEqual(f.events, ['begin', 'commit', 'release']);
});

test('a failed order detail rolls back the header', async () => {
  const f = fixture(sql => sql.includes('INSERT INTO ordenes_venta_detalle'));
  await assert.rejects(f.ventas.crearOrdenDeVenta(orden), /simulated write failure/);
  assert.equal(f.committed.length, 0);
  assert.deepEqual(f.events, ['begin', 'rollback', 'release']);
});

test('editing an order locks the order and rolls back header and deleted details on failure', async () => {
  const f = fixture(sql => sql.includes('INSERT INTO ordenes_venta_detalle'));
  await assert.rejects(f.ventas.actualizarOrden(1, { productos: [{ producto: 'replacement', cantidad: 2 }] }));
  assert.match(f.queries[0].sql, /FOR UPDATE/);
  assert.ok(f.queries.some(q => q.sql.includes('DELETE FROM ordenes_venta_detalle')));
  assert.equal(f.committed.length, 0);
  assert.deepEqual(f.events, ['begin', 'rollback', 'release']);
});

test('editing an order commits the full replacement and reads its result on the same connection', async () => {
  const f = fixture();
  await f.ventas.actualizarOrden(1, { productos: [{ producto: 'replacement', cantidad: 2 }] });
  assert.equal(f.committed.length, 3);
  assert.deepEqual(f.events, ['begin', 'commit', 'release']);
});

test('scanned dispatch locks order and bags and commits every change together', async () => {
  const f = fixture();
  const result = await f.despachos.procesarDespacho(despacho);
  assert.equal(result.ordenCompleta, true);
  assert.match(f.queries[0].sql, /ordenes_venta.*FOR UPDATE/);
  assert.ok(f.queries.some(q => /bolsones.*FOR UPDATE/.test(q.sql)));
  assert.equal(f.committed.length, 5);
  assert.deepEqual(f.events, ['begin', 'commit', 'release']);
});

test('failure marking a bag rolls back dispatch header and detail', async () => {
  const f = fixture(sql => sql.includes('UPDATE bolsones'));
  await assert.rejects(f.despachos.procesarDespacho(despacho), /simulated write failure/);
  assert.equal(f.committed.length, 0);
  assert.deepEqual(f.events, ['begin', 'rollback', 'release']);
});

test('manual dispatch rolls back quantities if recording the detail fails', async () => {
  const f = fixture(sql => sql.includes('INSERT INTO despachos_detalle'));
  await assert.rejects(f.despachos.procesarDespachoManual({ ordenVentaId: 1, productosManual: [{ producto: 'product', cantidad: 10 }] }));
  assert.equal(f.committed.length, 0);
  assert.deepEqual(f.events, ['begin', 'rollback', 'release']);
});

test('manual dispatch commits the complete operation', async () => {
  const f = fixture();
  await f.despachos.procesarDespachoManual({ ordenVentaId: 1, productosManual: [{ producto: 'product', cantidad: 10 }] });
  assert.equal(f.committed.length, 4);
  assert.deepEqual(f.events, ['begin', 'commit', 'release']);
});

test('commit failures attempt rollback and always release the connection', async () => {
  const f = fixture();
  f.connection.commit = async () => { throw new Error('commit failed'); };
  await assert.rejects(f.db.withTransaction(async () => 1), /commit failed/);
  assert.deepEqual(f.events, ['begin', 'rollback', 'release']);
});

test('rollback failure preserves the original error and destroys the broken connection', async () => {
  const f = fixture();
  f.connection.rollback = async () => { throw new Error('rollback failed'); };
  f.connection.destroy = () => f.events.push('destroy');
  const original = new Error('original');
  await assert.rejects(f.db.withTransaction(async () => { throw original; }), error => error === original && error.rollbackError.message === 'rollback failed');
  assert.deepEqual(f.events, ['begin', 'destroy', 'release']);
});
