const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio, simularTransaccion } = require('../test-support/serviceUnit');
mock.method(console, 'error', () => {});

function crearContexto(completa = true) {
  const { conexion, db } = simularTransaccion();
  const repositorio = {
    bloquearOrden: mock.fn(async () => {}), crearDespacho: mock.fn(async () => 42),
    verificarBolsonDespachado: mock.fn(async () => null), agregarDetalleBolson: mock.fn(async () => {}),
    actualizarPesoProductoOrden: mock.fn(async () => ({ pesoNuevo: 0 })), verificarOrdenCompleta: mock.fn(async () => completa),
    actualizarEstadoOrden: mock.fn(async () => {}), agregarDetalleManual: mock.fn(async () => {})
  };
  const bolsones = { obtenerPorCodigo: mock.fn(async codigo => ({ producto: 'Polvo', peso: codigo === 'B1' ? '2.50' : '3.50', precinto: 'P1' })) };
  const servicio = cargarServicio('despachoService', { '../config/db': db, '../repositories/despachoRepository': repositorio, '../repositories/bolsonRepository': bolsones });
  return { servicio, repositorio, bolsones, conexion, db };
}
const datos = { ordenVentaId: 1, responsable: 'operador', codigos: ['B1', 'B2'] };

test('Despachos: agrupa el peso de los bolsones por producto y actualiza la orden completa', async () => {
  const f = crearContexto();
  const resultado = await f.servicio.procesarDespacho(datos);
  assert.equal(resultado.bolsonesDespachados, 2);
  assert.deepEqual(f.repositorio.actualizarPesoProductoOrden.mock.calls[0].arguments, [1, 'Polvo', 6, f.conexion]);
  assert.deepEqual(f.repositorio.actualizarEstadoOrden.mock.calls[0].arguments, [1, 'en_logistica', f.conexion]);
  assert.ok(f.repositorio.agregarDetalleBolson.mock.calls.every(llamada => llamada.arguments.at(-1) === f.conexion));
});

test('Despachos: un bolsón inexistente impide registrar su detalle', async () => {
  const f = crearContexto();
  f.bolsones.obtenerPorCodigo.mock.mockImplementation(async () => null);
  await assert.rejects(f.servicio.procesarDespacho(datos), /no existe/);
  assert.equal(f.repositorio.agregarDetalleBolson.mock.callCount(), 0);
});

test('Despachos: rechaza un bolsón despachado previamente', async () => {
  const f = crearContexto();
  f.repositorio.verificarBolsonDespachado.mock.mockImplementation(async () => ({ id: 10 }));
  await assert.rejects(f.servicio.procesarDespacho(datos), /ya fue despachado/);
  assert.equal(f.repositorio.agregarDetalleBolson.mock.callCount(), 0);
});

test('Despachos: una falla de detalle se propaga sin actualizar cantidades ni estado', async () => {
  const f = crearContexto();
  const error = new Error('Falló el detalle');
  f.repositorio.agregarDetalleBolson.mock.mockImplementation(async () => { throw error; });
  await assert.rejects(f.servicio.procesarDespacho(datos), recibido => recibido === error);
  assert.equal(f.repositorio.actualizarPesoProductoOrden.mock.callCount(), 0);
  assert.equal(f.repositorio.actualizarEstadoOrden.mock.callCount(), 0);
});

test('Despachos: el modo manual convierte las cantidades y conserva el estado de una orden pendiente', async () => {
  const f = crearContexto(false);
  const resultado = await f.servicio.procesarDespachoManual({ ordenVentaId: 1, responsable: 'operador', productosManual: [{ producto: 'Polvo', cantidad: '4.5' }] });
  assert.equal(resultado.ordenCompleta, false);
  assert.deepEqual(f.repositorio.actualizarPesoProductoOrden.mock.calls[0].arguments, [1, 'Polvo', 4.5, f.conexion]);
  const detalle = f.repositorio.agregarDetalleManual.mock.calls[0].arguments;
  assert.match(detalle[1], /^MANUAL-/);
  assert.deepEqual(detalle.slice(2), ['Polvo', 4.5, f.conexion]);
  assert.equal(f.repositorio.actualizarEstadoOrden.mock.callCount(), 0);
});

test('Despachos: una falla manual se informa sin devolver un despacho exitoso', async () => {
  const f = crearContexto();
  f.repositorio.agregarDetalleManual.mock.mockImplementation(async () => { throw new Error('Falló el registro manual'); });
  await assert.rejects(f.servicio.procesarDespachoManual({ ordenVentaId: 1, productosManual: [{ producto: 'Polvo', cantidad: 4 }] }), /Falló el registro manual/);
});

test('Despachos: los datos incompletos se rechazan antes de solicitar una transacción', async () => {
  const f = crearContexto();
  await assert.rejects(f.servicio.procesarDespacho({ ...datos, ordenVentaId: null }));
  await assert.rejects(f.servicio.procesarDespacho({ ...datos, codigos: [] }));
  await assert.rejects(f.servicio.procesarDespachoManual({ ordenVentaId: 1, productosManual: [] }));
  assert.equal(f.db.withTransaction.mock.callCount(), 0);
});
