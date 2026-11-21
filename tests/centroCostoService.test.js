const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

mock.method(console, 'error', () => {});

function crearContexto(reemplazos = {}) {
  const repositorio = {
    crear: mock.fn(async () => true),
    modificar: mock.fn(async () => true),
    eliminar: mock.fn(async () => true),
    existeEnOrdenes: mock.fn(async () => false),
    cambiarEstado: mock.fn(async () => true),
    obtenerTodos: mock.fn(async () => ({ data: [], pagination: {} })),
    obtenerActivos: mock.fn(async () => []),
    obtenerPorId: mock.fn(async () => null),
    ...reemplazos
  };
  const servicio = cargarServicio('centroCostoService', {
    '../repositories/centroCostoRepository': repositorio
  });
  return { servicio, repositorio };
}

test('Centros de costo: crear normaliza el nombre y conserva el responsable sin modificar los datos originales', async () => {
  const f = crearContexto();
  const datos = Object.freeze({ nombre: '  Mantenimiento general  ', responsable: 'operador' });
  assert.deepEqual(await f.servicio.crear(datos), {
    success: true, message: 'Centro de costo creado exitosamente'
  });
  assert.equal(f.repositorio.crear.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.crear.mock.calls[0].arguments, ['Mantenimiento general', 'operador']);
  assert.equal(datos.nombre, '  Mantenimiento general  ');
});

test('Centros de costo: crear rechaza nombres ausentes o vacíos antes de llamar al repositorio', async () => {
  const f = crearContexto();
  for (const nombre of [undefined, null, '', '   ', '\t\n']) {
    await assert.rejects(f.servicio.crear({ nombre, responsable: 'operador' }), {
      message: 'El nombre del centro de costo es obligatorio'
    });
  }
  assert.equal(f.repositorio.crear.mock.callCount(), 0);
});

test('Centros de costo: modificar conserva el identificador y elimina los espacios externos del nombre', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.modificar(12, ' \tProducción primaria\n '), {
    success: true, message: 'Centro de costo modificado exitosamente'
  });
  assert.equal(f.repositorio.modificar.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.modificar.mock.calls[0].arguments, [12, 'Producción primaria']);
});

test('Centros de costo: modificar rechaza nombres ausentes o vacíos antes de solicitar una escritura', async () => {
  const f = crearContexto();
  for (const nombre of [undefined, null, '', '   ', '\t\n']) {
    await assert.rejects(f.servicio.modificar(12, nombre), {
      message: 'El nombre del centro de costo es obligatorio'
    });
  }
  assert.equal(f.repositorio.modificar.mock.callCount(), 0);
});

test('Centros de costo: eliminar comprueba primero que no esté utilizado en órdenes de compra', async () => {
  const pasos = [];
  const f = crearContexto({
    existeEnOrdenes: mock.fn(async () => { pasos.push('comprobar uso'); return false; }),
    eliminar: mock.fn(async () => { pasos.push('eliminar'); })
  });
  assert.deepEqual(await f.servicio.eliminar(12), {
    success: true, message: 'Centro de costo eliminado exitosamente'
  });
  assert.deepEqual(pasos, ['comprobar uso', 'eliminar']);
  assert.equal(f.repositorio.existeEnOrdenes.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.existeEnOrdenes.mock.calls[0].arguments, [12]);
  assert.equal(f.repositorio.eliminar.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.eliminar.mock.calls[0].arguments, [12]);
});

test('Centros de costo: eliminar rechaza un centro utilizado en órdenes de compra y evita borrarlo', async () => {
  const f = crearContexto({ existeEnOrdenes: mock.fn(async () => true) });
  await assert.rejects(f.servicio.eliminar(12), {
    message: 'No se puede eliminar el centro de costo porque está siendo utilizado en órdenes de compra'
  });
  assert.deepEqual(f.repositorio.existeEnOrdenes.mock.calls[0].arguments, [12]);
  assert.equal(f.repositorio.eliminar.mock.callCount(), 0);
});

test('Centros de costo: una falla al comprobar el uso impide eliminar el centro', async () => {
  const error = new Error('Falló la consulta de órdenes');
  const f = crearContexto({ existeEnOrdenes: mock.fn(async () => { throw error; }) });
  await assert.rejects(f.servicio.eliminar(12), recibido => recibido === error);
  assert.equal(f.repositorio.eliminar.mock.callCount(), 0);
});

for (const caso of [{ activo: true, estado: 'activado' }, { activo: false, estado: 'desactivado' }]) {
  test(`Centros de costo: cambiar el estado a ${caso.estado} conserva el valor solicitado`, async () => {
    const f = crearContexto();
    assert.deepEqual(await f.servicio.cambiarEstado(12, caso.activo), {
      success: true, message: `Centro de costo ${caso.estado} exitosamente`
    });
    assert.equal(f.repositorio.cambiarEstado.mock.callCount(), 1);
    assert.deepEqual(f.repositorio.cambiarEstado.mock.calls[0].arguments, [12, caso.activo]);
  });
}

test('Centros de costo: listar usa la primera página y un límite de diez si se omiten los parámetros', async () => {
  const listado = { data: [{ id: 12, nombre: 'Mantenimiento' }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } };
  const f = crearContexto({ obtenerTodos: mock.fn(async () => listado) });
  assert.equal(await f.servicio.obtenerTodos(), listado);
  assert.equal(f.repositorio.obtenerTodos.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.obtenerTodos.mock.calls[0].arguments, [1, 10]);
});

test('Centros de costo: listar respeta la página y el límite recibidos y conserva los metadatos', async () => {
  const listado = { data: [{ id: 12, nombre: 'Mantenimiento' }], pagination: { page: 3, limit: 5, total: 13, totalPages: 3 } };
  const f = crearContexto({ obtenerTodos: mock.fn(async () => listado) });
  assert.equal(await f.servicio.obtenerTodos(3, 5), listado);
  assert.equal(f.repositorio.obtenerTodos.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.obtenerTodos.mock.calls[0].arguments, [3, 5]);
});

test('Centros de costo: listar admite un resultado vacío sin transformarlo en un error', async () => {
  const listado = { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  const f = crearContexto({ obtenerTodos: mock.fn(async () => listado) });
  assert.deepEqual(await f.servicio.obtenerTodos(), listado);
});

test('Centros de costo: consultar los activos conserva los resultados y admite una lista vacía', async () => {
  for (const centros of [[{ id: 12, nombre: 'Mantenimiento' }], []]) {
    const f = crearContexto({ obtenerActivos: mock.fn(async () => centros) });
    assert.equal(await f.servicio.obtenerActivos(), centros);
    assert.equal(f.repositorio.obtenerActivos.mock.callCount(), 1);
    assert.deepEqual(f.repositorio.obtenerActivos.mock.calls[0].arguments, []);
  }
});

test('Centros de costo: buscar por identificador devuelve todos los datos encontrados', async () => {
  const centro = Object.freeze({ id: 12, nombre: 'Mantenimiento', responsable: 'operador', activo: 1 });
  const f = crearContexto({ obtenerPorId: mock.fn(async () => centro) });
  assert.equal(await f.servicio.obtenerPorId(12), centro);
  assert.equal(f.repositorio.obtenerPorId.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, [12]);
});

test('Centros de costo: buscar informa que el centro no existe cuando no se encuentra un registro', async () => {
  for (const resultado of [null, undefined]) {
    const f = crearContexto({ obtenerPorId: mock.fn(async () => resultado) });
    await assert.rejects(f.servicio.obtenerPorId(12), { message: 'Centro de costo no encontrado' });
    assert.equal(f.repositorio.obtenerPorId.mock.callCount(), 1);
  }
});

for (const caso of [
  { nombre: 'crear', metodo: 'crear', argumentos: [{ nombre: 'Mantenimiento', responsable: 'operador' }] },
  { nombre: 'modificar', metodo: 'modificar', argumentos: [12, 'Producción'] },
  { nombre: 'eliminar', metodo: 'eliminar', argumentos: [12] },
  { nombre: 'cambiar el estado', metodo: 'cambiarEstado', argumentos: [12, true] },
  { nombre: 'listar', metodo: 'obtenerTodos', argumentos: [1, 10] },
  { nombre: 'consultar los activos', metodo: 'obtenerActivos', argumentos: [] },
  { nombre: 'buscar por identificador', metodo: 'obtenerPorId', argumentos: [12] }
]) {
  test(`Centros de costo: ${caso.nombre} propaga el error original del repositorio`, async () => {
    const error = Object.assign(new Error('Falla simulada del repositorio'), { code: 'ERROR_SIMULADO' });
    const f = crearContexto({ [caso.metodo]: mock.fn(async () => { throw error; }) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), recibido => recibido === error);
    assert.equal(f.repositorio[caso.metodo].mock.callCount(), 1);
  });
}
