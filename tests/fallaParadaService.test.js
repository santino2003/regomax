const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

function crearContexto(reemplazos = {}) {
  const repositorio = {
    crear: mock.fn(async () => 42), modificar: mock.fn(async () => true),
    obtenerTodos: mock.fn(async () => ({ data: [], pagination: {} })),
    obtenerPorId: mock.fn(async () => ({ id: 42 })), ...reemplazos
  };
  const fallas = { obtenerPorId: mock.fn(async () => ({ id: 2, nombre: 'Falla eléctrica' })) };
  const { fallaParadaService: servicio, TIPOS_PARADA } = cargarServicio('fallaParadaService', {
    '../repositories/fallaParadaRepository': repositorio, './fallaService': fallas
  });
  return { servicio, repositorio, fallas, tipos: TIPOS_PARADA };
}

const datos = Object.freeze({
  fecha: '2026-01-15', hora: '14:30', minutos_afectados: '15', maquina: '  Molino 1  ',
  falla_id: '2', descripcion: '  Se detuvo el motor  ', tipo_parada: 'Fallas',
  observaciones: '  Revisar alimentación  ', responsable: 'operador'
});
const normalizados = {
  fecha: '2026-01-15', hora: '14:30', minutos_afectados: 15, maquina: 'Molino 1',
  falla_id: 2, descripcion: 'Se detuvo el motor', tipo_parada: 'Fallas',
  observaciones: 'Revisar alimentación', responsable: 'operador'
};

test('Fallas y paradas: validar normaliza números y textos y comprueba la falla referenciada', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.validar(datos), normalizados);
  assert.deepEqual(f.fallas.obtenerPorId.mock.calls[0].arguments, [2]);
  assert.equal(datos.maquina, '  Molino 1  ');
  assert.equal(datos.minutos_afectados, '15');
});

test('Fallas y paradas: validar acepta el campo alternativo falla', async () => {
  const f = crearContexto();
  const resultado = await f.servicio.validar({ ...datos, falla_id: undefined, falla: '2' });
  assert.equal(resultado.falla_id, 2);
  assert.deepEqual(f.fallas.obtenerPorId.mock.calls[0].arguments, [2]);
});

test('Fallas y paradas: validar admite cero minutos y los extremos del horario de 24 horas', async () => {
  const f = crearContexto();
  for (const hora of ['00:00', '23:59']) {
    const resultado = await f.servicio.validar({ ...datos, hora, minutos_afectados: '0' });
    assert.equal(resultado.minutos_afectados, 0);
    assert.equal(resultado.hora, hora);
  }
});

test('Fallas y paradas: las observaciones vacías y el responsable omitido se normalizan como null', async () => {
  const f = crearContexto();
  for (const observaciones of [undefined, null, '', ' \t ']) {
    const resultado = await f.servicio.validar({ ...datos, observaciones, responsable: undefined });
    assert.equal(resultado.observaciones, null);
    assert.equal(resultado.responsable, null);
  }
});

test('Fallas y paradas: validar acepta cada tipo de parada definido por el servicio', async () => {
  const f = crearContexto();
  assert.deepEqual(f.tipos, ['Parada', 'Fallas', 'Parada Programada', 'Prueba', 'Respuesto en planta']);
  for (const tipo_parada of f.tipos) assert.equal((await f.servicio.validar({ ...datos, tipo_parada })).tipo_parada, tipo_parada);
});

for (const caso of [
  { campo: 'fecha', valores: [undefined, null, '', '15/01/2026', '2026-1-15'], mensaje: 'La fecha es obligatoria' },
  { campo: 'hora', valores: [undefined, '', '24:00', '12:60', '9:00', '12:00:00'], mensaje: 'La hora debe tener formato de 24 horas HH:mm' },
  { campo: 'minutos_afectados', valores: [undefined, -1, 1.5, 'abc', Infinity], mensaje: 'Los minutos afectados deben ser un número entero mayor o igual a cero' },
  { campo: 'maquina', valores: [undefined, null, '', ' \t '], mensaje: 'La máquina es obligatoria' },
  { campo: 'falla_id', valores: [undefined, null, 0, -1, 1.5, 'abc'], mensaje: 'La falla es obligatoria' }
]) {
  test(`Fallas y paradas: un valor inválido en ${caso.campo} impide consultar otras dependencias o guardar`, async () => {
    const f = crearContexto();
    for (const valor of caso.valores) {
      await assert.rejects(f.servicio.crear({ ...datos, [caso.campo]: valor }), { message: caso.mensaje });
    }
    assert.equal(f.fallas.obtenerPorId.mock.callCount(), 0);
    assert.equal(f.repositorio.crear.mock.callCount(), 0);
  });
}

for (const caso of [
  { campo: 'descripcion', valores: [undefined, null, '', ' \t '], mensaje: 'La descripción es obligatoria' },
  { campo: 'tipo_parada', valores: [undefined, null, '', 'Otro tipo', 'fallas'], mensaje: 'El tipo de parada no es válido' }
]) {
  test(`Fallas y paradas: un valor inválido en ${caso.campo} evita guardar el registro`, async () => {
    const f = crearContexto();
    for (const valor of caso.valores) {
      await assert.rejects(f.servicio.crear({ ...datos, [caso.campo]: valor }), { message: caso.mensaje });
    }
    assert.equal(f.repositorio.crear.mock.callCount(), 0);
  });
}

test('Fallas y paradas: una falla referenciada inexistente impide crear el registro', async () => {
  const f = crearContexto();
  const error = new Error('Falla no encontrada');
  f.fallas.obtenerPorId.mock.mockImplementation(async () => { throw error; });
  await assert.rejects(f.servicio.crear(datos), recibido => recibido === error);
  assert.equal(f.repositorio.crear.mock.callCount(), 0);
});

test('Fallas y paradas: crear guarda únicamente los datos normalizados y devuelve el identificador', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.crear(datos), { success: true, id: 42, message: 'Falla / Parada registrada exitosamente' });
  assert.equal(f.repositorio.crear.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.crear.mock.calls[0].arguments, [normalizados]);
});

test('Fallas y paradas: modificar comprueba el registro existente antes de validar y guardar', async () => {
  const pasos = [];
  const f = crearContexto({ obtenerPorId: mock.fn(async () => { pasos.push('buscar registro'); return { id: 42 }; }) });
  f.fallas.obtenerPorId.mock.mockImplementation(async () => { pasos.push('validar falla'); return { id: 2 }; });
  f.repositorio.modificar.mock.mockImplementation(async () => { pasos.push('modificar'); });
  assert.deepEqual(await f.servicio.modificar('42', datos), { success: true, id: 42, message: 'Falla / Parada modificada exitosamente' });
  assert.deepEqual(pasos, ['buscar registro', 'validar falla', 'modificar']);
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, ['42']);
  assert.deepEqual(f.repositorio.modificar.mock.calls[0].arguments, ['42', normalizados]);
});

test('Fallas y paradas: modificar un registro inexistente evita validar la falla y escribir', async () => {
  const f = crearContexto({ obtenerPorId: mock.fn(async () => null) });
  await assert.rejects(f.servicio.modificar(42, datos), { message: 'Falla / Parada no encontrada' });
  assert.equal(f.fallas.obtenerPorId.mock.callCount(), 0);
  assert.equal(f.repositorio.modificar.mock.callCount(), 0);
});

test('Fallas y paradas: modificar con datos inválidos conserva la operación sin escrituras', async () => {
  const f = crearContexto();
  await assert.rejects(f.servicio.modificar(42, { ...datos, descripcion: '' }), { message: 'La descripción es obligatoria' });
  assert.equal(f.repositorio.modificar.mock.callCount(), 0);
});

test('Fallas y paradas: listar conserva los filtros, la paginación y el resultado recibido', async () => {
  const filtros = Object.freeze({ maquina: 'Molino 1', falla_id: 2 });
  const listado = { data: [{ id: 42, ...normalizados }], pagination: { page: 2, limit: 5, total: 6, totalPages: 2 } };
  const f = crearContexto({ obtenerTodos: mock.fn(async () => listado) });
  assert.equal(await f.servicio.obtenerTodos(2, 5, filtros), listado);
  assert.deepEqual(f.repositorio.obtenerTodos.mock.calls[0].arguments, [2, 5, filtros]);
  assert.equal(f.repositorio.obtenerTodos.mock.calls[0].arguments[2], filtros);
});

test('Fallas y paradas: buscar por identificador devuelve el registro encontrado', async () => {
  const registro = Object.freeze({ id: 42, ...normalizados });
  const f = crearContexto({ obtenerPorId: mock.fn(async () => registro) });
  assert.equal(await f.servicio.obtenerPorId(42), registro);
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, [42]);
});

test('Fallas y paradas: buscar un registro inexistente informa el error esperado', async () => {
  for (const registro of [null, undefined]) {
    const f = crearContexto({ obtenerPorId: mock.fn(async () => registro) });
    await assert.rejects(f.servicio.obtenerPorId(42), { message: 'Falla / Parada no encontrada' });
  }
});

for (const caso of [
  { metodo: 'crear', argumentos: [datos] }, { metodo: 'modificar', argumentos: [42, datos] },
  { metodo: 'obtenerTodos', argumentos: [1, 10, {}] }, { metodo: 'obtenerPorId', argumentos: [42] }
]) {
  test(`Fallas y paradas: ${caso.metodo} propaga el error original del repositorio`, async () => {
    const error = new Error('Falla simulada del repositorio');
    const f = crearContexto({ [caso.metodo]: mock.fn(async () => { throw error; }) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), recibido => recibido === error);
    assert.equal(f.repositorio[caso.metodo].mock.callCount(), 1);
  });
}
