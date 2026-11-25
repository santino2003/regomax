const { test, mock, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

// El calendario se comprueba con la misma zona horaria que configura la aplicación.
const zonaOriginal = process.env.TZ;
before(() => { process.env.TZ = 'America/Argentina/Buenos_Aires'; });
after(() => {
  if (zonaOriginal === undefined) delete process.env.TZ;
  else process.env.TZ = zonaOriginal;
});

function crearContexto(reemplazos = {}) {
  const repositorio = {
    establecerDiasHabiles: mock.fn(async () => ({ success: true, updated: true })),
    guardarDiasHabilesSeleccionados: mock.fn(async () => ({ success: true })),
    obtenerDiasHabilesSeleccionados: mock.fn(async () => []),
    obtenerDiasHabiles: mock.fn(async () => null),
    obtenerTodos: mock.fn(async () => []), eliminarDiasHabiles: mock.fn(async () => true),
    ...reemplazos
  };
  return { repositorio, servicio: cargarServicio('diasHabilesService', {
    '../repositories/diasHabilesRepository': repositorio
  }) };
}

test('Días hábiles: establecer conserva el mes, el año, la cantidad y el resultado de la operación', async () => {
  const resultado = { success: true, updated: true, message: 'Cantidad actualizada' };
  const f = crearContexto({ establecerDiasHabiles: mock.fn(async () => resultado) });
  assert.equal(await f.servicio.establecerDiasHabiles(11, 2026, 20), resultado);
  assert.deepEqual(f.repositorio.establecerDiasHabiles.mock.calls[0].arguments, [11, 2026, 20]);
});

test('Días hábiles: guardar conserva los días seleccionados sin modificarlos y admite una selección vacía', async () => {
  for (const dias of [Object.freeze([2, 4, 9]), Object.freeze([])]) {
    const resultado = { success: true, cantidad: dias.length };
    const f = crearContexto({ guardarDiasHabilesSeleccionados: mock.fn(async () => resultado) });
    assert.equal(await f.servicio.guardarDiasHabilesSeleccionados(11, 2026, dias), resultado);
    assert.deepEqual(f.repositorio.guardarDiasHabilesSeleccionados.mock.calls[0].arguments, [11, 2026, dias]);
    assert.equal(f.repositorio.guardarDiasHabilesSeleccionados.mock.calls[0].arguments[2], dias);
  }
});

test('Días hábiles: consultar los días seleccionados conserva los resultados y admite una lista vacía', async () => {
  for (const dias of [[2, 4, 9], []]) {
    const f = crearContexto({ obtenerDiasHabilesSeleccionados: mock.fn(async () => dias) });
    assert.equal(await f.servicio.obtenerDiasHabilesSeleccionados(11, 2026), dias);
    assert.deepEqual(f.repositorio.obtenerDiasHabilesSeleccionados.mock.calls[0].arguments, [11, 2026]);
  }
});

test('Días hábiles: consultar la cantidad conserva el registro y devuelve null cuando no existe', async () => {
  for (const registro of [{ mes: 11, anio: 2026, cantidad: 20 }, null]) {
    const f = crearContexto({ obtenerDiasHabiles: mock.fn(async () => registro) });
    assert.equal(await f.servicio.obtenerDiasHabiles(11, 2026), registro);
    assert.deepEqual(f.repositorio.obtenerDiasHabiles.mock.calls[0].arguments, [11, 2026]);
  }
});

test('Días hábiles: listar conserva los registros y admite que no haya meses configurados', async () => {
  for (const registros of [[{ mes: 11, anio: 2026, cantidad: 20 }], []]) {
    const f = crearContexto({ obtenerTodos: mock.fn(async () => registros) });
    assert.equal(await f.servicio.obtenerTodos(), registros);
    assert.deepEqual(f.repositorio.obtenerTodos.mock.calls[0].arguments, []);
  }
});

test('Días hábiles: eliminar entrega el mes y el año al repositorio y conserva la confirmación', async () => {
  const f = crearContexto();
  assert.equal(await f.servicio.eliminarDiasHabiles(11, 2026), true);
  assert.deepEqual(f.repositorio.eliminarDiasHabiles.mock.calls[0].arguments, [11, 2026]);
});

test('Días hábiles: el calendario construye las fechas, el primer día y los fines de semana del mes', async () => {
  const seleccionados = Object.freeze([1, 3, 5]);
  const f = crearContexto({ obtenerDiasHabilesSeleccionados: mock.fn(async () => seleccionados) });
  const calendario = await f.servicio.obtenerCalendarioMensual(1, 2026);
  assert.equal(calendario.mes, 1);
  assert.equal(calendario.anio, 2026);
  assert.equal(calendario.diasEnMes, 31);
  assert.equal(calendario.primerDia, 4);
  assert.equal(calendario.diasDelMes.length, 31);
  assert.deepEqual(calendario.diasDelMes[0], { dia: 1, fecha: '2026-01-01', esHabil: true, esFinDeSemana: false });
  assert.deepEqual(calendario.diasDelMes[2], { dia: 3, fecha: '2026-01-03', esHabil: true, esFinDeSemana: true });
  assert.deepEqual(calendario.diasDelMes[3], { dia: 4, fecha: '2026-01-04', esHabil: false, esFinDeSemana: true });
  assert.deepEqual(calendario.diasDelMes[4], { dia: 5, fecha: '2026-01-05', esHabil: true, esFinDeSemana: false });
  assert.equal(calendario.diasDelMes.at(-1).fecha, '2026-01-31');
  assert.equal(calendario.diasHabiles, seleccionados);
  assert.deepEqual(f.repositorio.obtenerDiasHabilesSeleccionados.mock.calls[0].arguments, [1, 2026]);
});

for (const caso of [
  { anio: 2024, cantidad: 29 }, { anio: 2025, cantidad: 28 },
  { anio: 2000, cantidad: 29 }, { anio: 2100, cantidad: 28 }
]) {
  test(`Días hábiles: febrero de ${caso.anio} tiene ${caso.cantidad} días y no agrega fechas de marzo`, async () => {
    const f = crearContexto();
    const calendario = await f.servicio.obtenerCalendarioMensual(2, caso.anio);
    assert.equal(calendario.diasEnMes, caso.cantidad);
    assert.equal(calendario.diasDelMes.length, caso.cantidad);
    assert.equal(calendario.diasDelMes.at(-1).fecha, `${caso.anio}-02-${caso.cantidad}`);
    assert.ok(calendario.diasDelMes.every(dia => dia.fecha.startsWith(`${caso.anio}-02-`)));
  });
}

test('Días hábiles: un mes sin selección conserva todos sus días marcados como no hábiles', async () => {
  const f = crearContexto();
  const calendario = await f.servicio.obtenerCalendarioMensual(4, 2026);
  assert.equal(calendario.diasEnMes, 30);
  assert.equal(calendario.diasDelMes.length, 30);
  assert.deepEqual(calendario.diasHabiles, []);
  assert.ok(calendario.diasDelMes.every(dia => dia.esHabil === false));
});

for (const caso of [
  { metodo: 'establecerDiasHabiles', argumentos: [11, 2026, 20] },
  { metodo: 'guardarDiasHabilesSeleccionados', argumentos: [11, 2026, [2, 4]] },
  { metodo: 'obtenerDiasHabilesSeleccionados', argumentos: [11, 2026] },
  { metodo: 'obtenerDiasHabiles', argumentos: [11, 2026] },
  { metodo: 'obtenerTodos', argumentos: [] }, { metodo: 'eliminarDiasHabiles', argumentos: [11, 2026] },
  { metodo: 'obtenerCalendarioMensual', dependencia: 'obtenerDiasHabilesSeleccionados', argumentos: [11, 2026] }
]) {
  test(`Días hábiles: ${caso.metodo} propaga el error original del repositorio`, async () => {
    const dependencia = caso.dependencia || caso.metodo;
    const error = new Error('Falla simulada del repositorio');
    const f = crearContexto({ [dependencia]: mock.fn(async () => { throw error; }) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), recibido => recibido === error);
    assert.equal(f.repositorio[dependencia].mock.callCount(), 1);
  });
}
