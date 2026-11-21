const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('../test-support/loadModule');

mock.method(console, 'error', () => {});

function crearContexto(cambios = {}) {
  const original = Object.freeze({
    id: 9, orden_compra_id: 11, bien_id: 10, proveedor_id: 7, tipo_pago: 'SALDO_COMPLETO',
    cantidad_recibida: 2, precio_unitario: 50, monto_pago: '100', moneda: 'USD',
    medio_pago: 'Transferencia', pagado: 0, ...cambios.original
  });
  const eventos = [];
  let siguienteId = 201;
  const conexion = {
    execute: mock.fn(async sql => {
      if (sql.startsWith('SELECT')) {
        eventos.push('bloquear');
        return [cambios.inexistente ? [] : [original]];
      }
      if (sql.includes('INSERT INTO pagos')) {
        eventos.push('crear cuota');
        return [{ insertId: siguienteId++ }];
      }
      if (sql.startsWith('DELETE')) {
        eventos.push('eliminar original');
        return [{ affectedRows: cambios.filasEliminadas ?? 1 }];
      }
      throw new Error('Consulta inesperada en la prueba');
    }),
    beginTransaction: mock.fn(), commit: mock.fn(), rollback: mock.fn(), release: mock.fn(),
    ...cambios.conexion
  };
  const db = {
    query: mock.fn(() => { throw new Error('No debe utilizarse otra conexión'); }),
    pool: { getConnection: mock.fn(() => { throw new Error('No debe abrirse otra transacción'); }) }
  };
  return { original, eventos, conexion, db,
    repositorio: loadModule('src/repositories/pagoRepository.js', { '../config/db': db, '../utils/fecha': {} })
  };
}

function cuotasValidas() {
  return [{ fecha: '2026-11-26', monto: '40' }, { fecha: '2026-12-03', monto: '60' }];
}

function comprobarQueLaTransaccionSigueEnManosDelServicio(f) {
  for (const metodo of ['beginTransaction', 'commit', 'rollback', 'release']) {
    assert.equal(f.conexion[metodo].mock.callCount(), 0, metodo);
  }
  assert.equal(f.db.pool.getConnection.mock.callCount(), 0);
  assert.equal(f.db.query.mock.callCount(), 0);
}

test('Pagos, repositorio: leer para refinanciar solicita un bloqueo sobre el identificador indicado', async () => {
  const f = crearContexto();
  assert.equal(await f.repositorio.obtenerParaRefinanciacion(9, f.conexion), f.original);
  assert.deepEqual(f.conexion.execute.mock.calls[0].arguments, [
    'SELECT * FROM pagos WHERE id = ? FOR UPDATE', [9]
  ]);
  comprobarQueLaTransaccionSigueEnManosDelServicio(f);
});

test('Pagos, repositorio: un pago eliminado por otra solicitud se informa como inexistente al volver a leerlo', async () => {
  const f = crearContexto({ inexistente: true });
  assert.equal(await f.repositorio.obtenerParaRefinanciacion(9, f.conexion), null);
  assert.deepEqual(f.eventos, ['bloquear']);
});

test('Pagos, repositorio: las cuotas y la eliminación utilizan únicamente la conexión recibida', async () => {
  const f = crearContexto();
  const cuotas = Object.freeze(cuotasValidas().map(cuota => Object.freeze(cuota)));
  assert.deepEqual(await f.repositorio.refinanciarPagoVariable(9, f.original, cuotas, 'operador', 'Acuerdo', f.conexion), {
    success: true, cuotasCreadas: [{ id: 201, cuota: 1, fecha: '2026-11-26', monto: 40 },
      { id: 202, cuota: 2, fecha: '2026-12-03', monto: 60 }], pagoOriginalEliminado: 9, totalRefinanciado: 100
  });
  assert.deepEqual(f.eventos, ['crear cuota', 'crear cuota', 'eliminar original']);
  const consultas = f.conexion.execute.mock.calls;
  assert.deepEqual(consultas[0].arguments[1], [
    11, 10, 7, 'SALDO_COMPLETO', 2, 50, 40, 'USD', 'Transferencia', '2026-11-26', 'operador',
    'REFINANCIACIÓN - Pago original ID: 9, Monto original: $100.00, Total refinanciado: $100.00. Acuerdo - Cuota 1/2'
  ]);
  assert.equal(consultas[1].arguments[1][6], 60);
  assert.equal(consultas[1].arguments[1][9], '2026-12-03');
  assert.deepEqual(consultas[2].arguments, [
    'DELETE FROM pagos WHERE id = ? AND COALESCE(pagado, FALSE) = FALSE', [9]
  ]);
  comprobarQueLaTransaccionSigueEnManosDelServicio(f);
});

test('Pagos, repositorio: las cuotas conservan el número, la observación y los valores opcionales del pago', async () => {
  const f = crearContexto({ original: { bien_id: null, cantidad_recibida: null, precio_unitario: null, moneda: null, medio_pago: null } });
  const cuotas = [{ fecha: '2026-11-26', monto: 100, numeroCuota: 3, observacion: 'Última entrega' }];
  const resultado = await f.repositorio.refinanciarPagoVariable(9, f.original, cuotas, 'operador', null, f.conexion);
  const parametros = f.conexion.execute.mock.calls[0].arguments[1];
  assert.equal(parametros[1], null);
  assert.equal(parametros[4], null);
  assert.equal(parametros[5], null);
  assert.equal(parametros[7], 'ARS');
  assert.equal(parametros[8], null);
  assert.match(parametros[11], /Cuota 3\/1\. Última entrega$/);
  assert.equal(resultado.cuotasCreadas[0].cuota, 3);
});

for (const filasEliminadas of [0, 2]) {
  test(`Pagos, repositorio: eliminar ${filasEliminadas} filas produce un conflicto para revertir todas las cuotas`, async () => {
    const f = crearContexto({ filasEliminadas });
    await assert.rejects(f.repositorio.refinanciarPagoVariable(9, f.original, cuotasValidas(), 'operador', null, f.conexion), {
      statusCode: 409, message: 'El pago cambió durante la refinanciación. Actualice el listado e intente nuevamente.'
    });
    assert.deepEqual(f.eventos, ['crear cuota', 'crear cuota', 'eliminar original']);
    comprobarQueLaTransaccionSigueEnManosDelServicio(f);
  });
}

test('Pagos, repositorio: si falla una cuota se propaga el error antes de eliminar el pago original', async () => {
  const error = new Error('Falla simulada al insertar una cuota');
  let inserciones = 0;
  const f = crearContexto({ conexion: { execute: mock.fn(async () => {
    if (inserciones++ === 0) return [{ insertId: 201 }];
    throw error;
  }) } });
  await assert.rejects(f.repositorio.refinanciarPagoVariable(9, f.original, cuotasValidas(), 'operador', null, f.conexion), recibido => recibido === error);
  assert.equal(f.conexion.execute.mock.callCount(), 2);
  assert.ok(f.conexion.execute.mock.calls.every(c => c.arguments[0].includes('INSERT INTO pagos')));
  comprobarQueLaTransaccionSigueEnManosDelServicio(f);
});

test('Pagos, repositorio: un fallo de lectura bajo bloqueo conserva el error original', async () => {
  const error = new Error('Falla simulada al bloquear el pago');
  const f = crearContexto({ conexion: { execute: mock.fn(async () => { throw error; }) } });
  await assert.rejects(f.repositorio.obtenerParaRefinanciacion(9, f.conexion), recibido => recibido === error);
  comprobarQueLaTransaccionSigueEnManosDelServicio(f);
});

test('Pagos, repositorio: leer o escribir una refinanciación exige una conexión compartida', async () => {
  const f = crearContexto();
  await assert.rejects(f.repositorio.obtenerParaRefinanciacion(9), { message: 'La refinanciación requiere una conexión de transacción' });
  await assert.rejects(f.repositorio.refinanciarPagoVariable(9, f.original, cuotasValidas(), 'operador'), {
    message: 'La refinanciación requiere una conexión de transacción'
  });
  assert.equal(f.conexion.execute.mock.callCount(), 0);
  comprobarQueLaTransaccionSigueEnManosDelServicio(f);
});
