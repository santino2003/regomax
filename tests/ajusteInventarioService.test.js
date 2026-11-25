const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio, simularTransaccion } = require('../test-support/serviceUnit');
mock.method(console, 'error', () => {});

function crearContexto() {
  const { conexion, db } = simularTransaccion();
  const cambio = { stock_anterior: 10, stock_nuevo: 12, item: { codigo: 'B1', nombre: 'Bien' } };
  const bienes = { incrementarStock: mock.fn(async () => cambio), descontarStock: mock.fn(async () => ({ ...cambio, stock_nuevo: 8 })) };
  const repositorio = { registrarAjuste: mock.fn(async () => ({ id: 42 })), obtenerMovimientos: mock.fn(async () => ({ data: [] })) };
  const servicio = cargarServicio('ajusteInventarioService', { '../config/db': db, './bienService': bienes, '../repositories/ajusteInventarioRepository': repositorio });
  return { servicio, repositorio, bienes, conexion, db };
}
const datos = { tipo_item: 'bien', item_id: 1, cantidad: '2', responsable: 'operador' };

for (const tipo of ['ENTRADA', 'AJUSTE_ENTRADA', 'SALIDA', 'AJUSTE_SALIDA']) {
  test(`Ajustes: ${tipo} elige la operación de stock y conserva los datos del movimiento`, async () => {
    const f = crearContexto();
    const entrada = tipo.includes('ENTRADA');
    const resultado = await f.servicio.procesarAjuste({ ...datos, tipo_movimiento: tipo, observaciones: 'Conteo' }, 'operador');
    const metodo = entrada ? 'incrementarStock' : 'descontarStock';
    assert.deepEqual(f.bienes[metodo].mock.calls[0].arguments, [1, 2, f.conexion]);
    assert.equal(resultado.data.diferencia, entrada ? '+2' : '-2');
    assert.equal(resultado.data.movimiento_id, 42);
    const [movimiento, conexion] = f.repositorio.registrarAjuste.mock.calls[0].arguments;
    assert.equal(movimiento.tipo_movimiento, tipo);
    assert.equal(movimiento.observaciones, 'Conteo');
    assert.equal(movimiento.usuario_sistema, 'operador');
    assert.equal(conexion, f.conexion);
  });
}

test('Ajustes: los datos inválidos devuelven un error antes de solicitar la transacción', async () => {
  const f = crearContexto();
  for (const cambio of [{ cantidad: 0 }, { cantidad: -1 }, { cantidad: 'abc' }, { tipo_item: 'kit' }, { tipo_movimiento: 'otro' }]) {
    const resultado = await f.servicio.procesarAjuste({ ...datos, tipo_movimiento: 'ENTRADA', ...cambio }, 'operador');
    assert.equal(resultado.success, false);
  }
  assert.equal(f.db.withTransaction.mock.callCount(), 0);
});

test('Ajustes: informa una falla al registrar el movimiento', async () => {
  const f = crearContexto();
  f.repositorio.registrarAjuste.mock.mockImplementation(async () => { throw new Error('Falló el movimiento'); });
  assert.deepEqual(await f.servicio.procesarAjuste({ ...datos, tipo_movimiento: 'ENTRADA' }, 'operador'), { success: false, message: 'Falló el movimiento' });
});

test('Ajustes: consulta el historial con los filtros y la paginación recibidos', async () => {
  const f = crearContexto();
  const filtros = { bien_id: 1 };
  assert.deepEqual(await f.servicio.obtenerHistorial(2, 5, filtros), { data: [] });
  assert.deepEqual(f.repositorio.obtenerMovimientos.mock.calls[0].arguments, [2, 5, filtros]);
});

test('Ajustes: transforma una falla del historial en el mensaje esperado', async () => {
  const f = crearContexto();
  f.repositorio.obtenerMovimientos.mock.mockImplementation(async () => { throw new Error('Falló la consulta'); });
  assert.deepEqual(await f.servicio.obtenerHistorial(), { success: false, message: 'Error al obtener el historial de movimientos' });
});
