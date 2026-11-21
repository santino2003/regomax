const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

mock.method(console, 'error', () => {});

function datosValidos(cambios = {}) {
  return { nombre: 'Repuestos del Sur', contacto: 'Ana', telefono: '1123456789', email: 'ana@example.test',
    direccion: 'Calle 123', web: 'https://example.test', rubro: 'Repuestos', responsable: 'operador', ...cambios };
}

function crearContexto(reemplazos = {}) {
  const repositorio = {
    crearProveedor: mock.fn(async () => 7), obtenerTodos: mock.fn(async () => ({ data: [], total: 0 })),
    obtenerPorId: mock.fn(async () => ({ id: 7, nombre: 'Repuestos del Sur' })),
    eliminar: mock.fn(async () => true), actualizar: mock.fn(async () => true), ...reemplazos
  };
  return { repositorio, servicio: cargarServicio('proveedorService', {
    '../repositories/proveedorRepository': repositorio
  }) };
}

test('Proveedores: crear conserva todos los campos y el responsable sin modificar la entrada', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.crearProveedor(Object.freeze(datosValidos())), {
    success: true, message: 'Proveedor creado exitosamente'
  });
  assert.deepEqual(f.repositorio.crearProveedor.mock.calls[0].arguments, [
    'Repuestos del Sur', 'Ana', '1123456789', 'ana@example.test', 'Calle 123', 'https://example.test', 'Repuestos', 'operador'
  ]);
});

test('Proveedores: crear admite únicamente los campos obligatorios', async () => {
  const f = crearContexto();
  await f.servicio.crearProveedor({ nombre: 'Repuestos del Sur', contacto: 'Ana' });
  assert.deepEqual(f.repositorio.crearProveedor.mock.calls[0].arguments, [
    'Repuestos del Sur', 'Ana', undefined, undefined, undefined, undefined, undefined, undefined
  ]);
});

for (const campo of ['nombre', 'contacto']) {
  test(`Proveedores: crear rechaza ${campo} ausente antes de guardar`, async () => {
    const f = crearContexto();
    for (const valor of [undefined, null, '']) {
      await assert.rejects(f.servicio.crearProveedor(datosValidos({ [campo]: valor })), {
        message: 'Datos incompletos para crear el proveedor'
      });
    }
    assert.equal(f.repositorio.crearProveedor.mock.callCount(), 0);
  });
  test(`Proveedores: actualizar rechaza ${campo} ausente sin escribir`, async () => {
    const f = crearContexto();
    for (const valor of [undefined, null, '']) {
      await assert.rejects(f.servicio.actualizar(7, datosValidos({ [campo]: valor })), {
        message: 'Datos incompletos para actualizar el proveedor'
      });
    }
    assert.equal(f.repositorio.actualizar.mock.callCount(), 0);
  });
}

test('Proveedores: actualizar verifica la existencia y conserva los datos de contacto', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.actualizar(7, Object.freeze(datosValidos())), {
    success: true, message: 'Proveedor actualizado exitosamente'
  });
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, [7]);
  assert.deepEqual(f.repositorio.actualizar.mock.calls[0].arguments, [
    7, 'Repuestos del Sur', 'Ana', '1123456789', 'ana@example.test', 'Calle 123', 'https://example.test', 'Repuestos'
  ]);
});

test('Proveedores: actualizar permite omitir los campos opcionales', async () => {
  const f = crearContexto();
  await f.servicio.actualizar(7, { nombre: 'Repuestos del Sur', contacto: 'Ana' });
  assert.deepEqual(f.repositorio.actualizar.mock.calls[0].arguments, [
    7, 'Repuestos del Sur', 'Ana', undefined, undefined, undefined, undefined, undefined
  ]);
});

test('Proveedores: eliminar verifica la existencia y devuelve la confirmación', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.eliminar(7), { success: true, message: 'Proveedor eliminado exitosamente' });
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, [7]);
  assert.deepEqual(f.repositorio.eliminar.mock.calls[0].arguments, [7]);
});

test('Proveedores: buscar devuelve el registro completo', async () => {
  const proveedor = Object.freeze({ id: 7, ...datosValidos() });
  const f = crearContexto({ obtenerPorId: mock.fn(async () => proveedor) });
  assert.equal(await f.servicio.obtenerPorId(7), proveedor);
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, [7]);
});

for (const caso of [
  { metodo: 'obtenerPorId', argumentos: [7] }, { metodo: 'eliminar', argumentos: [7] },
  { metodo: 'actualizar', argumentos: [7, datosValidos()] }
]) {
  test(`Proveedores: ${caso.metodo} rechaza un proveedor inexistente sin escribir`, async () => {
    for (const registro of [null, undefined]) {
      const f = crearContexto({ obtenerPorId: mock.fn(async () => registro) });
      await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), { message: 'Proveedor no encontrado' });
      assert.equal(f.repositorio.eliminar.mock.callCount(), 0);
      assert.equal(f.repositorio.actualizar.mock.callCount(), 0);
    }
  });
}

test('Proveedores: listar utiliza filtros vacíos y paginación predeterminada', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.obtenerTodos(), { data: [], total: 0 });
  assert.deepEqual(f.repositorio.obtenerTodos.mock.calls[0].arguments, [{}, 1, 10]);
});

test('Proveedores: listar conserva filtros, página, límite y metadatos', async () => {
  const resultado = { data: [{ id: 7 }], pagination: { page: 2, limit: 5, total: 8 } };
  const filtros = Object.freeze({ nombre: 'Repuestos', rubro: 'Mantenimiento' });
  const f = crearContexto({ obtenerTodos: mock.fn(async () => resultado) });
  assert.equal(await f.servicio.obtenerTodos(filtros, 2, 5), resultado);
  assert.deepEqual(f.repositorio.obtenerTodos.mock.calls[0].arguments, [filtros, 2, 5]);
});

for (const caso of [
  { metodo: 'crearProveedor', dependencia: 'crearProveedor', argumentos: [datosValidos()] },
  { metodo: 'obtenerTodos', dependencia: 'obtenerTodos', argumentos: [] },
  { metodo: 'obtenerPorId', dependencia: 'obtenerPorId', argumentos: [7] },
  { metodo: 'eliminar', dependencia: 'obtenerPorId', argumentos: [7] },
  { metodo: 'eliminar', dependencia: 'eliminar', argumentos: [7] },
  { metodo: 'actualizar', dependencia: 'obtenerPorId', argumentos: [7, datosValidos()] },
  { metodo: 'actualizar', dependencia: 'actualizar', argumentos: [7, datosValidos()] }
]) {
  test(`Proveedores: ${caso.metodo} propaga el error original de ${caso.dependencia}`, async () => {
    const error = new Error('Falla simulada del repositorio');
    const f = crearContexto({ [caso.dependencia]: mock.fn(async () => { throw error; }) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), recibido => recibido === error);
  });
}
