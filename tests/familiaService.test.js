const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

mock.method(console, 'error', () => {});

function crearContexto(reemplazos = {}) {
  const repositorio = {
    crearFamilia: mock.fn(async () => true),
    modificarFamilia: mock.fn(async () => true),
    eliminarFamilia: mock.fn(async () => true),
    obtenerTodas: mock.fn(async () => ({ data: [], pagination: {} })),
    obtenerPorId: mock.fn(async () => null),
    ...reemplazos
  };
  const servicio = cargarServicio('familiaService', {
    '../repositories/familiaRepository': repositorio
  });
  return { servicio, repositorio };
}

test('Familias: crear normaliza el nombre y conserva el responsable sin modificar los datos originales', async () => {
  const f = crearContexto();
  const datos = Object.freeze({ nombre: '  Repuestos hidráulicos  ', responsable: 'operador' });
  const resultado = await f.servicio.crearFamilia(datos);
  assert.deepEqual(resultado, { success: true, message: 'Familia creada exitosamente' });
  assert.equal(f.repositorio.crearFamilia.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.crearFamilia.mock.calls[0].arguments, ['Repuestos hidráulicos', 'operador']);
  assert.equal(datos.nombre, '  Repuestos hidráulicos  ');
});

test('Familias: crear rechaza nombres ausentes o vacíos antes de llamar al repositorio', async () => {
  const f = crearContexto();
  for (const nombre of [undefined, null, '', '   ', '\t\n']) {
    await assert.rejects(f.servicio.crearFamilia({ nombre, responsable: 'operador' }), {
      message: 'El nombre de la familia es obligatorio'
    });
  }
  assert.equal(f.repositorio.crearFamilia.mock.callCount(), 0);
});

test('Familias: modificar conserva el identificador y elimina los espacios externos del nombre', async () => {
  const f = crearContexto();
  const resultado = await f.servicio.modificarFamilia(12, ' \tMaterial eléctrico\n ');
  assert.deepEqual(resultado, { success: true, message: 'Familia modificada exitosamente' });
  assert.equal(f.repositorio.modificarFamilia.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.modificarFamilia.mock.calls[0].arguments, [12, 'Material eléctrico']);
});

test('Familias: modificar rechaza nombres ausentes o vacíos antes de solicitar una escritura', async () => {
  const f = crearContexto();
  for (const nombre of [undefined, null, '', '   ', '\t\n']) {
    await assert.rejects(f.servicio.modificarFamilia(12, nombre), {
      message: 'El nombre de la familia es obligatorio'
    });
  }
  assert.equal(f.repositorio.modificarFamilia.mock.callCount(), 0);
});

test('Familias: eliminar solicita únicamente el identificador indicado y devuelve la confirmación', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.eliminarFamilia(12), {
    success: true, message: 'Familia eliminada exitosamente'
  });
  assert.equal(f.repositorio.eliminarFamilia.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.eliminarFamilia.mock.calls[0].arguments, [12]);
});

test('Familias: listar usa la primera página y un límite de diez si se omiten los parámetros', async () => {
  const listado = { data: [{ id: 12, nombre: 'Repuestos' }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } };
  const f = crearContexto({ obtenerTodas: mock.fn(async () => listado) });
  assert.equal(await f.servicio.obtenerTodas(), listado);
  assert.equal(f.repositorio.obtenerTodas.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.obtenerTodas.mock.calls[0].arguments, [1, 10]);
});

test('Familias: listar respeta la página y el límite solicitados y conserva los metadatos', async () => {
  const listado = { data: [{ id: 12, nombre: 'Repuestos' }], pagination: { page: 3, limit: 5, total: 13, totalPages: 3 } };
  const f = crearContexto({ obtenerTodas: mock.fn(async () => listado) });
  assert.equal(await f.servicio.obtenerTodas(3, 5), listado);
  assert.equal(f.repositorio.obtenerTodas.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.obtenerTodas.mock.calls[0].arguments, [3, 5]);
});

test('Familias: listar admite un resultado vacío sin transformarlo en un error', async () => {
  const listado = { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  const f = crearContexto({ obtenerTodas: mock.fn(async () => listado) });
  assert.deepEqual(await f.servicio.obtenerTodas(), listado);
});

test('Familias: buscar por identificador devuelve todos los datos encontrados', async () => {
  const familia = Object.freeze({ id: 12, nombre: 'Repuestos', responsable: 'operador' });
  const f = crearContexto({ obtenerPorId: mock.fn(async () => familia) });
  assert.equal(await f.servicio.obtenerPorId(12), familia);
  assert.equal(f.repositorio.obtenerPorId.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, [12]);
});

test('Familias: buscar informa que la familia no existe cuando el repositorio no encuentra un registro', async () => {
  for (const resultado of [null, undefined]) {
    const f = crearContexto({ obtenerPorId: mock.fn(async () => resultado) });
    await assert.rejects(f.servicio.obtenerPorId(12), { message: 'Familia no encontrada' });
    assert.equal(f.repositorio.obtenerPorId.mock.callCount(), 1);
  }
});

for (const caso of [
  { nombre: 'crear', metodo: 'crearFamilia', argumentos: [{ nombre: 'Repuestos', responsable: 'operador' }] },
  { nombre: 'modificar', metodo: 'modificarFamilia', argumentos: [12, 'Material eléctrico'] },
  { nombre: 'eliminar', metodo: 'eliminarFamilia', argumentos: [12] },
  { nombre: 'listar', metodo: 'obtenerTodas', argumentos: [1, 10] },
  { nombre: 'buscar por identificador', metodo: 'obtenerPorId', argumentos: [12] }
]) {
  test(`Familias: ${caso.nombre} propaga el error original del repositorio sin informar éxito`, async () => {
    const error = Object.assign(new Error('Falla simulada del repositorio'), { code: 'ERROR_SIMULADO' });
    const f = crearContexto({ [caso.metodo]: mock.fn(async () => { throw error; }) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), recibido => recibido === error);
    assert.equal(f.repositorio[caso.metodo].mock.callCount(), 1);
  });
}
