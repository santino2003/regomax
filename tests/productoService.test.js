const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

mock.method(console, 'error', () => {});

function datosValidos(cambios = {}) {
  return { nombre: 'Granulado', unidad: 'kg', enStock: true, creadoPor: 'operador', ...cambios };
}

function crearContexto(reemplazos = {}) {
  const repositorio = {
    obtenerPorNombre: mock.fn(async () => null),
    obtenerPorId: mock.fn(async () => ({ id: 12, nombre: 'Granulado' })),
    crearProducto: mock.fn(async () => ({ id: 12 })), actualizarProducto: mock.fn(async () => true),
    eliminarProducto: mock.fn(async () => true), obtenerTodos: mock.fn(async () => []),
    obtenerProductosEnStock: mock.fn(async () => []), ...reemplazos
  };
  return { repositorio, servicio: cargarServicio('productoService', {
    '../repositories/productoRepository': repositorio
  }) };
}

test('Productos: crear conserva los datos y devuelve el resultado del repositorio', async () => {
  const resultado = { id: 12, creado: true };
  const f = crearContexto({ crearProducto: mock.fn(async () => resultado) });
  const datos = Object.freeze(datosValidos());
  assert.equal(await f.servicio.crearProducto(datos), resultado);
  assert.deepEqual(f.repositorio.obtenerPorNombre.mock.calls[0].arguments, ['Granulado']);
  assert.deepEqual(f.repositorio.crearProducto.mock.calls[0].arguments, ['Granulado', 'kg', true, 'operador', null]);
});

for (const caso of [
  { metodo: 'crearProducto', argumentos: datos => [datos], prefijo: 'crear' },
  { metodo: 'actualizarProducto', argumentos: datos => [12, datos], prefijo: 'actualizar' }
]) {
  for (const campo of ['nombre', 'unidad']) {
    test(`Productos: ${caso.metodo} rechaza ${campo} ausente antes de consultar o escribir`, async () => {
      const f = crearContexto();
      for (const valor of [undefined, null, '']) {
        await assert.rejects(f.servicio[caso.metodo](...caso.argumentos(datosValidos({ [campo]: valor }))), {
          message: `Error al ${caso.prefijo} producto: El nombre y la unidad son obligatorios`
        });
      }
      assert.equal(f.repositorio.obtenerPorNombre.mock.callCount(), 0);
      assert.equal(f.repositorio.obtenerPorId.mock.callCount(), 0);
      assert.equal(f.repositorio[caso.metodo].mock.callCount(), 0);
    });
  }
  test(`Productos: ${caso.metodo} convierte los bienes asociados sin modificar la entrada`, async () => {
    const f = crearContexto();
    const bienes = Object.freeze([
      Object.freeze({ bien_id: '7', cantidad: '2.5' }), Object.freeze({ bien_id: '8' })
    ]);
    await f.servicio[caso.metodo](...caso.argumentos(Object.freeze(datosValidos({ bienes }))));
    const argumentos = f.repositorio[caso.metodo].mock.calls[0].arguments;
    assert.deepEqual(argumentos.at(-1), [{ bien_id: 7, cantidad: 2.5 }, { bien_id: 8, cantidad: 1 }]);
  });
  test(`Productos: ${caso.metodo} usa null cuando no se informan bienes asociados`, async () => {
    for (const bienes of [undefined, null, [], {}]) {
      const f = crearContexto();
      await f.servicio[caso.metodo](...caso.argumentos(datosValidos({ bienes })));
      assert.equal(f.repositorio[caso.metodo].mock.calls[0].arguments.at(-1), null);
    }
  });
}

test('Productos: crear rechaza un nombre existente antes de guardar', async () => {
  const f = crearContexto({ obtenerPorNombre: mock.fn(async () => ({ id: 20 })) });
  await assert.rejects(f.servicio.crearProducto(datosValidos()), {
    message: 'Error al crear producto: Ya existe un producto con este nombre'
  });
  assert.equal(f.repositorio.crearProducto.mock.callCount(), 0);
});

test('Productos: actualizar sin cambiar el nombre evita una consulta adicional y conserva el identificador', async () => {
  const f = crearContexto();
  assert.equal(await f.servicio.actualizarProducto('12', datosValidos({ enStock: false })), true);
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, ['12']);
  assert.equal(f.repositorio.obtenerPorNombre.mock.callCount(), 0);
  assert.deepEqual(f.repositorio.actualizarProducto.mock.calls[0].arguments, ['12', 'Granulado', 'kg', false, null]);
});

test('Productos: actualizar permite cambiar a un nombre disponible', async () => {
  const f = crearContexto();
  await f.servicio.actualizarProducto(12, datosValidos({ nombre: 'Polvo' }));
  assert.deepEqual(f.repositorio.obtenerPorNombre.mock.calls[0].arguments, ['Polvo']);
  assert.deepEqual(f.repositorio.actualizarProducto.mock.calls[0].arguments, [12, 'Polvo', 'kg', true, null]);
});

test('Productos: actualizar rechaza un nombre que pertenece a otro producto', async () => {
  const f = crearContexto({ obtenerPorNombre: mock.fn(async () => ({ id: 20, nombre: 'Polvo' })) });
  await assert.rejects(f.servicio.actualizarProducto(12, datosValidos({ nombre: 'Polvo' })), {
    message: 'Error al actualizar producto: Ya existe otro producto con este nombre'
  });
  assert.equal(f.repositorio.actualizarProducto.mock.callCount(), 0);
});

test('Productos: actualizar admite que la búsqueda del nuevo nombre encuentre el mismo identificador numérico', async () => {
  const f = crearContexto({ obtenerPorNombre: mock.fn(async () => ({ id: 12, nombre: 'Polvo' })) });
  await f.servicio.actualizarProducto('12', datosValidos({ nombre: 'Polvo' }));
  assert.equal(f.repositorio.actualizarProducto.mock.callCount(), 1);
});

for (const caso of [
  { metodo: 'obtenerProductoPorId', argumentos: [12], prefijo: 'obtener' },
  { metodo: 'actualizarProducto', argumentos: [12, datosValidos()], prefijo: 'actualizar' },
  { metodo: 'eliminarProducto', argumentos: [12], prefijo: 'eliminar' }
]) {
  test(`Productos: ${caso.metodo} informa un producto inexistente sin escribir`, async () => {
    const f = crearContexto({ obtenerPorId: mock.fn(async () => null) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), {
      message: `Error al ${caso.prefijo} producto: Producto no encontrado`
    });
    assert.equal(f.repositorio.actualizarProducto.mock.callCount(), 0);
    assert.equal(f.repositorio.eliminarProducto.mock.callCount(), 0);
  });
}

test('Productos: buscar conserva todos los datos del registro', async () => {
  const producto = Object.freeze({ id: 12, nombre: 'Granulado', bienes: [{ bien_id: 7, cantidad: 2 }] });
  const f = crearContexto({ obtenerPorId: mock.fn(async () => producto) });
  assert.equal(await f.servicio.obtenerProductoPorId(12), producto);
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, [12]);
});

test('Productos: eliminar verifica la existencia y devuelve el resultado del repositorio', async () => {
  const f = crearContexto({ eliminarProducto: mock.fn(async () => false) });
  assert.equal(await f.servicio.eliminarProducto(12), false);
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, [12]);
  assert.deepEqual(f.repositorio.eliminarProducto.mock.calls[0].arguments, [12]);
});

for (const caso of [
  { metodo: 'obtenerTodosLosProductos', dependencia: 'obtenerTodos' },
  { metodo: 'obtenerProductosEnStock', dependencia: 'obtenerProductosEnStock' }
]) {
  test(`Productos: ${caso.metodo} conserva los registros y admite una lista vacía`, async () => {
    for (const registros of [[{ id: 12, nombre: 'Granulado' }], []]) {
      const f = crearContexto({ [caso.dependencia]: mock.fn(async () => registros) });
      assert.equal(await f.servicio[caso.metodo](), registros);
      assert.deepEqual(f.repositorio[caso.dependencia].mock.calls[0].arguments, []);
    }
  });
}

for (const caso of [
  { metodo: 'crearProducto', dependencia: 'obtenerPorNombre', argumentos: [datosValidos()], prefijo: 'crear producto' },
  { metodo: 'crearProducto', dependencia: 'crearProducto', argumentos: [datosValidos()], prefijo: 'crear producto' },
  { metodo: 'actualizarProducto', dependencia: 'obtenerPorId', argumentos: [12, datosValidos()], prefijo: 'actualizar producto' },
  { metodo: 'actualizarProducto', dependencia: 'obtenerPorNombre', argumentos: [12, datosValidos({ nombre: 'Polvo' })], prefijo: 'actualizar producto' },
  { metodo: 'actualizarProducto', dependencia: 'actualizarProducto', argumentos: [12, datosValidos()], prefijo: 'actualizar producto' },
  { metodo: 'eliminarProducto', dependencia: 'obtenerPorId', argumentos: [12], prefijo: 'eliminar producto' },
  { metodo: 'eliminarProducto', dependencia: 'eliminarProducto', argumentos: [12], prefijo: 'eliminar producto' },
  { metodo: 'obtenerProductoPorId', dependencia: 'obtenerPorId', argumentos: [12], prefijo: 'obtener producto' },
  { metodo: 'obtenerTodosLosProductos', dependencia: 'obtenerTodos', argumentos: [], prefijo: 'obtener productos' },
  { metodo: 'obtenerProductosEnStock', dependencia: 'obtenerProductosEnStock', argumentos: [], prefijo: 'obtener productos en stock' }
]) {
  test(`Productos: ${caso.metodo} informa el error de ${caso.dependencia}`, async () => {
    const f = crearContexto({ [caso.dependencia]: mock.fn(async () => { throw new Error('Falla simulada'); }) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), { message: `Error al ${caso.prefijo}: Falla simulada` });
  });
}
