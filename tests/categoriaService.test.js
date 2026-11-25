const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

mock.method(console, 'error', () => {});

function crearContexto(reemplazos = {}) {
  const repositorio = {
    crearCategoria: mock.fn(async () => true),
    modificarCategoria: mock.fn(async () => true),
    eliminarCategoria: mock.fn(async () => true),
    obtenerTodas: mock.fn(async () => ({ data: [], pagination: {} })),
    obtenerPorId: mock.fn(async () => null),
    ...reemplazos
  };
  const servicio = cargarServicio('categoriaService', {
    '../repositories/categoriaRepository': repositorio
  });
  return { servicio, repositorio };
}

test('Categorías: crear normaliza el nombre y conserva el responsable sin modificar los datos originales', async () => {
  const f = crearContexto();
  const datos = Object.freeze({ nombre: '  Repuestos hidráulicos  ', responsable: 'operador' });
  const resultado = await f.servicio.crearCategoria(datos);
  assert.deepEqual(resultado, { success: true, message: 'Categoria creada exitosamente' });
  assert.equal(f.repositorio.crearCategoria.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.crearCategoria.mock.calls[0].arguments, ['Repuestos hidráulicos', 'operador']);
  assert.equal(datos.nombre, '  Repuestos hidráulicos  ');
});

test('Categorías: crear rechaza nombres ausentes o vacíos antes de llamar al repositorio', async () => {
  const f = crearContexto();
  for (const nombre of [undefined, null, '', '   ', '\t\n']) {
    await assert.rejects(f.servicio.crearCategoria({ nombre, responsable: 'operador' }), {
      message: 'El nombre de la categoria es obligatorio'
    });
  }
  assert.equal(f.repositorio.crearCategoria.mock.callCount(), 0);
});

test('Categorías: modificar conserva el identificador y elimina los espacios externos del nombre', async () => {
  const f = crearContexto();
  const resultado = await f.servicio.modificarCategoria(12, ' \tMaterial eléctrico\n ');
  assert.deepEqual(resultado, { success: true, message: 'Categoria modificada exitosamente' });
  assert.equal(f.repositorio.modificarCategoria.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.modificarCategoria.mock.calls[0].arguments, [12, 'Material eléctrico']);
});

test('Categorías: modificar rechaza nombres ausentes o vacíos antes de solicitar una escritura', async () => {
  const f = crearContexto();
  for (const nombre of [undefined, null, '', '   ', '\t\n']) {
    await assert.rejects(f.servicio.modificarCategoria(12, nombre), {
      message: 'El nombre de la categoria es obligatorio'
    });
  }
  assert.equal(f.repositorio.modificarCategoria.mock.callCount(), 0);
});

test('Categorías: eliminar solicita únicamente el identificador indicado y devuelve la confirmación', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.eliminarCategoria(12), {
    success: true, message: 'Categoria eliminada exitosamente'
  });
  assert.equal(f.repositorio.eliminarCategoria.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.eliminarCategoria.mock.calls[0].arguments, [12]);
});

test('Categorías: listar usa la primera página y un límite de diez si se omiten los parámetros', async () => {
  const listado = { data: [{ id: 12, nombre: 'Repuestos' }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } };
  const f = crearContexto({ obtenerTodas: mock.fn(async () => listado) });
  assert.equal(await f.servicio.obtenerTodas(), listado);
  assert.equal(f.repositorio.obtenerTodas.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.obtenerTodas.mock.calls[0].arguments, [1, 10]);
});

test('Categorías: listar respeta la página y el límite solicitados y conserva los metadatos', async () => {
  const listado = { data: [{ id: 12, nombre: 'Repuestos' }], pagination: { page: 3, limit: 5, total: 13, totalPages: 3 } };
  const f = crearContexto({ obtenerTodas: mock.fn(async () => listado) });
  assert.equal(await f.servicio.obtenerTodas(3, 5), listado);
  assert.equal(f.repositorio.obtenerTodas.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.obtenerTodas.mock.calls[0].arguments, [3, 5]);
});

test('Categorías: listar admite un resultado vacío sin transformarlo en un error', async () => {
  const listado = { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  const f = crearContexto({ obtenerTodas: mock.fn(async () => listado) });
  assert.deepEqual(await f.servicio.obtenerTodas(), listado);
});

test('Categorías: buscar por identificador devuelve todos los datos encontrados', async () => {
  const categoria = Object.freeze({ id: 12, nombre: 'Repuestos', responsable: 'operador' });
  const f = crearContexto({ obtenerPorId: mock.fn(async () => categoria) });
  assert.equal(await f.servicio.obtenerPorId(12), categoria);
  assert.equal(f.repositorio.obtenerPorId.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, [12]);
});

test('Categorías: buscar informa que la categoría no existe cuando el repositorio no encuentra un registro', async () => {
  for (const resultado of [null, undefined]) {
    const f = crearContexto({ obtenerPorId: mock.fn(async () => resultado) });
    await assert.rejects(f.servicio.obtenerPorId(12), { message: 'Categoria no encontrada' });
    assert.equal(f.repositorio.obtenerPorId.mock.callCount(), 1);
  }
});

for (const caso of [
  { nombre: 'crear', metodo: 'crearCategoria', argumentos: [{ nombre: 'Repuestos', responsable: 'operador' }] },
  { nombre: 'modificar', metodo: 'modificarCategoria', argumentos: [12, 'Material eléctrico'] },
  { nombre: 'eliminar', metodo: 'eliminarCategoria', argumentos: [12] },
  { nombre: 'listar', metodo: 'obtenerTodas', argumentos: [1, 10] },
  { nombre: 'buscar por identificador', metodo: 'obtenerPorId', argumentos: [12] }
]) {
  test(`Categorías: ${caso.nombre} propaga el error original del repositorio sin informar éxito`, async () => {
    const error = Object.assign(new Error('Falla simulada del repositorio'), { code: 'ERROR_SIMULADO' });
    const f = crearContexto({ [caso.metodo]: mock.fn(async () => { throw error; }) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), recibido => recibido === error);
    assert.equal(f.repositorio[caso.metodo].mock.callCount(), 1);
  });
}
