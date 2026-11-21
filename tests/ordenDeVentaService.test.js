const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio, simularTransaccion } = require('../test-support/serviceUnit');
mock.method(console, 'error', () => {});

function crearContexto() {
  const { conexion, db } = simularTransaccion();
  const orden = { fecha: '2026-01-01', cliente: 'Cliente', cliente_final: 'Final', codigo_venta: 'OV-1', observaciones: 'Original', estado: 'abierta' };
  const repositorio = {
    crearOrdenVenta: mock.fn(async () => 42), agregarDetalleOrden: mock.fn(async () => {}),
    obtenerPorId: mock.fn(async () => orden), actualizarDatosOrden: mock.fn(async () => {}),
    eliminarDetallesOrden: mock.fn(async () => {}), agregarDetalleConCantidadInicial: mock.fn(async () => {})
  };
  const servicio = cargarServicio('ordenDeVentaService', { '../config/db': db, '../repositories/ordenDeVentaRepository': repositorio });
  return { servicio, repositorio, conexion, db, orden };
}
const datos = { fecha: '2026-01-01', cliente: 'Cliente', productosYCantidades: [{ producto: 'Polvo', cantidad: 10 }, { producto: 'Infill', cantidad: 2.5 }] };

test('Ventas: crea la cabecera y los detalles con una misma conexión simulada', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.crearOrdenDeVenta(datos), { success: true, codigo: 42 });
  assert.equal(f.repositorio.crearOrdenVenta.mock.calls[0].arguments.at(-1), f.conexion);
  assert.deepEqual(f.repositorio.agregarDetalleOrden.mock.calls.map(llamada => llamada.arguments), [[42, 'Polvo', 10, f.conexion], [42, 'Infill', 2.5, f.conexion]]);
});

test('Ventas: los datos incompletos se rechazan antes de iniciar la operación', async () => {
  const f = crearContexto();
  for (const cambio of [{ fecha: null }, { cliente: '' }, { productosYCantidades: [] }, { productosYCantidades: null }]) {
    await assert.rejects(f.servicio.crearOrdenDeVenta({ ...datos, ...cambio }), /Datos incompletos/);
  }
  assert.equal(f.db.withTransaction.mock.callCount(), 0);
});

test('Ventas: una falla de detalle impide devolver una creación exitosa', async () => {
  const f = crearContexto();
  f.repositorio.agregarDetalleOrden.mock.mockImplementation(async () => { throw new Error('Falló el detalle'); });
  await assert.rejects(f.servicio.crearOrdenDeVenta(datos), /Falló el detalle/);
  assert.equal(f.repositorio.agregarDetalleOrden.mock.callCount(), 1);
});

test('Ventas: editar conserva los campos omitidos y reemplaza las líneas recibidas', async () => {
  const f = crearContexto();
  await f.servicio.actualizarOrden(42, { observaciones: '', productos: [{ producto: 'Nuevo', cantidad: 3, cantidad_inicial: 5 }] });
  assert.deepEqual(f.repositorio.actualizarDatosOrden.mock.calls[0].arguments, [42, { ...f.orden, observaciones: '' }, f.conexion]);
  assert.deepEqual(f.repositorio.eliminarDetallesOrden.mock.calls[0].arguments, [42, f.conexion]);
  assert.deepEqual(f.repositorio.agregarDetalleConCantidadInicial.mock.calls[0].arguments, [42, 'Nuevo', 3, 5, f.conexion]);
});

test('Ventas: editar una orden inexistente evita cualquier escritura', async () => {
  const f = crearContexto();
  f.repositorio.obtenerPorId.mock.mockImplementation(async () => null);
  await assert.rejects(f.servicio.actualizarOrden(42, {}), /no encontrada/);
  assert.equal(f.repositorio.actualizarDatosOrden.mock.callCount(), 0);
});

test('Ventas: una falla al reemplazar detalles se comunica al llamador', async () => {
  const f = crearContexto();
  f.repositorio.agregarDetalleConCantidadInicial.mock.mockImplementation(async () => { throw new Error('Falló el reemplazo'); });
  await assert.rejects(f.servicio.actualizarOrden(42, { productos: [{ producto: 'Nuevo', cantidad: 3 }] }), /Falló el reemplazo/);
});

test('Ventas: consultar por identificador devuelve la orden o informa que no existe', async () => {
  const f = crearContexto();
  assert.equal(await f.servicio.obtenerOrdenPorId(42), f.orden);
  f.repositorio.obtenerPorId.mock.mockImplementation(async () => null);
  await assert.rejects(f.servicio.obtenerOrdenPorId(42), /no encontrada/);
});
