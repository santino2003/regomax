const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('../test-support/loadModule');

mock.method(console, 'error', () => {});

function crearContexto(reemplazos = {}) {
  const repositorio = {
    crearAlmacen: mock.fn(async () => true),
    modificarAlmacen: mock.fn(async () => true),
    eliminarAlmacen: mock.fn(async () => true),
    obtenerTodos: mock.fn(async () => ({ data: [], pagination: {} })),
    obtenerPorId: mock.fn(async () => null),
    ...reemplazos
  };
  const servicio = loadModule('src/services/almacenService.js', {
    '../repositories/almacenRepository': repositorio
  });
  return { servicio, repositorio };
}

test('Almacenes: crear normaliza el nombre, conserva el responsable y no modifica los datos recibidos', async () => {
  const { servicio, repositorio } = crearContexto();
  const datos = { nombre: '  Depósito central  ', responsable: 'operador' };
  const resultado = await servicio.crearAlmacen(datos);
  assert.deepEqual(resultado, { success: true, message: 'Almacén creado exitosamente' });
  assert.equal(repositorio.crearAlmacen.mock.callCount(), 1);
  assert.deepEqual(repositorio.crearAlmacen.mock.calls[0].arguments, ['Depósito central', 'operador']);
  assert.equal(datos.nombre, '  Depósito central  ');
});

test('Almacenes: crear rechaza nombres ausentes o vacíos antes de llamar al repositorio', async () => {
  const { servicio, repositorio } = crearContexto();
  for (const nombre of [undefined, null, '', '   ', '\t\n']) {
    await assert.rejects(servicio.crearAlmacen({ nombre, responsable: 'operador' }), {
      message: 'El nombre del almacén es obligatorio'
    });
  }
  assert.equal(repositorio.crearAlmacen.mock.callCount(), 0);
});

test('Almacenes: modificar envía el identificador y el nombre sin espacios externos', async () => {
  const { servicio, repositorio } = crearContexto();
  const resultado = await servicio.modificarAlmacen(12, ' \tDepósito actualizado\n ');
  assert.deepEqual(resultado, { success: true, message: 'Almacén modificado exitosamente' });
  assert.equal(repositorio.modificarAlmacen.mock.callCount(), 1);
  assert.deepEqual(repositorio.modificarAlmacen.mock.calls[0].arguments, [12, 'Depósito actualizado']);
});

test('Almacenes: modificar rechaza nombres ausentes o vacíos antes de llamar al repositorio', async () => {
  const { servicio, repositorio } = crearContexto();
  for (const nombre of [undefined, null, '', '   ', '\t\n']) {
    await assert.rejects(servicio.modificarAlmacen(12, nombre), {
      message: 'El nombre del almacén es obligatorio'
    });
  }
  assert.equal(repositorio.modificarAlmacen.mock.callCount(), 0);
});

test('Almacenes: eliminar solicita únicamente el identificador indicado y confirma el resultado', async () => {
  const { servicio, repositorio } = crearContexto();
  assert.deepEqual(await servicio.eliminarAlmacen(12), {
    success: true, message: 'Almacén eliminado exitosamente'
  });
  assert.equal(repositorio.eliminarAlmacen.mock.callCount(), 1);
  assert.deepEqual(repositorio.eliminarAlmacen.mock.calls[0].arguments, [12]);
});

test('Almacenes: listar usa la primera página y un límite de diez cuando se omiten los parámetros', async () => {
  const listado = { data: [{ id: 12, nombre: 'Depósito central' }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } };
  const { servicio, repositorio } = crearContexto({ obtenerTodos: mock.fn(async () => listado) });
  assert.equal(await servicio.obtenerTodos(), listado);
  assert.deepEqual(repositorio.obtenerTodos.mock.calls[0].arguments, [1, 10]);
});

test('Almacenes: listar conserva la página, el límite y los datos de paginación del repositorio', async () => {
  const listado = { data: [{ id: 12, nombre: 'Depósito central' }], pagination: { page: 3, limit: 5, total: 13, totalPages: 3 } };
  const { servicio, repositorio } = crearContexto({ obtenerTodos: mock.fn(async () => listado) });
  assert.equal(await servicio.obtenerTodos(3, 5), listado);
  assert.equal(repositorio.obtenerTodos.mock.callCount(), 1);
  assert.deepEqual(repositorio.obtenerTodos.mock.calls[0].arguments, [3, 5]);
});

test('Almacenes: listar devuelve un resultado vacío con su paginación sin tratarlo como un error', async () => {
  const listado = { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  const { servicio } = crearContexto({ obtenerTodos: mock.fn(async () => listado) });
  assert.deepEqual(await servicio.obtenerTodos(), listado);
});

test('Almacenes: buscar por identificador devuelve todos los datos encontrados', async () => {
  const almacen = { id: 12, nombre: 'Depósito central', responsable: 'operador' };
  const { servicio, repositorio } = crearContexto({ obtenerPorId: mock.fn(async () => almacen) });
  assert.equal(await servicio.obtenerPorId(12), almacen);
  assert.equal(repositorio.obtenerPorId.mock.callCount(), 1);
  assert.deepEqual(repositorio.obtenerPorId.mock.calls[0].arguments, [12]);
});

test('Almacenes: buscar informa que el almacén no existe cuando el repositorio no encuentra un registro', async () => {
  for (const resultado of [null, undefined]) {
    const { servicio, repositorio } = crearContexto({ obtenerPorId: mock.fn(async () => resultado) });
    await assert.rejects(servicio.obtenerPorId(12), { message: 'Almacén no encontrado' });
    assert.equal(repositorio.obtenerPorId.mock.callCount(), 1);
  }
});

for (const caso of [
  { nombre: 'crear', metodo: 'crearAlmacen', argumentos: [{ nombre: 'Depósito central', responsable: 'operador' }] },
  { nombre: 'modificar', metodo: 'modificarAlmacen', argumentos: [12, 'Depósito actualizado'] },
  { nombre: 'eliminar', metodo: 'eliminarAlmacen', argumentos: [12] },
  { nombre: 'listar', metodo: 'obtenerTodos', argumentos: [1, 10] },
  { nombre: 'buscar por identificador', metodo: 'obtenerPorId', argumentos: [12] }
]) {
  test(`Almacenes: ${caso.nombre} propaga el error original del repositorio sin informar éxito`, async () => {
    const error = Object.assign(new Error('Falla simulada del repositorio'), { code: 'ERROR_SIMULADO' });
    const { servicio, repositorio } = crearContexto({ [caso.metodo]: mock.fn(async () => { throw error; }) });
    await assert.rejects(servicio[caso.metodo](...caso.argumentos), recibido => recibido === error);
    assert.equal(repositorio[caso.metodo].mock.callCount(), 1);
  });
}
