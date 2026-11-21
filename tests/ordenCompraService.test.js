const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio, simularTransaccion } = require('../test-support/serviceUnit');
mock.method(console, 'error', () => {});

test('Compras: una recepción incrementa únicamente la diferencia recibida y registra su movimiento', async () => {
  const { conexion, db } = simularTransaccion();
  const repositorio = {
    obtenerPorId: mock.fn(async () => ({ estado: 'En Proceso', codigo: 'OC-1', items: [{ id: 1, bien_id: 2, cantidad_recibida: 3 }] })),
    actualizarCantidadRecibida: mock.fn(async () => {}), esContraFactura: mock.fn(async () => true)
  };
  const bienes = { incrementarStock: mock.fn(async () => ({ item: { codigo: 'B1', nombre: 'Bien' }, stock_anterior: 10, stock_nuevo: 12 })) };
  const movimientos = { registrarAjuste: mock.fn(async () => {}) };
  const servicio = cargarServicio('ordenCompraService', {
    '../config/db': db, '../repositories/ordenCompraRepository': repositorio,
    './bienService': bienes, '../repositories/ajusteInventarioRepository': movimientos
  });
  assert.equal((await servicio.actualizarCantidadRecibida(1, 1, 5, 'operador')).success, true);
  assert.deepEqual(bienes.incrementarStock.mock.calls[0].arguments, [2, 2, conexion]);
  const [movimiento, recibida] = movimientos.registrarAjuste.mock.calls[0].arguments;
  assert.equal(recibida, conexion);
  assert.equal(movimiento.cantidad, 2);
  assert.equal(movimiento.stock_anterior, 10);
  assert.equal(movimiento.stock_nuevo, 12);
  assert.equal(movimiento.usuario_sistema, 'operador');
});
