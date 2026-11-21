const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('../test-support/loadModule');

mock.method(console, 'error', () => {});

function cargarRepositorio(nombre, query) {
  return loadModule(`src/repositories/${nombre}.js`, {
    '../config/db': { query }, '../utils/fecha': {}
  });
}

test('Repositorios de recepción: la orden y el ítem se leen con bloqueos y la misma conexión', async () => {
  const conexion = { nombre: 'conexión de recepción' };
  const orden = Object.freeze({ id: 1, codigo: 'OC-1', estado: 'En Proceso', contrafactura: 0 });
  const items = [{ id: 4, bien_id: 2, cantidad_recibida: '3.00', precio_unitario: 10 }];
  let consultas = 0;
  const query = mock.fn(async (sql, parametros, recibida) => {
    assert.equal(recibida, conexion);
    assert.match(sql, /FOR UPDATE/);
    if (consultas++ === 0) {
      assert.match(sql, /FROM ordenes_compra WHERE id = \?/);
      assert.deepEqual(parametros, [1]);
      return [orden];
    }
    assert.match(sql, /FROM ordenes_compra_items WHERE orden_compra_id = \? AND id = \?/);
    assert.deepEqual(parametros, [1, 4]);
    return items;
  });
  const repositorio = cargarRepositorio('ordenCompraRepository', query);
  assert.deepEqual(await repositorio.obtenerParaRecepcion(1, 4, conexion), { ...orden, items });
  assert.equal(query.mock.callCount(), 2);
});

test('Repositorios de recepción: una orden inexistente evita consultar los ítems', async () => {
  const query = mock.fn(async () => []);
  const repositorio = cargarRepositorio('ordenCompraRepository', query);
  assert.equal(await repositorio.obtenerParaRecepcion(1, 4, {}), null);
  assert.equal(query.mock.callCount(), 1);
});

test('Repositorios de recepción: un ítem ajeno no aparece entre los datos bloqueados de la orden', async () => {
  let consultas = 0;
  const query = mock.fn(async () => consultas++ === 0 ? [{ id: 1, estado: 'En Proceso' }] : []);
  const repositorio = cargarRepositorio('ordenCompraRepository', query);
  assert.deepEqual(await repositorio.obtenerParaRecepcion(1, 4, {}), { id: 1, estado: 'En Proceso', items: [] });
});

test('Repositorios de recepción: la actualización de cantidad utiliza la conexión compartida', async () => {
  const query = mock.fn(async () => ({ affectedRows: 1 }));
  const conexion = { nombre: 'conexión de recepción' };
  const repositorio = cargarRepositorio('ordenCompraRepository', query);
  assert.equal(await repositorio.actualizarCantidadRecibida(4, 5, conexion), true);
  assert.deepEqual(query.mock.calls[0].arguments, [
    'UPDATE ordenes_compra_items SET cantidad_recibida = ? WHERE id = ?', [5, 4], conexion
  ]);
});

test('Repositorios de recepción: consultar el proveedor del ítem conserva filtros y conexión', async () => {
  const item = { item_id: 4, bien_id: 2, proveedor_sugerido_id: 7 };
  const query = mock.fn(async () => [item]);
  const conexion = { nombre: 'conexión de recepción' };
  const repositorio = cargarRepositorio('ordenCompraRepository', query);
  assert.equal(await repositorio.obtenerProveedorDeItem(1, 4, conexion), item);
  const [sql, parametros, recibida] = query.mock.calls[0].arguments;
  assert.match(sql, /WHERE oci.orden_compra_id = \?\s+AND oci.id = \?/);
  assert.deepEqual(parametros, [1, 4]);
  assert.equal(recibida, conexion);
});

test('Repositorios de recepción: consultar el precio del proveedor usa la conexión compartida', async () => {
  const precio = { bien_id: 2, proveedor_id: 7, precio: '10.50', moneda: 'ARS' };
  const query = mock.fn(async () => [precio]);
  const conexion = { nombre: 'conexión de recepción' };
  const repositorio = cargarRepositorio('bienProveedorRepository', query);
  assert.equal(await repositorio.obtenerPrecioProveedorBien(2, 7, conexion), precio);
  const [sql, parametros, recibida] = query.mock.calls[0].arguments;
  assert.match(sql, /WHERE bp.bien_id = \?\s+AND bp.proveedor_id = \?/);
  assert.deepEqual(parametros, [2, 7]);
  assert.equal(recibida, conexion);
});

test('Repositorios de recepción: el pago se inserta por la conexión compartida sin usar otra del pool', async () => {
  const query = mock.fn(() => { throw new Error('No debe utilizarse otra conexión'); });
  const conexion = { query: mock.fn(async () => [{ insertId: 8 }]) };
  const repositorio = cargarRepositorio('pagoRepository', query);
  assert.deepEqual(await repositorio.registrarPagoRecepcion({
    ordenCompraId: 1, bienId: 2, proveedorId: 7, cantidadRecibida: 2, precioUnitario: 10.5,
    montoPago: 21, fechaPago: '2026-11-26', registradoPor: 'operador', moneda: 'ARS',
    medioPago: 'Transferencia', connection: conexion
  }), { id: 8 });
  assert.equal(query.mock.callCount(), 0);
  assert.match(conexion.query.mock.calls[0].arguments[0], /INSERT INTO pagos/);
  assert.deepEqual(conexion.query.mock.calls[0].arguments[1], [
    1, 2, 7, 2, 10.5, 21, 'ARS', 'Transferencia', '2026-11-26', 'operador', null
  ]);
});

for (const caso of [
  { nombre: 'cantidad recibida', repositorio: 'ordenCompraRepository', metodo: 'actualizarCantidadRecibida', argumentos: [4, 5] },
  { nombre: 'proveedor del ítem', repositorio: 'ordenCompraRepository', metodo: 'obtenerProveedorDeItem', argumentos: [1, 4] },
  { nombre: 'precio del proveedor', repositorio: 'bienProveedorRepository', metodo: 'obtenerPrecioProveedorBien', argumentos: [2, 7] }
]) {
  test(`Repositorios de recepción: ${caso.nombre} mantiene compatible la llamada sin conexión`, async () => {
    const query = mock.fn(async () => []);
    const repositorio = cargarRepositorio(caso.repositorio, query);
    await repositorio[caso.metodo](...caso.argumentos);
    assert.equal(query.mock.calls[0].arguments[2], null);
  });
  test(`Repositorios de recepción: un fallo en ${caso.nombre} conserva el error original`, async () => {
    const error = new Error('Falla simulada del repositorio');
    const query = mock.fn(async () => { throw error; });
    const repositorio = cargarRepositorio(caso.repositorio, query);
    await assert.rejects(repositorio[caso.metodo](...caso.argumentos, {}), recibido => recibido === error);
  });
}

test('Repositorios de recepción: un fallo al bloquear el ítem se propaga sin devolver una orden incompleta', async () => {
  const error = new Error('Falla simulada al bloquear el ítem');
  let consultas = 0;
  const query = mock.fn(async () => {
    if (consultas++ === 0) return [{ id: 1 }];
    throw error;
  });
  const repositorio = cargarRepositorio('ordenCompraRepository', query);
  await assert.rejects(repositorio.obtenerParaRecepcion(1, 4, {}), recibido => recibido === error);
});
