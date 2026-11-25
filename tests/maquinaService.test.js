const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

function crearContexto(reemplazos = {}) {
  const repositorio = {
    crear: mock.fn(async () => true), modificar: mock.fn(async () => true), eliminar: mock.fn(async () => true),
    obtenerTodas: mock.fn(async () => ({ data: [], pagination: {} })),
    obtenerTodasSinPaginacion: mock.fn(async () => []), obtenerPorId: mock.fn(async () => null),
    ...reemplazos
  };
  return { repositorio, servicio: cargarServicio('maquinaService', { '../repositories/maquinaRepository': repositorio }) };
}

test('Máquinas: validar el nombre elimina espacios externos y conserva los caracteres especiales', () => {
  const f = crearContexto();
  assert.equal(f.servicio.validarNombre(' \tTrituradora N.º 2\n '), 'Trituradora N.º 2');
  for (const nombre of [undefined, null, '', ' \t ']) {
    assert.throws(() => f.servicio.validarNombre(nombre), { message: 'El nombre de la máquina es obligatorio' });
  }
});

test('Máquinas: una descripción ausente o vacía se normaliza como null', () => {
  const f = crearContexto();
  for (const descripcion of [undefined, null, '', ' \t\n ']) assert.equal(f.servicio.normalizarDescripcion(descripcion), null);
});

test('Máquinas: normalizar la descripción conserva el contenido y convierte valores numéricos a texto', () => {
  const f = crearContexto();
  assert.equal(f.servicio.normalizarDescripcion('  Motor principal\nModelo A  '), 'Motor principal\nModelo A');
  assert.equal(f.servicio.normalizarDescripcion(0), '0');
  assert.equal(f.servicio.normalizarDescripcion(42), '42');
});

test('Máquinas: crear normaliza los textos y conserva el responsable sin modificar los datos recibidos', async () => {
  const f = crearContexto();
  const datos = Object.freeze({ nombre: '  Trituradora  ', descripcion: '  Motor principal  ', responsable: 'operador' });
  assert.deepEqual(await f.servicio.crearMaquina(datos), { success: true, message: 'Máquina creada exitosamente' });
  assert.deepEqual(f.repositorio.crear.mock.calls[0].arguments, ['Trituradora', 'Motor principal', 'operador']);
});

test('Máquinas: crear permite omitir la descripción y el responsable', async () => {
  const f = crearContexto();
  await f.servicio.crearMaquina({ nombre: 'Trituradora' });
  assert.deepEqual(f.repositorio.crear.mock.calls[0].arguments, ['Trituradora', null, null]);
});

test('Máquinas: modificar conserva el identificador y normaliza los textos', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.modificarMaquina(12, { nombre: ' Molino ', descripcion: ' Principal ' }), {
    success: true, message: 'Máquina modificada exitosamente'
  });
  assert.deepEqual(f.repositorio.modificar.mock.calls[0].arguments, [12, 'Molino', 'Principal']);
});

test('Máquinas: modificar permite vaciar la descripción mediante un valor nulo', async () => {
  const f = crearContexto();
  await f.servicio.modificarMaquina(12, { nombre: 'Molino', descripcion: ' \t ' });
  assert.deepEqual(f.repositorio.modificar.mock.calls[0].arguments, [12, 'Molino', null]);
});

test('Máquinas: crear y modificar rechazan nombres vacíos antes de escribir', async () => {
  const f = crearContexto();
  for (const nombre of [undefined, null, '', ' \t ']) {
    await assert.rejects(f.servicio.crearMaquina({ nombre }), { message: 'El nombre de la máquina es obligatorio' });
    await assert.rejects(f.servicio.modificarMaquina(12, { nombre }), { message: 'El nombre de la máquina es obligatorio' });
  }
  assert.equal(f.repositorio.crear.mock.callCount(), 0);
  assert.equal(f.repositorio.modificar.mock.callCount(), 0);
});

test('Máquinas: eliminar solicita únicamente el identificador indicado', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.eliminarMaquina(12), { success: true, message: 'Máquina eliminada exitosamente' });
  assert.deepEqual(f.repositorio.eliminar.mock.calls[0].arguments, [12]);
});

test('Máquinas: listar utiliza la paginación predeterminada y filtros vacíos', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.obtenerTodas(), { data: [], pagination: {} });
  assert.deepEqual(f.repositorio.obtenerTodas.mock.calls[0].arguments, [1, 10, {}]);
});

test('Máquinas: listar conserva los filtros, la paginación y los metadatos', async () => {
  const filtros = Object.freeze({ nombre: 'Molino' });
  const listado = { data: [{ id: 12 }], pagination: { page: 2, limit: 5, total: 6 } };
  const f = crearContexto({ obtenerTodas: mock.fn(async () => listado) });
  assert.equal(await f.servicio.obtenerTodas(2, 5, filtros), listado);
  assert.deepEqual(f.repositorio.obtenerTodas.mock.calls[0].arguments, [2, 5, filtros]);
});

test('Máquinas: listar sin paginación conserva los registros y admite una lista vacía', async () => {
  for (const registros of [[{ id: 12, nombre: 'Molino' }], []]) {
    const f = crearContexto({ obtenerTodasSinPaginacion: mock.fn(async () => registros) });
    assert.equal(await f.servicio.obtenerTodasSinPaginacion(), registros);
  }
});

test('Máquinas: buscar por identificador conserva todos los datos del registro', async () => {
  const maquina = Object.freeze({ id: 12, nombre: 'Molino', descripcion: 'Principal' });
  const f = crearContexto({ obtenerPorId: mock.fn(async () => maquina) });
  assert.equal(await f.servicio.obtenerPorId(12), maquina);
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, [12]);
});

test('Máquinas: buscar un registro inexistente informa el error esperado', async () => {
  for (const maquina of [null, undefined]) {
    const f = crearContexto({ obtenerPorId: mock.fn(async () => maquina) });
    await assert.rejects(f.servicio.obtenerPorId(12), { message: 'Máquina no encontrada' });
  }
});

for (const caso of [
  { metodo: 'crearMaquina', dependencia: 'crear', argumentos: [{ nombre: 'Molino' }] },
  { metodo: 'modificarMaquina', dependencia: 'modificar', argumentos: [12, { nombre: 'Molino' }] },
  { metodo: 'eliminarMaquina', dependencia: 'eliminar', argumentos: [12] },
  { metodo: 'obtenerTodas', argumentos: [1, 10, {}] }, { metodo: 'obtenerTodasSinPaginacion', argumentos: [] },
  { metodo: 'obtenerPorId', argumentos: [12] }
]) {
  test(`Máquinas: ${caso.metodo} propaga el error original del repositorio`, async () => {
    const dependencia = caso.dependencia || caso.metodo;
    const error = new Error('Falla simulada del repositorio');
    const f = crearContexto({ [dependencia]: mock.fn(async () => { throw error; }) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), recibido => recibido === error);
  });
}
