const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('../test-support/loadModule');

mock.method(console, 'error', () => {});

function crearContexto(refinanciarPago) {
  const servicio = { refinanciarPago: mock.fn(refinanciarPago) };
  const controlador = loadModule('src/controllers/pagoController.js', {
    '../services/pagosService': servicio, '../services/ordenCompraService': {},
    '../repositories/pagoRepository': {}, '../repositories/proveedorRepository': {}, exceljs: {}
  });
  const solicitud = {
    params: { id: '9' }, body: { cuotas: [{ fecha: '2026-11-26', monto: 100 }], observacionesGenerales: 'Acuerdo' },
    user: { username: 'operador' }
  };
  const respuesta = { status: mock.fn(() => respuesta), json: mock.fn(() => respuesta) };
  return { servicio, controlador, solicitud, respuesta };
}

test('Pagos, controlador: una refinanciación exitosa conserva la respuesta y entrega los datos al servicio', async () => {
  const resultado = { success: true, message: 'Pago refinanciado exitosamente en 1 cuotas', data: { totalRefinanciado: 100 } };
  const f = crearContexto(async () => resultado);
  await f.controlador.refinanciarPago(f.solicitud, f.respuesta);
  assert.deepEqual(f.servicio.refinanciarPago.mock.calls[0].arguments, ['9', f.solicitud.body.cuotas, 'operador', 'Acuerdo']);
  assert.equal(f.respuesta.status.mock.callCount(), 0);
  assert.deepEqual(f.respuesta.json.mock.calls[0].arguments, [resultado]);
});

test('Pagos, controlador: una refinanciación rechazada por validación mantiene el estado 400', async () => {
  const resultado = { success: false, message: 'Pago no encontrado' };
  const f = crearContexto(async () => resultado);
  await f.controlador.refinanciarPago(f.solicitud, f.respuesta);
  assert.deepEqual(f.respuesta.status.mock.calls[0].arguments, [400]);
  assert.deepEqual(f.respuesta.json.mock.calls[0].arguments, [resultado]);
});

for (const caso of [{ nombre: 'conflicto de refinanciación', statusCode: 409 }, { nombre: 'error inesperado', statusCode: undefined }]) {
  test(`Pagos, controlador: un ${caso.nombre} conserva el estado HTTP correspondiente`, async () => {
    const error = Object.assign(new Error('Falla simulada de refinanciación'), { statusCode: caso.statusCode });
    const f = crearContexto(async () => { throw error; });
    await f.controlador.refinanciarPago(f.solicitud, f.respuesta);
    assert.deepEqual(f.respuesta.status.mock.calls[0].arguments, [caso.statusCode || 500]);
    assert.deepEqual(f.respuesta.json.mock.calls[0].arguments, [{
      success: false, message: 'Error al refinanciar el pago', error: 'Falla simulada de refinanciación'
    }]);
  });
}
