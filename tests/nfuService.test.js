const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

mock.method(console, 'error', () => {});

function crearContexto(reemplazos = {}) {
  const repositorio = {
    insertarNFU: mock.fn(async () => 42), obtenerTodosNFU: mock.fn(async () => []),
    obtenerRegistrosNFU: mock.fn(async () => ({ data: [], pagination: {} })),
    obtenerConFiltros: mock.fn(async () => []), ...reemplazos
  };
  return { repositorio, servicio: cargarServicio('nfuService', { '../repositories/nfuRepository': repositorio }) };
}
const argumentos = ['2026-01-15', '12.75', 'operador', 2, 'NFU', 'Camión'];

test('NFU: registrar convierte una cantidad decimal y conserva los datos del ingreso', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.registrarIngresoNFU(...argumentos), {
    id: 42, fecha: '2026-01-15', cantidad: 12.75, responsable: 'operador', cliente_id: 2, categoria: 'NFU', tipo: 'Camión'
  });
  assert.deepEqual(f.repositorio.insertarNFU.mock.calls[0].arguments, ['2026-01-15', 12.75, 'operador', 2, 'NFU', 'Camión']);
});

test('NFU: registrar acepta cantidades numéricas positivas sin perder decimales', async () => {
  const f = crearContexto();
  assert.equal((await f.servicio.registrarIngresoNFU('2026-01-15', 0.25, 'operador', 2, 'NFU', 'Camión')).cantidad, 0.25);
});

for (const caso of [
  { posicion: 0, valores: [undefined, null, ''], mensaje: 'Fecha y cantidad son obligatorios' },
  { posicion: 1, valores: [undefined, null, '', 0], mensaje: 'Fecha y cantidad son obligatorios' },
  { posicion: 3, valores: [undefined, null, '', 0], mensaje: 'El cliente es obligatorio' },
  { posicion: 4, valores: [undefined, null, ''], mensaje: 'La categoría es obligatoria' },
  { posicion: 5, valores: [undefined, null, ''], mensaje: 'El tipo es obligatorio' }
]) {
  test(`NFU: registrar rechaza la omisión del argumento ${caso.posicion + 1} antes de escribir`, async () => {
    const f = crearContexto();
    for (const valor of caso.valores) {
      const entrada = [...argumentos];
      entrada[caso.posicion] = valor;
      await assert.rejects(f.servicio.registrarIngresoNFU(...entrada), { message: caso.mensaje });
    }
    assert.equal(f.repositorio.insertarNFU.mock.callCount(), 0);
  });
}

test('NFU: registrar rechaza cantidades negativas, cero expresado como texto y valores no numéricos', async () => {
  const f = crearContexto();
  for (const cantidad of [-1, '-1', '0', 'abc', ' ']) {
    const entrada = [...argumentos]; entrada[1] = cantidad;
    await assert.rejects(f.servicio.registrarIngresoNFU(...entrada), { message: 'La cantidad debe ser un número positivo' });
  }
  assert.equal(f.repositorio.insertarNFU.mock.callCount(), 0);
});

test('NFU: listar conserva todos los registros y admite un resultado vacío', async () => {
  for (const registros of [[{ id: 42, cantidad: 12.75 }], []]) {
    const f = crearContexto({ obtenerTodosNFU: mock.fn(async () => registros) });
    assert.equal(await f.servicio.obtenerTodosNFU(), registros);
    assert.deepEqual(f.repositorio.obtenerTodosNFU.mock.calls[0].arguments, []);
  }
});

test('NFU: consultar registros conserva la paginación, los filtros y los metadatos', async () => {
  const filtros = Object.freeze({ cliente_id: 2, fecha_desde: '2026-01-01' });
  const listado = { data: [{ id: 42 }], pagination: { page: 2, limit: 5, total: 6 } };
  const f = crearContexto({ obtenerRegistrosNFU: mock.fn(async () => listado) });
  assert.equal(await f.servicio.obtenerRegistrosNFU(2, 5, filtros), listado);
  assert.deepEqual(f.repositorio.obtenerRegistrosNFU.mock.calls[0].arguments, [2, 5, filtros]);
});

test('NFU: consultar para exportar conserva los filtros y los registros sin paginación', async () => {
  const filtros = Object.freeze({ categoria: 'NFU', tipo: 'Camión' });
  const registros = [{ id: 42, cantidad: 12.75 }];
  const f = crearContexto({ obtenerConFiltros: mock.fn(async () => registros) });
  assert.equal(await f.servicio.obtenerConFiltros(filtros), registros);
  assert.equal(f.repositorio.obtenerConFiltros.mock.calls[0].arguments[0], filtros);
});

for (const caso of [
  { metodo: 'registrarIngresoNFU', dependencia: 'insertarNFU', argumentos },
  { metodo: 'obtenerTodosNFU', argumentos: [] }, { metodo: 'obtenerRegistrosNFU', argumentos: [1, 10, {}] },
  { metodo: 'obtenerConFiltros', argumentos: [{}] }
]) {
  test(`NFU: ${caso.metodo} propaga el error original del repositorio`, async () => {
    const dependencia = caso.dependencia || caso.metodo;
    const error = new Error('Falla simulada del repositorio');
    const f = crearContexto({ [dependencia]: mock.fn(async () => { throw error; }) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), recibido => recibido === error);
  });
}
