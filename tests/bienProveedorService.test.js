const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

mock.method(console, 'error', () => {});

function crearContexto(reemplazos = {}) {
  const repositorio = Object.fromEntries([
    'crearAsociaciones', 'editarAsociaciones', 'obtenerBienesPorProveedor',
    'obtenerPrecioProveedorBien', 'obtenerHistorialPorBien', 'obtenerHistorialPorProveedor'
  ].map(metodo => [metodo, mock.fn(async () => [])]));
  Object.assign(repositorio, reemplazos);
  const servicio = cargarServicio('bienProveedorService', {
    '../repositories/bienProveedorRepository': repositorio
  });
  return { servicio, repositorio };
}

const operaciones = [
  { nombre: 'crear', servicio: 'crearAsociacionesProveedores', repositorio: 'crearAsociaciones', mensaje: 'Se crearon 2 asociaciones con proveedores' },
  { nombre: 'editar', servicio: 'editarAsociacionesProveedores', repositorio: 'editarAsociaciones', mensaje: 'Se actualizaron las asociaciones: 2 proveedores' }
];

for (const operacion of operaciones) {
  test(`Bienes y proveedores: ${operacion.nombre} conserva los precios, las monedas y las tuplas recibidas`, async () => {
    const proveedores = Object.freeze([Object.freeze([2, 0, 'ARS']), Object.freeze([3, 12.75, 'USD'])]);
    const asociaciones = [{ proveedor_id: 2, precio: 0, moneda: 'ARS' }, { proveedor_id: 3, precio: 12.75, moneda: 'USD' }];
    const f = crearContexto({ [operacion.repositorio]: mock.fn(async () => asociaciones) });
    const resultado = await f.servicio[operacion.servicio](1, proveedores);
    assert.deepEqual(resultado, { success: true, message: operacion.mensaje, data: asociaciones });
    assert.equal(resultado.data, asociaciones);
    const dependencia = f.repositorio[operacion.repositorio];
    assert.equal(dependencia.mock.callCount(), 1);
    assert.deepEqual(dependencia.mock.calls[0].arguments, [1, proveedores]);
    assert.equal(dependencia.mock.calls[0].arguments[1], proveedores);
  });

  test(`Bienes y proveedores: ${operacion.nombre} con una lista vacía evita modificar el historial`, async () => {
    const f = crearContexto();
    const resultado = await f.servicio[operacion.servicio](1, []);
    assert.deepEqual(resultado, {
      success: true,
      message: operacion.nombre === 'crear'
        ? 'No hay proveedores para asociar'
        : 'No se informaron proveedores; se mantiene el historial existente',
      data: []
    });
    assert.equal(f.repositorio[operacion.repositorio].mock.callCount(), 0);
  });

  test(`Bienes y proveedores: ${operacion.nombre} valida todo el lote antes de delegar una tupla mal formada`, async () => {
    const f = crearContexto();
    for (const invalido of [null, {}, 'proveedor', [], [3, 10], [3, 10, 'ARS', 'extra']]) {
      await assert.rejects(f.servicio[operacion.servicio](1, [[2, 10, 'ARS'], invalido]), {
        message: 'El proveedor en posición 1 debe ser una tupla [id, precio, moneda]'
      });
    }
    assert.equal(f.repositorio[operacion.repositorio].mock.callCount(), 0);
  });

  test(`Bienes y proveedores: ${operacion.nombre} rechaza los datos incompletos antes de guardar asociaciones`, async () => {
    const f = crearContexto();
    for (const tupla of [[null, 10, 'ARS'], [0, 10, 'ARS'], [2, null, 'ARS'], [2, undefined, 'ARS'], [2, 10, ''], [2, 10, null]]) {
      await assert.rejects(f.servicio[operacion.servicio](1, [[3, 5, 'USD'], tupla]), {
        message: 'Datos incompletos en proveedor 1: se requiere id, precio y moneda'
      });
    }
    assert.equal(f.repositorio[operacion.repositorio].mock.callCount(), 0);
  });
}

test('Bienes y proveedores: crear sin una lista devuelve que no hay proveedores para asociar', async () => {
  const f = crearContexto();
  for (const proveedores of [undefined, null, {}, 'proveedores']) {
    assert.deepEqual(await f.servicio.crearAsociacionesProveedores(1, proveedores), {
      success: true, message: 'No hay proveedores para asociar', data: []
    });
  }
  assert.equal(f.repositorio.crearAsociaciones.mock.callCount(), 0);
});

test('Bienes y proveedores: editar exige una lista para preservar la intención de la operación', async () => {
  const f = crearContexto();
  for (const proveedores of [undefined, null, {}, 'proveedores']) {
    await assert.rejects(f.servicio.editarAsociacionesProveedores(1, proveedores), {
      message: 'Los proveedores deben ser un array'
    });
  }
  assert.equal(f.repositorio.editarAsociaciones.mock.callCount(), 0);
});

test('Bienes y proveedores: consultar bienes conserva los resultados y admite un listado vacío', async () => {
  for (const bienes of [[{ id: 1, nombre: 'Tornillo', precio: '12.75', moneda: 'ARS' }], []]) {
    const f = crearContexto({ obtenerBienesPorProveedor: mock.fn(async () => bienes) });
    const resultado = await f.servicio.obtenerBienesPorProveedor(2);
    assert.deepEqual(resultado, { success: true, data: bienes });
    assert.equal(resultado.data, bienes);
    assert.deepEqual(f.repositorio.obtenerBienesPorProveedor.mock.calls[0].arguments, [2]);
  }
});

test('Bienes y proveedores: consultar el precio conserva su moneda y admite un precio igual a cero', async () => {
  const precio = { bien_id: 1, proveedor_id: 2, precio: 0, moneda: 'ARS' };
  const f = crearContexto({ obtenerPrecioProveedorBien: mock.fn(async () => precio) });
  const resultado = await f.servicio.obtenerPrecioProveedorBien(1, 2);
  assert.deepEqual(resultado, { success: true, data: precio });
  assert.equal(resultado.data, precio);
  assert.deepEqual(f.repositorio.obtenerPrecioProveedorBien.mock.calls[0].arguments, [1, 2]);
});

test('Bienes y proveedores: consultar el precio exige ambos identificadores antes de llamar al repositorio', async () => {
  const f = crearContexto();
  for (const faltante of [undefined, null, 0, '']) {
    await assert.rejects(f.servicio.obtenerPrecioProveedorBien(faltante, 2), { message: 'El ID del bien y del proveedor son requeridos' });
    await assert.rejects(f.servicio.obtenerPrecioProveedorBien(1, faltante), { message: 'El ID del bien y del proveedor son requeridos' });
  }
  assert.equal(f.repositorio.obtenerPrecioProveedorBien.mock.callCount(), 0);
});

test('Bienes y proveedores: consultar un precio inexistente informa que no hay información', async () => {
  for (const precio of [null, undefined]) {
    const f = crearContexto({ obtenerPrecioProveedorBien: mock.fn(async () => precio) });
    await assert.rejects(f.servicio.obtenerPrecioProveedorBien(1, 2), {
      message: 'No se encontró información de precio para este bien y proveedor'
    });
    assert.equal(f.repositorio.obtenerPrecioProveedorBien.mock.callCount(), 1);
  }
});

for (const entidad of ['Bien', 'Proveedor']) {
  const metodo = `obtenerHistorialPor${entidad}`;
  const mensaje = entidad === 'Bien' ? 'El ID del bien es requerido' : 'El ID del proveedor es requerido';

  test(`Bienes y proveedores: el historial por ${entidad.toLowerCase()} conserva los registros y su orden`, async () => {
    const historial = [{ id: 20, precio: '15.50', moneda: 'USD' }, { id: 10, precio: '12.75', moneda: 'ARS' }];
    const f = crearContexto({ [metodo]: mock.fn(async () => historial) });
    const resultado = await f.servicio[metodo](1);
    assert.deepEqual(resultado, { success: true, data: historial });
    assert.equal(resultado.data, historial);
    assert.deepEqual(f.repositorio[metodo].mock.calls[0].arguments, [1]);
  });

  test(`Bienes y proveedores: el historial por ${entidad.toLowerCase()} admite que todavía no haya precios`, async () => {
    const f = crearContexto();
    assert.deepEqual(await f.servicio[metodo](1), { success: true, data: [] });
  });

  test(`Bienes y proveedores: el historial por ${entidad.toLowerCase()} exige un identificador`, async () => {
    const f = crearContexto();
    for (const id of [undefined, null, 0, '']) await assert.rejects(f.servicio[metodo](id), { message: mensaje });
    assert.equal(f.repositorio[metodo].mock.callCount(), 0);
  });
}

for (const caso of [
  { metodo: 'crearAsociacionesProveedores', dependencia: 'crearAsociaciones', argumentos: [1, [[2, 10, 'ARS']]] },
  { metodo: 'editarAsociacionesProveedores', dependencia: 'editarAsociaciones', argumentos: [1, [[2, 10, 'ARS']]] },
  { metodo: 'obtenerBienesPorProveedor', argumentos: [2] },
  { metodo: 'obtenerPrecioProveedorBien', argumentos: [1, 2] },
  { metodo: 'obtenerHistorialPorBien', argumentos: [1] },
  { metodo: 'obtenerHistorialPorProveedor', argumentos: [2] }
]) {
  test(`Bienes y proveedores: ${caso.metodo} propaga el error original del repositorio`, async () => {
    const dependencia = caso.dependencia || caso.metodo;
    const error = Object.assign(new Error('Falla simulada del repositorio'), { code: 'ERROR_SIMULADO' });
    const f = crearContexto({ [dependencia]: mock.fn(async () => { throw error; }) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), recibido => recibido === error);
    assert.equal(f.repositorio[dependencia].mock.callCount(), 1);
  });
}
