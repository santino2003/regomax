const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

function crearContexto(reemplazos = {}) {
  const repositorio = {
    crear: mock.fn(async () => 42), modificar: mock.fn(async () => true), eliminar: mock.fn(async () => true),
    obtenerTodas: mock.fn(async () => ({ data: [], pagination: {} })),
    obtenerTodasSinPaginacion: mock.fn(async () => []), obtenerPorId: mock.fn(async () => null),
    ...reemplazos
  };
  return { repositorio, servicio: cargarServicio('fallaService', { '../repositories/fallaRepository': repositorio }) };
}

test('Fallas: validar el nombre elimina espacios externos y conserva las tildes', () => {
  const f = crearContexto();
  assert.equal(f.servicio.validarNombre(' \tFalla hidráulica\n '), 'Falla hidráulica');
});

test('Fallas: validar el nombre rechaza valores ausentes o vacíos', () => {
  const f = crearContexto();
  for (const nombre of [undefined, null, '', '   ', '\t\n']) {
    assert.throws(() => f.servicio.validarNombre(nombre), { message: 'El nombre de la falla es obligatorio' });
  }
});

test('Fallas: crear conserva el responsable y devuelve el identificador generado', async () => {
  const f = crearContexto();
  const datos = Object.freeze({ nombre: '  Falla hidráulica  ', responsable: 'operador' });
  assert.deepEqual(await f.servicio.crearFalla(datos), { success: true, id: 42, message: 'Falla creada exitosamente' });
  assert.deepEqual(f.repositorio.crear.mock.calls[0].arguments, ['Falla hidráulica', 'operador']);
  assert.equal(datos.nombre, '  Falla hidráulica  ');
});

test('Fallas: crear utiliza un responsable nulo cuando no se informa', async () => {
  for (const responsable of [undefined, null, '']) {
    const f = crearContexto();
    await f.servicio.crearFalla({ nombre: 'Falla hidráulica', responsable });
    assert.deepEqual(f.repositorio.crear.mock.calls[0].arguments, ['Falla hidráulica', null]);
  }
});

test('Fallas: modificar conserva el identificador y normaliza el nombre', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.modificarFalla(12, ' \tFalla eléctrica\n '), { success: true, message: 'Falla modificada exitosamente' });
  assert.deepEqual(f.repositorio.modificar.mock.calls[0].arguments, [12, 'Falla eléctrica']);
});

test('Fallas: crear y modificar rechazan un nombre inválido antes de escribir', async () => {
  const f = crearContexto();
  for (const nombre of [undefined, null, '', '   ', '\t\n']) {
    await assert.rejects(f.servicio.crearFalla({ nombre }), { message: 'El nombre de la falla es obligatorio' });
    await assert.rejects(f.servicio.modificarFalla(12, nombre), { message: 'El nombre de la falla es obligatorio' });
  }
  assert.equal(f.repositorio.crear.mock.callCount(), 0);
  assert.equal(f.repositorio.modificar.mock.callCount(), 0);
});

test('Fallas: eliminar solicita únicamente el identificador indicado', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.eliminarFalla(12), { success: true, message: 'Falla eliminada exitosamente' });
  assert.deepEqual(f.repositorio.eliminar.mock.calls[0].arguments, [12]);
});

test('Fallas: listar utiliza la paginación predeterminada cuando se omiten los parámetros', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.obtenerTodas(), { data: [], pagination: {} });
  assert.deepEqual(f.repositorio.obtenerTodas.mock.calls[0].arguments, [1, 10]);
});

test('Fallas: listar conserva la página, el límite y los metadatos recibidos del repositorio', async () => {
  const listado = { data: [{ id: 12, nombre: 'Falla eléctrica' }], pagination: { page: 3, limit: 5, total: 13, totalPages: 3 } };
  const f = crearContexto({ obtenerTodas: mock.fn(async () => listado) });
  assert.equal(await f.servicio.obtenerTodas(3, 5), listado);
  assert.deepEqual(f.repositorio.obtenerTodas.mock.calls[0].arguments, [3, 5]);
});

test('Fallas: listar sin paginación conserva los registros y admite una lista vacía', async () => {
  for (const registros of [[{ id: 12, nombre: 'Falla eléctrica' }], []]) {
    const f = crearContexto({ obtenerTodasSinPaginacion: mock.fn(async () => registros) });
    assert.equal(await f.servicio.obtenerTodasSinPaginacion(), registros);
    assert.deepEqual(f.repositorio.obtenerTodasSinPaginacion.mock.calls[0].arguments, []);
  }
});

test('Fallas: buscar por identificador conserva los datos del registro encontrado', async () => {
  const falla = Object.freeze({ id: 12, nombre: 'Falla eléctrica', responsable: 'operador' });
  const f = crearContexto({ obtenerPorId: mock.fn(async () => falla) });
  assert.equal(await f.servicio.obtenerPorId(12), falla);
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, [12]);
});

test('Fallas: buscar un identificador inexistente informa que la falla no fue encontrada', async () => {
  for (const resultado of [null, undefined]) {
    const f = crearContexto({ obtenerPorId: mock.fn(async () => resultado) });
    await assert.rejects(f.servicio.obtenerPorId(12), { message: 'Falla no encontrada' });
  }
});

for (const caso of [
  { metodo: 'crearFalla', dependencia: 'crear', argumentos: [{ nombre: 'Falla eléctrica' }] },
  { metodo: 'modificarFalla', dependencia: 'modificar', argumentos: [12, 'Falla eléctrica'] },
  { metodo: 'eliminarFalla', dependencia: 'eliminar', argumentos: [12] },
  { metodo: 'obtenerTodas', argumentos: [1, 10] }, { metodo: 'obtenerTodasSinPaginacion', argumentos: [] },
  { metodo: 'obtenerPorId', argumentos: [12] }
]) {
  test(`Fallas: ${caso.metodo} propaga el error original del repositorio`, async () => {
    const dependencia = caso.dependencia || caso.metodo;
    const error = new Error('Falla simulada del repositorio');
    const f = crearContexto({ [dependencia]: mock.fn(async () => { throw error; }) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), recibido => recibido === error);
    assert.equal(f.repositorio[dependencia].mock.callCount(), 1);
  });
}
