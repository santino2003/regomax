const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio, simularTransaccion } = require('../test-support/serviceUnit');
mock.method(console, 'error', () => {});

function crearContexto() {
  const { conexion, db } = simularTransaccion();
  const cambio = { stock_anterior: 10, stock_nuevo: 8, item: { codigo: 'B1', nombre: 'Bien' } };
  const bienes = { descontarStock: mock.fn(async () => cambio) }, kits = { descontarStock: mock.fn(async () => cambio) };
  const repositorio = { registrarMovimiento: mock.fn(async () => ({ id: 1 })) };
  const servicio = cargarServicio('salidaService', { '../config/db': db, './bienService': bienes, './kitService': kits, '../repositories/salidaRepository': repositorio });
  return { servicio, repositorio, bienes, kits, conexion, db };
}
const datos = { item_id: 1, tipo_item: 'bien', cantidad: '2', responsable_salida: 'operador', usuario_sistema: 'operador' };

for (const tipo_item of ['bien', 'kit']) {
  test(`Salidas: procesa un ${tipo_item} y registra su saldo mediante dependencias simuladas`, async () => {
    const f = crearContexto();
    const resultado = await f.servicio.procesarSalida({ ...datos, tipo_item });
    const elegido = tipo_item === 'bien' ? f.bienes : f.kits;
    assert.deepEqual(elegido.descontarStock.mock.calls[0].arguments, [1, 2, f.conexion]);
    assert.deepEqual(resultado.data, { stock_anterior: 10, stock_nuevo: 8 });
    const [movimiento, conexion] = f.repositorio.registrarMovimiento.mock.calls[0].arguments;
    assert.equal(movimiento.tipo_item, tipo_item);
    assert.equal(movimiento.cantidad, 2);
    assert.equal(movimiento.usuario_sistema, 'operador');
    assert.equal(conexion, f.conexion);
    assert.equal((tipo_item === 'bien' ? f.kits : f.bienes).descontarStock.mock.callCount(), 0);
  });
}

test('Salidas: rechaza los datos inválidos antes de descontar stock', async () => {
  const f = crearContexto();
  for (const cambio of [{ item_id: null }, { responsable_salida: '' }, { tipo_item: 'otro' }, { cantidad: -1 }, { cantidad: 'abc' }]) {
    await assert.rejects(f.servicio.procesarSalida({ ...datos, ...cambio }));
  }
  assert.equal(f.db.withTransaction.mock.callCount(), 0);
});

test('Salidas: una falla de stock evita el registro del movimiento', async () => {
  const f = crearContexto();
  const error = new Error('Stock insuficiente');
  f.bienes.descontarStock.mock.mockImplementation(async () => { throw error; });
  await assert.rejects(f.servicio.procesarSalida(datos), recibido => recibido === error);
  assert.equal(f.repositorio.registrarMovimiento.mock.callCount(), 0);
});

test('Salidas: propaga la falla al registrar el movimiento', async () => {
  const f = crearContexto();
  const error = new Error('Falló el movimiento');
  f.repositorio.registrarMovimiento.mock.mockImplementation(async () => { throw error; });
  await assert.rejects(f.servicio.procesarSalida(datos), recibido => recibido === error);
});
