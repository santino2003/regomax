const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

function crearContexto(reemplazos = {}) {
  const fecha = new Date('2026-01-15T12:34:00Z');
  const reloj = mock.fn(() => fecha);
  const repositorio = {
    obtenerOpciones: mock.fn(async () => ({ usuarios: [], acciones: [], entidades: [] })),
    registrarAccion: mock.fn(async () => 42),
    obtenerHistorial: mock.fn(async () => ({ data: [], pagination: {} })),
    ...reemplazos
  };
  return { fecha, reloj, repositorio, servicio: cargarServicio('historialService', {
    '../repositories/historialRepository': repositorio, '../utils/fecha': { fechaActual: reloj }
  }) };
}

test('Historial: consultar las opciones conserva usuarios, acciones y entidades del repositorio', async () => {
  const opciones = { usuarios: ['operador'], acciones: ['crear'], entidades: ['bien'] };
  const f = crearContexto({ obtenerOpciones: mock.fn(async () => opciones) });
  assert.equal(await f.servicio.obtenerOpciones(), opciones);
  assert.deepEqual(f.repositorio.obtenerOpciones.mock.calls[0].arguments, []);
});

test('Historial: registrar una acción conserva sus detalles y usa la fecha del reloj simulado', async () => {
  const f = crearContexto();
  const detalles = Object.freeze({ id: 12, nombre: 'Repuesto' });
  assert.equal(await f.servicio.registrarAccion('operador', 'crear', 'bien', detalles), 42);
  assert.deepEqual(f.repositorio.registrarAccion.mock.calls[0].arguments, ['operador', 'crear', 'bien', detalles, f.fecha]);
  assert.equal(f.reloj.mock.callCount(), 1);
  assert.equal(f.repositorio.registrarAccion.mock.calls[0].arguments[3], detalles);
});

test('Historial: registrar una acción sin detalles entrega un valor nulo al repositorio', async () => {
  const f = crearContexto();
  await f.servicio.registrarAccion('operador', 'consultar', 'bien');
  assert.deepEqual(f.repositorio.registrarAccion.mock.calls[0].arguments, ['operador', 'consultar', 'bien', null, f.fecha]);
});

test('Historial: listar utiliza los valores predeterminados de página, límite y filtros', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.obtenerHistorial(), { data: [], pagination: {} });
  assert.deepEqual(f.repositorio.obtenerHistorial.mock.calls[0].arguments, [1, 50, {}]);
});

test('Historial: listar conserva los filtros y la paginación solicitados', async () => {
  const filtros = Object.freeze({ usuario: 'operador', entidad: 'bien' });
  const listado = { data: [{ id: 42 }], pagination: { page: 2, limit: 10, total: 11 } };
  const f = crearContexto({ obtenerHistorial: mock.fn(async () => listado) });
  assert.equal(await f.servicio.obtenerHistorial(2, 10, filtros), listado);
  assert.deepEqual(f.repositorio.obtenerHistorial.mock.calls[0].arguments, [2, 10, filtros]);
});

const acciones = [
  { metodo: 'registrarCreacion', accion: 'crear' }, { metodo: 'registrarEdicion', accion: 'editar' },
  { metodo: 'registrarEliminacion', accion: 'eliminar' }, { metodo: 'registrarConsulta', accion: 'consultar' }
];
for (const caso of acciones) {
  test(`Historial: ${caso.metodo} identifica al usuario autenticado y conserva los detalles`, async () => {
    const f = crearContexto();
    const detalles = Object.freeze({ id: 12 });
    await f.servicio[caso.metodo]({ user: { username: 'operador' } }, 'bien', detalles);
    assert.deepEqual(f.repositorio.registrarAccion.mock.calls[0].arguments, ['operador', caso.accion, 'bien', detalles, f.fecha]);
  });

  test(`Historial: ${caso.metodo} usa el usuario sistema si no hay autenticación y permite omitir detalles`, async () => {
    const f = crearContexto();
    await f.servicio[caso.metodo]({}, 'bien');
    assert.deepEqual(f.repositorio.registrarAccion.mock.calls[0].arguments, ['sistema', caso.accion, 'bien', null, f.fecha]);
  });
}

for (const caso of [
  { metodo: 'obtenerOpciones', dependencia: 'obtenerOpciones', argumentos: [] },
  { metodo: 'obtenerHistorial', dependencia: 'obtenerHistorial', argumentos: [1, 50, {}] },
  { metodo: 'registrarAccion', dependencia: 'registrarAccion', argumentos: ['operador', 'crear', 'bien'] },
  ...acciones.map(caso => ({ metodo: caso.metodo, dependencia: 'registrarAccion', argumentos: [{ user: { username: 'operador' } }, 'bien'] }))
]) {
  test(`Historial: ${caso.metodo} propaga el error original del repositorio`, async () => {
    const error = new Error('Falla simulada del repositorio');
    const f = crearContexto({ [caso.dependencia]: mock.fn(async () => { throw error; }) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), recibido => recibido === error);
    assert.equal(f.repositorio[caso.dependencia].mock.callCount(), 1);
  });
}
