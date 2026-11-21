const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

mock.method(console, 'error', () => {});
mock.method(console, 'log', () => {});

function crearContexto() {
  const eventos = [];
  const repositorio = {
    getUltimaFecha: mock.fn(async () => null), getUltimoNumero: mock.fn(async () => 9),
    setUltimaFecha: mock.fn(async () => {}), setUltimoNumero: mock.fn(async () => {}),
    crearBolson: mock.fn(async () => { eventos.push('guardar'); return true; }),
    obtenerTodos: mock.fn(async () => ({ data: [], pagination: {} })),
    obtenerPorId: mock.fn(async () => ({ id: 1, codigo: 12345, producto: 'Polvo' })),
    obtenerPorCodigo: mock.fn(async () => ({ id: 1, codigo: 12345, producto: 'Polvo' })),
    obtenerEstadoDespachadoPorCodigo: mock.fn(async () => null),
    actualizarBolson: mock.fn(async () => true), eliminarBolson: mock.fn(async () => true),
    obtenerNoDespachados: mock.fn(async () => ({ data: [] })),
    obtenerDespachados: mock.fn(async () => ({ data: [] })),
    obtenerBolsonesDisponibles: mock.fn(async () => []), obtenerBolsonesNoAsociados: mock.fn(async () => [])
  };
  const productos = { obtenerPorNombre: mock.fn(async () => null) };
  const bienes = { descontarStock: mock.fn(async id => { eventos.push(`descontar-${id}`); }) };
  const despachos = { obtenerDetalleDespachoPorBolsonCodigo: mock.fn(async () => ({ cliente_final: 'Cliente' })) };
  const codigos = { generateNumericCode: mock.fn(() => 12345) };
  const imagen = mock.fn(async () => 'imagen-simulada');
  // El calendario se controla por la dependencia de formato, sin modificar el reloj global.
  const formato = mock.fn(fecha => fecha.getUTCFullYear() === 2000 ? '2000-01-01' : '2026-01-15');
  const servicio = cargarServicio('bolsonService', {
    '../repositories/bolsonRepository': repositorio,
    '../repositories/despachoRepository': despachos,
    '../repositories/productoRepository': productos,
    '../utils/barcodeGenerator': codigos, '../utils/imageBarcode': imagen,
    './bienService': bienes, 'date-fns': { format: formato },
    '../utils/fecha': { fechaActual: () => new Date('2026-01-15T12:34:00Z'), formatMySQLLocal: () => '2026-01-15 12:34:00' }
  });
  return { servicio, repositorio, productos, bienes, despachos, codigos, imagen, formato, eventos };
}

const datos = { producto: 'Polvo', peso: 25.5, precinto: 'P1', responsable: 'operador' };

test('Bolsones: crear exige producto, peso y precinto antes de consultar dependencias', async () => {
  const f = crearContexto();
  for (const cambio of [{ producto: '' }, { peso: null }, { peso: 0 }, { precinto: '' }]) {
    await assert.rejects(f.servicio.crearBolson({ ...datos, ...cambio }), /Datos incompletos/);
  }
  assert.equal(f.productos.obtenerPorNombre.mock.callCount(), 0);
  assert.equal(f.repositorio.crearBolson.mock.callCount(), 0);
});

test('Bolsones: crear incrementa la numeración del mismo día y devuelve el código y su imagen', async () => {
  const f = crearContexto();
  f.repositorio.getUltimaFecha.mock.mockImplementation(async () => '2026-01-15T12:00:00Z');
  assert.deepEqual(await f.servicio.crearBolson(datos), { success: true, codigo: 12345, barcodeBase64: 'imagen-simulada' });
  assert.deepEqual(f.productos.obtenerPorNombre.mock.calls[0].arguments, ['Polvo']);
  assert.deepEqual(f.repositorio.setUltimoNumero.mock.calls[0].arguments, [10]);
  assert.equal(f.repositorio.setUltimaFecha.mock.callCount(), 0);
  assert.deepEqual(f.codigos.generateNumericCode.mock.calls[0].arguments, [10]);
  assert.deepEqual(f.imagen.mock.calls[0].arguments, [12345]);
  const argumentos = f.repositorio.crearBolson.mock.calls[0].arguments;
  assert.deepEqual(argumentos.slice(0, 5), [12345, 'Polvo', 25.5, 'P1', '2026-01-15']);
  assert.match(argumentos[5], /^\d{2}:\d{2}$/);
  assert.equal(argumentos[6], 'operador');
});

test('Bolsones: crear reinicia la numeración si no hay fecha previa o corresponde a otro día', async () => {
  for (const fecha of [null, '2000-01-01T12:00:00Z']) {
    const f = crearContexto();
    f.repositorio.getUltimaFecha.mock.mockImplementation(async () => fecha);
    await f.servicio.crearBolson(datos);
    assert.deepEqual(f.repositorio.setUltimaFecha.mock.calls[0].arguments, ['2026-01-15']);
    assert.deepEqual(f.repositorio.setUltimoNumero.mock.calls[0].arguments, [1]);
    assert.deepEqual(f.codigos.generateNumericCode.mock.calls[0].arguments, [1]);
  }
});

test('Bolsones: crear convierte las cantidades de bienes asociados y descuenta después de guardar', async () => {
  const asociados = [{ bien_id: 2, cantidad: '0.25' }, { bien_id: 3, cantidad: '2.5' }];
  for (const bienes_asociados of [asociados, JSON.stringify(asociados)]) {
    const f = crearContexto();
    f.productos.obtenerPorNombre.mock.mockImplementation(async () => ({ bienes_asociados }));
    await f.servicio.crearBolson(datos);
    assert.deepEqual(f.bienes.descontarStock.mock.calls.map(llamada => llamada.arguments), [[2, 0.25], [3, 2.5]]);
    assert.deepEqual(f.eventos, ['guardar', 'descontar-2', 'descontar-3']);
  }
});

test('Bolsones: crear omite asociaciones vacías o incompletas', async () => {
  const f = crearContexto();
  f.productos.obtenerPorNombre.mock.mockImplementation(async () => ({ bienes_asociados: [{ cantidad: 2 }, { bien_id: 3 }, { bien_id: 4, cantidad: 0 }] }));
  assert.equal((await f.servicio.crearBolson(datos)).success, true);
  assert.equal(f.bienes.descontarStock.mock.callCount(), 0);
});

test('Bolsones: un JSON de asociaciones inválido se registra como error después de crear el bolsón', async () => {
  const f = crearContexto();
  f.productos.obtenerPorNombre.mock.mockImplementation(async () => ({ bienes_asociados: '{inválido' }));
  const erroresPrevios = console.error.mock.callCount();
  assert.equal((await f.servicio.crearBolson(datos)).success, true);
  assert.ok(console.error.mock.callCount() > erroresPrevios);
  assert.equal(f.bienes.descontarStock.mock.callCount(), 0);
});

test('Bolsones: el comportamiento actual registra la falla de un descuento y continúa con los demás bienes', async () => {
  const f = crearContexto();
  f.productos.obtenerPorNombre.mock.mockImplementation(async () => ({ bienes_asociados: [{ bien_id: 2, cantidad: 1 }, { bien_id: 3, cantidad: 2 }] }));
  f.bienes.descontarStock.mock.mockImplementation(async id => { if (id === 2) throw new Error('Stock insuficiente'); });
  assert.equal((await f.servicio.crearBolson(datos)).success, true);
  assert.deepEqual(f.bienes.descontarStock.mock.calls.map(llamada => llamada.arguments), [[2, 1], [3, 2]]);
});

test('Bolsones: una falla al generar la imagen evita guardar el bolsón', async () => {
  const f = crearContexto();
  f.imagen.mock.mockImplementation(async () => { throw new Error('Falló la imagen'); });
  await assert.rejects(f.servicio.crearBolson(datos), { message: 'Error al crear el bolson: Falló la imagen' });
  assert.equal(f.repositorio.crearBolson.mock.callCount(), 0);
});

test('Bolsones: una falla al guardar conserva el mensaje SQL y evita descontar bienes', async () => {
  const f = crearContexto();
  f.repositorio.crearBolson.mock.mockImplementation(async () => { throw Object.assign(new Error('Error general'), { sqlMessage: 'Código duplicado' }); });
  await assert.rejects(f.servicio.crearBolson(datos), { message: 'Error al crear el bolson: Código duplicado' });
  assert.equal(f.bienes.descontarStock.mock.callCount(), 0);
});

for (const caso of [{ metodo: 'obtenerPorId', argumento: 1 }, { metodo: 'obtenerPorCodigo', argumento: 12345 }]) {
  test(`Bolsones: ${caso.metodo} devuelve el registro encontrado`, async () => {
    const f = crearContexto();
    const registro = Object.freeze({ id: 1, codigo: 12345, producto: 'Polvo' });
    f.repositorio[caso.metodo].mock.mockImplementation(async () => registro);
    assert.equal(await f.servicio[caso.metodo](caso.argumento), registro);
    assert.deepEqual(f.repositorio[caso.metodo].mock.calls[0].arguments, [caso.argumento]);
  });

  test(`Bolsones: ${caso.metodo} informa que el registro no existe`, async () => {
    const f = crearContexto();
    f.repositorio[caso.metodo].mock.mockImplementation(async () => null);
    await assert.rejects(f.servicio[caso.metodo](caso.argumento), /no encontrado/);
  });
}

test('Bolsones: consultar el estado devuelve null cuando el código no existe', async () => {
  const f = crearContexto();
  assert.equal(await f.servicio.obtenerEstadoDespachado(12345), null);
  assert.equal(f.despachos.obtenerDetalleDespachoPorBolsonCodigo.mock.callCount(), 0);
});

test('Bolsones: el estado normaliza la marca de despacho y oculta los datos internos del parte diario', async () => {
  for (const marca of [0, '0', 1, '1']) {
    const f = crearContexto();
    const original = Object.freeze({ id: 1, codigo: 12345, despachado: marca, asociado_a_parte: 1, parte_diario_id: 9 });
    f.repositorio.obtenerEstadoDespachadoPorCodigo.mock.mockImplementation(async () => original);
    const resultado = await f.servicio.obtenerEstadoDespachado(12345);
    assert.equal(resultado.despachado, Number(marca) === 1);
    assert.equal(Object.hasOwn(resultado, 'asociado_a_parte'), false);
    assert.equal(Object.hasOwn(resultado, 'parte_diario_id'), false);
    assert.equal(original.despachado, marca);
    if (resultado.despachado) {
      assert.deepEqual(resultado.despachoDetalle, { cliente_final: 'Cliente' });
      assert.deepEqual(f.despachos.obtenerDetalleDespachoPorBolsonCodigo.mock.calls[0].arguments, [12345]);
    } else {
      assert.equal(f.despachos.obtenerDetalleDespachoPorBolsonCodigo.mock.callCount(), 0);
      assert.equal(Object.hasOwn(resultado, 'despachoDetalle'), false);
    }
  }
});

test('Bolsones: una falla al consultar el detalle del despacho se comunica al llamador', async () => {
  const f = crearContexto();
  f.repositorio.obtenerEstadoDespachadoPorCodigo.mock.mockImplementation(async () => ({ despachado: 1 }));
  f.despachos.obtenerDetalleDespachoPorBolsonCodigo.mock.mockImplementation(async () => { throw new Error('Falló el detalle'); });
  await assert.rejects(f.servicio.obtenerEstadoDespachado(12345), /Falló el detalle/);
});

test('Bolsones: actualizar valida los campos antes de consultar o escribir', async () => {
  const f = crearContexto();
  for (const cambio of [{ producto: '' }, { peso: null }, { precinto: '' }]) await assert.rejects(f.servicio.actualizar(1, { ...datos, ...cambio }), /Datos incompletos/);
  assert.equal(f.repositorio.obtenerPorId.mock.callCount(), 0);
  assert.equal(f.repositorio.actualizarBolson.mock.callCount(), 0);
});

test('Bolsones: actualizar conserva el identificador y los nuevos valores recibidos', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.actualizar(1, datos), { success: true, message: 'Bolsón actualizado exitosamente' });
  assert.deepEqual(f.repositorio.actualizarBolson.mock.calls[0].arguments, [1, 'Polvo', 25.5, 'P1']);
});

for (const metodo of ['actualizar', 'eliminar']) {
  test(`Bolsones: ${metodo} un identificador inexistente evita cualquier escritura`, async () => {
    const f = crearContexto();
    f.repositorio.obtenerPorId.mock.mockImplementation(async () => null);
    await assert.rejects(f.servicio[metodo](1, datos), /no encontrado/);
    assert.equal(f.repositorio.actualizarBolson.mock.callCount(), 0);
    assert.equal(f.repositorio.eliminarBolson.mock.callCount(), 0);
  });
}

test('Bolsones: eliminar solicita únicamente el identificador encontrado', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.eliminar(1), { success: true, message: 'Bolsón eliminado exitosamente' });
  assert.deepEqual(f.repositorio.eliminarBolson.mock.calls[0].arguments, [1]);
});

for (const metodo of ['obtenerTodos', 'obtenerNoDespachados', 'obtenerDespachados']) {
  test(`Bolsones: ${metodo} respeta los valores predeterminados y los filtros recibidos`, async () => {
    const f = crearContexto();
    const listado = { data: [{ id: 1 }], pagination: { page: 2, limit: 5, total: 8 } };
    f.repositorio[metodo].mock.mockImplementation(async () => listado);
    assert.equal(await f.servicio[metodo](), listado);
    const esperados = [1, 10, 'id', 'DESC'];
    if (metodo !== 'obtenerTodos') esperados.push({});
    assert.deepEqual(f.repositorio[metodo].mock.calls[0].arguments, esperados);
    const filtros = { producto: 'Polvo', precinto: 'P1' };
    assert.equal(await f.servicio[metodo](2, 5, 'peso', 'ASC', filtros), listado);
    const personalizados = [2, 5, 'peso', 'ASC'];
    if (metodo !== 'obtenerTodos') personalizados.push(filtros);
    assert.deepEqual(f.repositorio[metodo].mock.calls[1].arguments, personalizados);
  });
}

for (const caso of [
  { metodo: 'obtenerBolsonesDisponibles', dependencia: 'obtenerBolsonesDisponibles' },
  { metodo: 'obtenerBolsonesPendientes', dependencia: 'obtenerBolsonesNoAsociados' }
]) {
  test(`Bolsones: ${caso.metodo} conserva los resultados y admite una lista vacía`, async () => {
    for (const registros of [[{ id: 1, codigo: 12345 }], []]) {
      const f = crearContexto();
      f.repositorio[caso.dependencia].mock.mockImplementation(async () => registros);
      assert.equal(await f.servicio[caso.metodo](), registros);
    }
  });
}

for (const caso of [
  { metodo: 'obtenerTodos', dependencia: 'obtenerTodos', argumentos: [] },
  { metodo: 'obtenerPorId', dependencia: 'obtenerPorId', argumentos: [1] },
  { metodo: 'obtenerPorCodigo', dependencia: 'obtenerPorCodigo', argumentos: [12345] },
  { metodo: 'obtenerEstadoDespachado', dependencia: 'obtenerEstadoDespachadoPorCodigo', argumentos: [12345] },
  { metodo: 'actualizar', dependencia: 'actualizarBolson', argumentos: [1, datos] },
  { metodo: 'eliminar', dependencia: 'eliminarBolson', argumentos: [1] },
  { metodo: 'obtenerNoDespachados', dependencia: 'obtenerNoDespachados', argumentos: [] },
  { metodo: 'obtenerDespachados', dependencia: 'obtenerDespachados', argumentos: [] },
  { metodo: 'obtenerBolsonesDisponibles', dependencia: 'obtenerBolsonesDisponibles', argumentos: [] },
  { metodo: 'obtenerBolsonesPendientes', dependencia: 'obtenerBolsonesNoAsociados', argumentos: [] },
  { metodo: 'generarCodigoUnico', dependencia: 'getUltimaFecha', argumentos: [] }
]) {
  test(`Bolsones: ${caso.metodo} comunica una falla del repositorio`, async () => {
    const f = crearContexto();
    f.repositorio[caso.dependencia].mock.mockImplementation(async () => { throw new Error('Falla simulada del repositorio'); });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), /Falla simulada del repositorio/);
    assert.equal(f.repositorio[caso.dependencia].mock.callCount(), 1);
  });
}
