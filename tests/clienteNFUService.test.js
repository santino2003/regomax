const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

mock.method(console, 'error', () => {});

function crearContexto(reemplazos = {}) {
  const repositorio = {
    crearCliente: mock.fn(async () => true), actualizarCliente: mock.fn(async () => true),
    eliminarCliente: mock.fn(async () => true), obtenerTodos: mock.fn(async () => []),
    obtenerConFiltros: mock.fn(async () => []), obtenerPorId: mock.fn(async () => null),
    ...reemplazos
  };
  return { repositorio, servicio: cargarServicio('clienteNFUService', {
    '../repositories/clienteNFURepository': repositorio
  }) };
}

const datos = Object.freeze({ empresa: 'Empresa de prueba', cuit: '30712345678', correo: 'prueba@example.invalid', telefono: '1123456789' });

test('Clientes NFU: crear conserva los datos de contacto y el CUIT recibidos', async () => {
  const f = crearContexto();
  // Se comprueba la respuesta actual del servicio, que utiliza el texto «Proveedor».
  assert.deepEqual(await f.servicio.crearCliente(datos), { success: true, message: 'Proveedor creado exitosamente' });
  assert.equal(f.repositorio.crearCliente.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.crearCliente.mock.calls[0].arguments, [datos.empresa, datos.cuit, datos.correo, datos.telefono]);
});

test('Clientes NFU: crear permite omitir los datos de contacto opcionales', async () => {
  const f = crearContexto();
  await f.servicio.crearCliente({ empresa: datos.empresa, cuit: datos.cuit });
  assert.deepEqual(f.repositorio.crearCliente.mock.calls[0].arguments, [datos.empresa, datos.cuit, undefined, undefined]);
});

for (const caso of [
  { metodo: 'crearCliente', accion: 'crear', argumentos: entrada => [entrada] },
  { metodo: 'actualizarCliente', accion: 'actualizar', argumentos: entrada => [12, entrada] }
]) {
  test(`Clientes NFU: ${caso.accion} exige empresa y CUIT antes de llamar al repositorio`, async () => {
    const f = crearContexto();
    for (const cambio of [{ empresa: undefined }, { empresa: '' }, { empresa: null }, { cuit: undefined }, { cuit: '' }, { cuit: null }]) {
      await assert.rejects(f.servicio[caso.metodo](...caso.argumentos({ ...datos, ...cambio })), {
        message: `Datos incompletos para ${caso.accion} el cliente`
      });
    }
    assert.equal(f.repositorio[caso.metodo].mock.callCount(), 0);
  });
}

test('Clientes NFU: actualizar conserva el identificador y los nuevos datos del cliente', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.actualizarCliente(12, datos), { success: true, message: 'Cliente actualizado exitosamente' });
  assert.deepEqual(f.repositorio.actualizarCliente.mock.calls[0].arguments, [12, datos.empresa, datos.cuit, datos.correo, datos.telefono]);
});

test('Clientes NFU: eliminar solicita únicamente el identificador indicado', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.eliminarCliente(12), { success: true, message: 'Cliente eliminado exitosamente' });
  assert.deepEqual(f.repositorio.eliminarCliente.mock.calls[0].arguments, [12]);
});

test('Clientes NFU: listar conserva todos los resultados y admite un listado vacío', async () => {
  for (const clientes of [[{ id: 12, ...datos }], []]) {
    const f = crearContexto({ obtenerTodos: mock.fn(async () => clientes) });
    assert.equal(await f.servicio.obtenerTodos(), clientes);
    assert.equal(f.repositorio.obtenerTodos.mock.callCount(), 1);
    assert.deepEqual(f.repositorio.obtenerTodos.mock.calls[0].arguments, []);
  }
});

test('Clientes NFU: filtrar utiliza un objeto vacío cuando se omiten los filtros', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.obtenerConFiltros(), []);
  assert.deepEqual(f.repositorio.obtenerConFiltros.mock.calls[0].arguments, [{}]);
});

test('Clientes NFU: filtrar conserva los criterios recibidos y el resultado del repositorio', async () => {
  const filtros = Object.freeze({ empresa: 'Empresa', cuit: '307' });
  const clientes = [{ id: 12, ...datos }];
  const f = crearContexto({ obtenerConFiltros: mock.fn(async () => clientes) });
  assert.equal(await f.servicio.obtenerConFiltros(filtros), clientes);
  assert.equal(f.repositorio.obtenerConFiltros.mock.calls[0].arguments[0], filtros);
});

test('Clientes NFU: buscar por identificador conserva todos los datos encontrados', async () => {
  const cliente = Object.freeze({ id: 12, ...datos });
  const f = crearContexto({ obtenerPorId: mock.fn(async () => cliente) });
  assert.equal(await f.servicio.obtenerPorId(12), cliente);
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, [12]);
});

test('Clientes NFU: buscar un cliente inexistente informa el error esperado', async () => {
  for (const cliente of [null, undefined]) {
    const f = crearContexto({ obtenerPorId: mock.fn(async () => cliente) });
    await assert.rejects(f.servicio.obtenerPorId(12), { message: 'Cliente no encontrado' });
  }
});

for (const caso of [
  { metodo: 'crearCliente', argumentos: [datos] }, { metodo: 'actualizarCliente', argumentos: [12, datos] },
  { metodo: 'eliminarCliente', argumentos: [12] }, { metodo: 'obtenerTodos', argumentos: [] },
  { metodo: 'obtenerConFiltros', argumentos: [{ empresa: 'Empresa' }] }, { metodo: 'obtenerPorId', argumentos: [12] }
]) {
  test(`Clientes NFU: ${caso.metodo} propaga el error original del repositorio`, async () => {
    const error = Object.assign(new Error('Falla simulada del repositorio'), { code: 'ERROR_SIMULADO' });
    const f = crearContexto({ [caso.metodo]: mock.fn(async () => { throw error; }) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), recibido => recibido === error);
    assert.equal(f.repositorio[caso.metodo].mock.callCount(), 1);
  });
}
