const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('../test-support/loadModule');
const { withTransaction } = require('../src/utils/transaction');

mock.method(console, 'error', () => {});

function fixture({ secondStock = 10, failMovement = false, critical = null, failMail = false } = {}) {
  const rows = new Map([
    [1, { id: 1, codigo: 'B1', nombre: 'first', cantidad_stock: 10, cantidad_critica: critical }],
    [2, { id: 2, codigo: 'B2', nombre: 'second', cantidad_stock: secondStock }],
    [3, { id: 3, codigo: 'K1', nombre: 'kit', es_kit: 1 }]
  ]);
  const components = [{ bien_componente_id: 1, cantidad: 2 }, { bien_componente_id: 2, cantidad: 1 }];
  const locks = new Map(), movements = [], emails = [], queries = [];
  async function lock(id, connection) {
    if (connection.held.has(id)) return;
    const previous = locks.get(id) || Promise.resolve();
    let unlock;
    const current = new Promise(resolve => { unlock = resolve; });
    locks.set(id, previous.then(() => current));
    await previous;
    connection.held.add(id);
    connection.unlocks.push(unlock);
  }
  const pool = { async getConnection() {
    const c = {
      held: new Set(), unlocks: [], writes: new Map(), movements: [],
      async beginTransaction() {},
      async commit() { for (const [id, value] of this.writes) rows.set(id, value); movements.push(...this.movements); },
      async rollback() { this.writes.clear(); this.movements = []; },
      release() { this.unlocks.forEach(unlock => unlock()); },
      async query(sql, params) {
        queries.push(sql);
        const row = id => ({ ...(this.writes.get(Number(id)) || rows.get(Number(id))) });
        if (sql.startsWith('SELECT * FROM bienes WHERE id')) {
          assert.match(sql, /FOR UPDATE/);
          await lock(Number(params[0]), this);
          return [[row(params[0])]];
        }
        if (sql.startsWith('SELECT id FROM bienes')) { await lock(Number(params[0]), this); return [[{ id: params[0] }]]; }
        if (sql.includes('WHERE b.id = ? AND b.es_kit')) return [[row(params[0])]];
        if (sql.includes('FROM bien_componentes bc')) {
          assert.match(sql, /FOR UPDATE/);
          for (const item of components) await lock(item.bien_componente_id, this);
          return [components.map(item => ({ ...item, cantidad_stock: row(item.bien_componente_id).cantidad_stock }))];
        }
        if (sql.includes('FROM bienes_archivos')) return [[]];
        if (sql.startsWith('UPDATE bienes SET cantidad_stock')) {
          assert.ok(this.held.has(Number(params[1])), 'El stock se bloquea antes de actualizarse');
          this.writes.set(Number(params[1]), { ...row(params[1]), cantidad_stock: params[0] });
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('INSERT INTO movimientos_stock')) {
          if (failMovement) throw new Error('Falló el registro del movimiento');
          this.movements.push({ cantidad: params[5], anterior: params[6], nuevo: params[7] });
          return [{ insertId: 1 }];
        }
        throw new Error(`Consulta SQL inesperada: ${sql}`);
      }
    };
    return c;
  } };
  const db = {
    withTransaction: work => withTransaction(pool, work),
    async query(sql, params, connection) {
      assert.ok(connection, 'Las consultas de stock y movimientos deben compartir una transacción');
      const [result] = await connection.query(sql, params);
      return result;
    }
  };
  const bienes = loadModule('src/repositories/bienRepository.js', { '../config/db': db });
  const kits = loadModule('src/repositories/kitRepository.js', { '../config/db': db });
  const dependencies = Object.fromEntries(['categoria', 'familia', 'unidadMedida', 'almacen', 'proveedor'].map(n => [`../repositories/${n}Repository`, {}]));
  const bienService = loadModule('src/services/bienService.js', {
    ...dependencies, '../config/db': db, '../repositories/bienRepository': bienes,
    '../repositories/configAlertasStockRepository': { async obtenerEmailsActivos() { return ['review@example.invalid']; } },
    '../utils/emailService': { async enviarAlertaStockCritico(bien) {
      assert.equal(rows.get(bien.id).cantidad_stock, bien.cantidad_stock, 'La alerta consulta el stock confirmado');
      emails.push(bien);
      if (failMail) throw new Error('Falló el envío del correo');
    } }, './bienProveedorService': {}
  });
  const kitService = loadModule('src/services/kitService.js', {
    ...dependencies, '../config/db': db, '../repositories/kitRepository': kits,
    '../repositories/bienRepository': bienes, './bienService': bienService
  });
  const movementRepository = loadModule('src/repositories/salidaRepository.js', { '../config/db': db });
  const adjustmentRepository = loadModule('src/repositories/ajusteInventarioRepository.js', { '../config/db': db });
  const salidaService = loadModule('src/services/salidaService.js', {
    '../config/db': db, '../repositories/salidaRepository': movementRepository,
    './bienService': bienService, './kitService': kitService,
    '../repositories/bienRepository': bienes, '../repositories/kitRepository': kits
  });
  const ajusteService = loadModule('src/services/ajusteInventarioService.js', {
    '../config/db': db, '../repositories/ajusteInventarioRepository': adjustmentRepository, './bienService': bienService
  });
  return { rows, movements, emails, queries, bienService, kitService, salidaService, ajusteService, db, adjustmentRepository };
}

test('Dos descuentos simultáneos no pueden consumir el mismo stock disponible', async () => {
  const f = fixture();
  const results = await Promise.allSettled([f.bienService.descontarStock(1, 7), f.bienService.descontarStock(1, 7)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(f.rows.get(1).cantidad_stock, 3);
});

test('Los incrementos y descuentos simultáneos conservan todos los movimientos exitosos', async () => {
  const f = fixture();
  await Promise.all([f.bienService.incrementarStock(1, '5'), f.bienService.incrementarStock(1, 7), f.bienService.descontarStock(1, 2)]);
  assert.equal(f.rows.get(1).cantidad_stock, 20);
});

test('Una falla en el segundo componente del kit revierte el primero y evita la alerta de stock', async () => {
  const f = fixture({ secondStock: 0, critical: 9 });
  await assert.rejects(f.kitService.descontarStock(3, 1), /Stock insuficiente/);
  assert.equal(f.rows.get(1).cantidad_stock, 10);
  assert.equal(f.rows.get(2).cantidad_stock, 0);
  assert.equal(f.emails.length, 0);
});

test('El descuento de un kit actualiza todos sus componentes en una sola transacción', async () => {
  const f = fixture({ secondStock: 2 });
  const result = await f.kitService.descontarStock(3, 2);
  assert.equal(f.rows.get(1).cantidad_stock, 6);
  assert.equal(f.rows.get(2).cantidad_stock, 0);
  assert.equal(result.stock_anterior, 2);
  assert.equal(result.stock_nuevo, 0);
});

test('Los incrementos de un kit actualizan todos sus componentes juntos', async () => {
  const f = fixture();
  await f.kitService.incrementarStock(3, 2);
  assert.equal(f.rows.get(1).cantidad_stock, 14);
  assert.equal(f.rows.get(2).cantidad_stock, 12);
});

const salida = { item_id: 1, tipo_item: 'bien', cantidad: 2, responsable_salida: 'operator', usuario_sistema: 'operator' };

test('Una falla al registrar una salida revierte el stock y su alerta de nivel crítico', async () => {
  const f = fixture({ failMovement: true, critical: 9 });
  await assert.rejects(f.salidaService.procesarSalida(salida), /Falló el registro del movimiento/);
  assert.equal(f.rows.get(1).cantidad_stock, 10);
  assert.equal(f.movements.length, 0);
  assert.equal(f.emails.length, 0);
});

test('Una salida exitosa registra el saldo exacto protegido por el bloqueo', async () => {
  const f = fixture();
  const result = await f.salidaService.procesarSalida(salida);
  assert.deepEqual(result.data, { stock_anterior: 10, stock_nuevo: 8 });
  assert.deepEqual(f.movements, [{ cantidad: 2, anterior: 10, nuevo: 8 }]);
});

test('Una falla al registrar el movimiento de un kit revierte todos sus componentes', async () => {
  const f = fixture({ failMovement: true });
  await assert.rejects(f.salidaService.procesarSalida({ ...salida, item_id: 3, tipo_item: 'kit' }));
  assert.equal(f.rows.get(1).cantidad_stock, 10);
  assert.equal(f.rows.get(2).cantidad_stock, 10);
});

const ajuste = { item_id: 1, tipo_item: 'bien', cantidad: 2, tipo_movimiento: 'AJUSTE_ENTRADA', responsable: 'operator' };

test('Los ajustes simultáneos registran una secuencia continua de saldos', async () => {
  const f = fixture();
  const results = await Promise.all([f.ajusteService.procesarAjuste(ajuste, 'operator'), f.ajusteService.procesarAjuste(ajuste, 'operator')]);
  assert.ok(results.every(r => r.success));
  assert.equal(f.rows.get(1).cantidad_stock, 14);
  assert.deepEqual(f.movements.map(m => [m.anterior, m.nuevo]), [[10, 12], [12, 14]]);
});

test('Un ajuste no modifica el stock si falla el registro del movimiento', async () => {
  const f = fixture({ failMovement: true });
  assert.equal((await f.ajusteService.procesarAjuste(ajuste, 'operator')).success, false);
  assert.equal(f.rows.get(1).cantidad_stock, 10);
});

test('Las cantidades inválidas se rechazan antes de consultar o modificar la base', async () => {
  const f = fixture();
  for (const value of [0, -2, NaN, Infinity, 'abc', '2abc', '', ' ', [], true]) {
    await assert.rejects(f.bienService.descontarStock(1, value));
    await assert.rejects(f.kitService.incrementarStock(3, value));
    assert.equal((await f.ajusteService.procesarAjuste({ ...ajuste, cantidad: value }, 'operator')).success, false);
  }
  assert.equal(f.queries.length, 0);
});

test('Se conservan las cantidades decimales', async () => {
  const f = fixture();
  await f.bienService.descontarStock(1, '0.25');
  assert.equal(f.rows.get(1).cantidad_stock, 9.75);
});

test('Las alertas de stock se ejecutan después de confirmar y sus fallas no revierten el movimiento', async () => {
  const f = fixture({ critical: 9, failMail: true });
  const result = await f.salidaService.procesarSalida(salida);
  assert.equal(result.success, true);
  assert.equal(f.rows.get(1).cantidad_stock, 8);
  assert.equal(f.emails.length, 1);
  assert.equal(f.movements.length, 1);
});

test('La recepción de una compra actualiza el stock bloqueado y registra el movimiento en la misma transacción', async () => {
  const f = fixture();
  const dependencies = Object.fromEntries(['user', 'unidadMedida', 'centroCosto', 'bienProveedor', 'bien'].map(n => [`../repositories/${n}Repository`, {}]));
  const compras = loadModule('src/services/ordenCompraService.js', {
    ...dependencies, '../config/db': f.db, './bienService': f.bienService,
    './pagosService': {}, '../repositories/ajusteInventarioRepository': f.adjustmentRepository,
    '../repositories/ordenCompraRepository': {
      async obtenerPorId() { return { estado: 'En Proceso', codigo: 'OC-1', items: [{ id: 1, bien_id: 1, cantidad_recibida: 0 }] }; },
      async actualizarCantidadRecibida() {}, async esContraFactura() { return true; }
    }
  });
  await Promise.all([compras.actualizarCantidadRecibida(1, 1, 2), f.bienService.descontarStock(1, 3)]);
  assert.equal(f.rows.get(1).cantidad_stock, 9);
  assert.equal(f.movements.length, 1);
  assert.equal(f.movements[0].nuevo - f.movements[0].anterior, 2);
});
