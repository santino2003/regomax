const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('../test-support/loadModule');

function crearContexto() {
  const historial = { registrarAccion: mock.fn(async () => true) };
  const middleware = loadModule('src/middleware/historialMiddleware.js', {
    '../services/historialService': historial, '../utils/fecha': {}
  });
  const solicitud = { params: { id: '9' }, user: { username: 'operador' }, body: {
    cuotas: [{ numeroCuota: 1, fecha: '2026-11-26', monto: 100 }], observacionesGenerales: 'Acuerdo'
  } };
  const respuesta = { statusCode: 200, json: mock.fn(), send: mock.fn(), render: mock.fn() };
  return { historial, solicitud, respuesta, middleware: middleware.pago.refinanciar() };
}

test('Historial de refinanciación: conserva orden, proveedor y tipo del original y de las cuotas generadas', async () => {
  const f = crearContexto();
  await f.middleware(f.solicitud, f.respuesta, () => {});
  f.respuesta.json({ success: true, message: 'Pago refinanciado', data: {
    pagoOriginal: { pagado: 0, monto_pago: 100, fecha_pago: '2026-11-21', tipo_pago: 'SALDO_COMPLETO',
      orden_compra_id: 11, orden_codigo: 'OC-11', proveedor_id: 7, proveedor_nombre: 'Proveedor 7' },
    cuotasCreadas: [{ orden_compra_id: 11, orden_codigo: 'OC-11', proveedor_id: 7, proveedor_nombre: 'Proveedor 7',
      tipo_pago: 'SALDO_COMPLETO', fecha_pago: '2026-11-26', monto_pago: 100, pagado: false }]
  } });
  assert.equal(f.historial.registrarAccion.mock.callCount(), 1);
  const [usuario, accion, entidad, detalles] = f.historial.registrarAccion.mock.calls[0].arguments;
  assert.deepEqual([usuario, accion, entidad], ['operador', 'refinanciar', 'pago']);
  assert.deepEqual(detalles.estado_anterior, { pagado: false, monto_original: 100, fecha_pago_original: '2026-11-21',
    tipo_pago_original: 'SALDO_COMPLETO', orden_compra_id: 11, orden: 'OC-11', proveedor_id: 7, proveedor: 'Proveedor 7', servicio_id: null });
  assert.deepEqual(detalles.cuotas_generadas, [{ orden: 'OC-11', orden_compra_id: 11, proveedor: 'Proveedor 7', proveedor_id: 7,
    servicio_id: null, fecha: '2026-11-26', monto: 100, tipo_pago: 'SALDO_COMPLETO', pagado: false }]);
});

test('Historial de refinanciación: un servicio conserva su identificador y admite cuotas con los nombres anteriores de fecha y monto', async () => {
  const f = crearContexto();
  await f.middleware(f.solicitud, f.respuesta, () => {});
  f.respuesta.json({ success: true, data: {
    pagoOriginal: { pagado: 0, monto_pago: 100, tipo_pago: 'SERVICIO', servicio_id: 5 },
    cuotasCreadas: [{ tipo_pago: 'SERVICIO', servicio_id: 5, fecha: '2026-11-26', monto: 100 }]
  } });
  const detalles = f.historial.registrarAccion.mock.calls[0].arguments[3];
  assert.equal(detalles.estado_anterior.servicio_id, 5);
  assert.deepEqual(detalles.cuotas_generadas, [{ orden: null, orden_compra_id: null, proveedor: null, proveedor_id: null,
    servicio_id: 5, fecha: '2026-11-26', monto: 100, tipo_pago: 'SERVICIO', pagado: false }]);
});
