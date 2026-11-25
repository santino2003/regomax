const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');
const { withTransaction } = require('../src/utils/transaction');
mock.method(console, 'error', () => {});

function crearContexto(cambios = {}) {
  const eventos = [];
  const conexion = Object.fromEntries(['beginTransaction', 'commit', 'rollback', 'release', 'destroy']
    .map(metodo => [metodo, mock.fn(async () => { eventos.push(metodo); })]));
  const pool = { getConnection: mock.fn(async () => conexion) };
  // El ciclo de la transacción es real; la conexión y las operaciones de datos se simulan.
  const db = { withTransaction: mock.fn(tarea => withTransaction(pool, tarea)) };
  const orden = {
    id: 1, estado: 'En Proceso', codigo: 'OC-1', contrafactura: false,
    items: [{ id: 1, bien_id: 2, cantidad_recibida: 3, precio_unitario: 3.5 }], ...cambios.orden
  };
  const repositorio = {
    obtenerParaRecepcion: mock.fn(async () => { eventos.push('leer con bloqueo'); return orden; }),
    actualizarCantidadRecibida: mock.fn(async () => { eventos.push('actualizar recepción'); }), ...cambios.repositorio
  };
  const cambio = { item: { codigo: 'B1', nombre: 'Bien', almacen_defecto_id: 8 }, stock_anterior: 10, stock_nuevo: 12 };
  const bienes = {
    incrementarStock: mock.fn(async () => { eventos.push('incrementar stock'); return cambio; }), ...cambios.bienes
  };
  const pagos = {
    registrarPagoPorRecepcion: mock.fn(async () => { eventos.push('registrar pago'); return { success: true }; }), ...cambios.pagos
  };
  const movimientos = { registrarAjuste: mock.fn(async () => { eventos.push('registrar movimiento'); }), ...cambios.movimientos };
  const servicio = cargarServicio('ordenCompraService', {
    '../config/db': db, '../repositories/ordenCompraRepository': repositorio,
    './bienService': bienes, './pagosService': pagos, '../repositories/ajusteInventarioRepository': movimientos
  });
  return { servicio, conexion, pool, db, orden, cambio, repositorio, bienes, pagos, movimientos, eventos };
}

function comprobarSinEscrituras(f) {
  assert.equal(f.repositorio.actualizarCantidadRecibida.mock.callCount(), 0);
  assert.equal(f.pagos.registrarPagoPorRecepcion.mock.callCount(), 0);
  assert.equal(f.bienes.incrementarStock.mock.callCount(), 0);
  assert.equal(f.movimientos.registrarAjuste.mock.callCount(), 0);
}

test('Compras: cantidad recibida, pago, stock y movimiento comparten una única transacción', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.actualizarCantidadRecibida(1, 1, 5, 'operador'), {
    success: true, message: 'Cantidad recibida actualizada exitosamente', warning: undefined
  });
  assert.deepEqual(f.repositorio.obtenerParaRecepcion.mock.calls[0].arguments, [1, 1, f.conexion]);
  assert.deepEqual(f.repositorio.actualizarCantidadRecibida.mock.calls[0].arguments, [1, 5, f.conexion]);
  assert.deepEqual(f.pagos.registrarPagoPorRecepcion.mock.calls[0].arguments, [1, 1, 2, 'operador', f.conexion]);
  assert.deepEqual(f.bienes.incrementarStock.mock.calls[0].arguments, [2, 2, f.conexion]);
  const [movimiento, conexion] = f.movimientos.registrarAjuste.mock.calls[0].arguments;
  assert.equal(conexion, f.conexion);
  assert.deepEqual({ ...movimiento, fecha: undefined }, {
    tipo_movimiento: 'ENTRADA', tipo_item: 'bien', item_id: 2, codigo: 'B1', nombre: 'Bien', cantidad: 2,
    stock_anterior: 10, stock_nuevo: 12, almacen_id: 8, precio_unitario: 3.5, cliente: null,
    responsable: 'operador', usuario_sistema: 'operador', fecha: undefined, observaciones: 'Recepción de Orden de Compra OC-1'
  });
  assert.ok(movimiento.fecha instanceof Date);
  assert.equal(f.db.withTransaction.mock.callCount(), 1);
  assert.deepEqual(f.eventos, ['beginTransaction', 'leer con bloqueo', 'actualizar recepción', 'registrar pago',
    'incrementar stock', 'registrar movimiento', 'commit', 'release']);
});

test('Compras: una recepción a contrafactura actualiza stock sin generar otro pago por recepción', async () => {
  const f = crearContexto({ orden: { contrafactura: 1 } });
  assert.equal((await f.servicio.actualizarCantidadRecibida(1, 1, 5, 'operador')).success, true);
  assert.equal(f.pagos.registrarPagoPorRecepcion.mock.callCount(), 0);
  assert.equal(f.bienes.incrementarStock.mock.callCount(), 1);
  assert.equal(f.conexion.commit.mock.callCount(), 1);
});

test('Compras: repetir una cantidad ya recibida no duplica pagos, stock ni movimientos', async () => {
  const f = crearContexto({ orden: { items: [{ id: 1, bien_id: 2, cantidad_recibida: '5.00' }] } });
  assert.equal((await f.servicio.actualizarCantidadRecibida(1, 1, 5, 'operador')).success, true);
  comprobarSinEscrituras(f);
  assert.deepEqual(f.repositorio.obtenerParaRecepcion.mock.calls[0].arguments, [1, 1, f.conexion]);
  assert.equal(f.conexion.commit.mock.callCount(), 1);
});

test('Compras: recibir una cantidad decimal por primera vez calcula solo el incremento correspondiente', async () => {
  const f = crearContexto({ orden: { items: [{ id: 1, bien_id: 2, cantidad_recibida: null }] } });
  await f.servicio.actualizarCantidadRecibida(1, 1, 0.25);
  assert.deepEqual(f.bienes.incrementarStock.mock.calls[0].arguments, [2, 0.25, f.conexion]);
  assert.deepEqual(f.pagos.registrarPagoPorRecepcion.mock.calls[0].arguments, [1, 1, 0.25, 'sistema', f.conexion]);
});

test('Compras: los avisos de pago manual se conservan y permiten confirmar la recepción completa', async () => {
  const f = crearContexto({ pagos: { registrarPagoPorRecepcion: mock.fn(async () => ({
    success: false, warning: true, requiresManualPayment: true, message: 'Falta configurar el precio del proveedor'
  })) } });
  assert.deepEqual(await f.servicio.actualizarCantidadRecibida(1, 1, 5, 'operador'), {
    success: true, message: 'Cantidad recibida actualizada exitosamente', warning: 'Falta configurar el precio del proveedor'
  });
  assert.equal(f.bienes.incrementarStock.mock.callCount(), 1);
  assert.equal(f.movimientos.registrarAjuste.mock.callCount(), 1);
  assert.equal(f.conexion.commit.mock.callCount(), 1);
  assert.equal(f.conexion.rollback.mock.callCount(), 0);
});

test('Compras: un pago rechazado sin advertencia cancela la recepción antes de cambiar el stock', async () => {
  const f = crearContexto({ pagos: { registrarPagoPorRecepcion: mock.fn(async () => ({ success: false, message: 'Ítem no encontrado' })) } });
  await assert.rejects(f.servicio.actualizarCantidadRecibida(1, 1, 5, 'operador'), { message: 'Ítem no encontrado' });
  assert.equal(f.bienes.incrementarStock.mock.callCount(), 0);
  assert.equal(f.movimientos.registrarAjuste.mock.callCount(), 0);
  assert.equal(f.conexion.commit.mock.callCount(), 0);
  assert.equal(f.conexion.rollback.mock.callCount(), 1);
  assert.equal(f.conexion.release.mock.callCount(), 1);
});

for (const caso of [
  { nombre: 'orden inexistente', cambios: { repositorio: { obtenerParaRecepcion: mock.fn(async () => null) } }, cantidad: 5,
    mensaje: 'La orden de compra no existe' },
  { nombre: 'orden fuera de proceso', cambios: { orden: { estado: 'Cerrada' } }, cantidad: 5,
    mensaje: 'Solo se puede actualizar la cantidad recibida cuando la orden está en estado "En Proceso"' },
  { nombre: 'ítem de otra orden', cambios: { orden: { items: [] } }, cantidad: 5,
    mensaje: 'El item no pertenece a esta orden' },
  { nombre: 'cantidad negativa', cantidad: -1, mensaje: 'La cantidad recibida no puede ser negativa' },
  { nombre: 'cantidad inferior a la ya recibida', cantidad: 2,
    mensaje: 'La cantidad recibida no puede ser menor a la cantidad ya registrada' }
]) {
  test(`Compras: una recepción con ${caso.nombre} no escribe y libera la transacción`, async () => {
    const f = crearContexto(caso.cambios);
    await assert.rejects(f.servicio.actualizarCantidadRecibida(1, 1, caso.cantidad, 'operador'), { message: caso.mensaje });
    comprobarSinEscrituras(f);
    assert.equal(f.conexion.commit.mock.callCount(), 0);
    assert.equal(f.conexion.rollback.mock.callCount(), 1);
    assert.equal(f.conexion.release.mock.callCount(), 1);
  });
}

for (const caso of [
  { grupo: 'repositorio', metodo: 'obtenerParaRecepcion' },
  { grupo: 'repositorio', metodo: 'actualizarCantidadRecibida' },
  { grupo: 'pagos', metodo: 'registrarPagoPorRecepcion' },
  { grupo: 'bienes', metodo: 'incrementarStock' },
  { grupo: 'movimientos', metodo: 'registrarAjuste' }
]) {
  test(`Compras: si falla ${caso.metodo} se revierte toda la recepción y se conserva el error`, async () => {
    const error = new Error('Falla simulada de la recepción');
    const f = crearContexto({ [caso.grupo]: { [caso.metodo]: mock.fn(async () => { throw error; }) } });
    await assert.rejects(f.servicio.actualizarCantidadRecibida(1, 1, 5, 'operador'), recibido => recibido === error);
    assert.equal(f.conexion.commit.mock.callCount(), 0);
    assert.equal(f.conexion.rollback.mock.callCount(), 1);
    assert.equal(f.conexion.release.mock.callCount(), 1);
    assert.equal(f.db.withTransaction.mock.callCount(), 1);
    if (caso.grupo !== 'movimientos') assert.equal(f.movimientos.registrarAjuste.mock.callCount(), 0);
  });
}

test('Compras: después de un fallo de stock el reintento vuelve a procesar la diferencia pendiente', async () => {
  const f = crearContexto();
  const error = new Error('Falla simulada de stock');
  let intentos = 0;
  f.bienes.incrementarStock.mock.mockImplementation(async () => {
    if (intentos++ === 0) throw error;
    return f.cambio;
  });
  // El repositorio simulado vuelve a entregar la cantidad anterior tras la reversión.
  await assert.rejects(f.servicio.actualizarCantidadRecibida(1, 1, 5, 'operador'), recibido => recibido === error);
  assert.equal((await f.servicio.actualizarCantidadRecibida(1, 1, 5, 'operador')).success, true);
  assert.deepEqual(f.bienes.incrementarStock.mock.calls.map(c => c.arguments), [[2, 2, f.conexion], [2, 2, f.conexion]]);
  assert.deepEqual(f.repositorio.actualizarCantidadRecibida.mock.calls.map(c => c.arguments), [[1, 5, f.conexion], [1, 5, f.conexion]]);
  assert.equal(f.pagos.registrarPagoPorRecepcion.mock.callCount(), 2);
  assert.equal(f.movimientos.registrarAjuste.mock.callCount(), 1);
  assert.equal(f.conexion.rollback.mock.callCount(), 1);
  assert.equal(f.conexion.commit.mock.callCount(), 1);
  assert.equal(f.conexion.release.mock.callCount(), 2);
});

test('Compras: si falla la confirmación de la recepción se intenta revertir la operación completa', async () => {
  const f = crearContexto();
  const error = new Error('Falla simulada al confirmar');
  f.conexion.commit.mock.mockImplementation(async () => { throw error; });
  await assert.rejects(f.servicio.actualizarCantidadRecibida(1, 1, 5, 'operador'), recibido => recibido === error);
  assert.equal(f.movimientos.registrarAjuste.mock.callCount(), 1);
  assert.equal(f.conexion.rollback.mock.callCount(), 1);
  assert.equal(f.conexion.release.mock.callCount(), 1);
});
