const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

function datosValidos(cambios = {}) {
  return {
    fecha_pedido: '2026-11-20', estado: 'Pendiente', maquina: '  Molino  ',
    descripcion: '  Cambiar correa  ', mantenimiento: 'Correctivo', tipo: 'Mecanico',
    creado_por: 'operador', ...cambios
  };
}

function crearContexto(reemplazos = {}) {
  const repositorio = {
    crear: mock.fn(async () => 21), modificar: mock.fn(async () => true),
    obtenerTodos: mock.fn(async () => ({ data: [], total: 0 })),
    obtenerPorId: mock.fn(async () => ({ id: 21, creado_por: 'autor-original' })),
    ...reemplazos
  };
  return { repositorio, servicio: cargarServicio('ordenTrabajoService', {
    '../repositories/ordenTrabajoRepository': repositorio
  }) };
}

test('Órdenes de trabajo: crear normaliza los datos sin modificar el objeto recibido', async () => {
  const f = crearContexto();
  const datos = Object.freeze(datosValidos({ mantenimiento: ['Preventivo', 'Otro'], tipo: ['Electrico'] }));
  assert.deepEqual(await f.servicio.crear(datos), {
    success: true, id: 21, message: 'Orden de trabajo creada exitosamente'
  });
  assert.deepEqual(f.repositorio.crear.mock.calls[0].arguments, [{
    fecha_pedido: '2026-11-20', fecha_terminada: null, estado: 'Pendiente', asignado_a: null,
    personas_destinadas: null, maquina: 'Molino', descripcion: 'Cambiar correa',
    mantenimiento: 'Preventivo', tipo: 'Electrico', creado_por: 'operador'
  }]);
});

test('Órdenes de trabajo: validar conserva los campos opcionales y convierte la cantidad de personas', () => {
  const f = crearContexto();
  const datos = f.servicio.validar(datosValidos({
    fecha_terminada: '2026-11-21', asignado_a: 'técnico', personas_destinadas: '3', estado: 'Cerrada'
  }));
  assert.equal(datos.fecha_terminada, '2026-11-21');
  assert.equal(datos.asignado_a, 'técnico');
  assert.equal(datos.personas_destinadas, 3);
  assert.equal(datos.estado, 'Cerrada');
});

test('Órdenes de trabajo: personas destinadas admite cero y valores ausentes', () => {
  const f = crearContexto();
  for (const valor of [undefined, null, '']) {
    assert.equal(f.servicio.validar(datosValidos({ personas_destinadas: valor })).personas_destinadas, null);
  }
  assert.equal(f.servicio.validar(datosValidos({ personas_destinadas: 0 })).personas_destinadas, 0);
});

for (const caso of [
  { datos: { fecha_pedido: '' }, mensaje: 'La fecha de pedido es obligatoria' },
  { datos: { estado: 'aprobada' }, mensaje: 'El estado seleccionado no es válido' },
  { datos: { personas_destinadas: -1 }, mensaje: 'Personas destinadas debe ser un número entero mayor o igual a cero' },
  { datos: { personas_destinadas: 'ninguna' }, mensaje: 'Personas destinadas debe ser un número entero mayor o igual a cero' },
  { datos: { maquina: '  ' }, mensaje: 'La máquina es obligatoria' },
  { datos: { maquina: null }, mensaje: 'La máquina es obligatoria' },
  { datos: { descripcion: '  ' }, mensaje: 'La descripción es obligatoria' },
  { datos: { descripcion: null }, mensaje: 'La descripción es obligatoria' },
  { datos: { mantenimiento: [] }, mensaje: 'Debe seleccionar una opción de mantenimiento' },
  { datos: { tipo: '' }, mensaje: 'Debe seleccionar un tipo' },
  { datos: { mantenimiento: 'Urgente' }, mensaje: 'La opción "Urgente" no es válida para mantenimiento' },
  { datos: { tipo: 'Neumatico' }, mensaje: 'La opción "Neumatico" no es válida para tipo' }
]) {
  test(`Órdenes de trabajo: crear rechaza ${JSON.stringify(caso.datos)} antes de guardar`, async () => {
    const f = crearContexto();
    await assert.rejects(f.servicio.crear(datosValidos(caso.datos)), { message: caso.mensaje });
    assert.equal(f.repositorio.crear.mock.callCount(), 0);
  });
}

test('Órdenes de trabajo: validar admite todos los estados, mantenimientos y tipos disponibles', () => {
  const f = crearContexto();
  for (const estado of ['Pendiente', 'En Proceso', 'Cerrada']) {
    assert.equal(f.servicio.validar(datosValidos({ estado })).estado, estado);
  }
  for (const mantenimiento of ['Correctivo', 'Preventivo', 'Predictivo', 'Otro']) {
    assert.equal(f.servicio.validar(datosValidos({ mantenimiento })).mantenimiento, mantenimiento);
  }
  for (const tipo of ['Electrico', 'Mecanico', 'Hidraulico', 'Otro']) {
    assert.equal(f.servicio.validar(datosValidos({ tipo })).tipo, tipo);
  }
});

test('Órdenes de trabajo: modificar conserva el autor original aunque se envíe otro', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.modificar(21, datosValidos({ creado_por: 'otro' })), {
    success: true, id: 21, message: 'Orden de trabajo modificada exitosamente'
  });
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, [21]);
  const [id, datos] = f.repositorio.modificar.mock.calls[0].arguments;
  assert.equal(id, 21);
  assert.equal(datos.creado_por, 'autor-original');
  assert.equal(datos.maquina, 'Molino');
});

test('Órdenes de trabajo: modificar no escribe cuando los datos son inválidos', async () => {
  const f = crearContexto();
  await assert.rejects(f.servicio.modificar(21, datosValidos({ tipo: 'desconocido' })), {
    message: 'La opción "desconocido" no es válida para tipo'
  });
  assert.equal(f.repositorio.modificar.mock.callCount(), 0);
});

test('Órdenes de trabajo: buscar y modificar una orden inexistente informa el error', async () => {
  const f = crearContexto({ obtenerPorId: mock.fn(async () => null) });
  await assert.rejects(f.servicio.obtenerPorId(21), { message: 'Orden de trabajo no encontrada' });
  await assert.rejects(f.servicio.modificar(21, datosValidos()), { message: 'Orden de trabajo no encontrada' });
  assert.equal(f.repositorio.modificar.mock.callCount(), 0);
});

test('Órdenes de trabajo: buscar conserva el registro completo', async () => {
  const orden = Object.freeze({ id: 21, ...datosValidos() });
  const f = crearContexto({ obtenerPorId: mock.fn(async () => orden) });
  assert.equal(await f.servicio.obtenerPorId(21), orden);
});

test('Órdenes de trabajo: listar usa paginación y filtros predeterminados', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.obtenerTodos(), { data: [], total: 0 });
  assert.deepEqual(f.repositorio.obtenerTodos.mock.calls[0].arguments, [1, 10, {
    fecha_desde: '', fecha_hasta: '', maquina: '', estado: ''
  }]);
});

test('Órdenes de trabajo: listar normaliza los filtros y conserva el resultado paginado', async () => {
  const resultado = { data: [{ id: 21 }], total: 7 };
  const f = crearContexto({ obtenerTodos: mock.fn(async () => resultado) });
  const filtros = Object.freeze({ fecha_desde: '2026-11-01', fecha_hasta: '2026-11-30', maquina: 'Molino', estado: 'Cerrada', otro: true });
  assert.equal(await f.servicio.obtenerTodos(2, 5, filtros), resultado);
  assert.deepEqual(f.repositorio.obtenerTodos.mock.calls[0].arguments, [2, 5, {
    fecha_desde: '2026-11-01', fecha_hasta: '2026-11-30', maquina: 'Molino', estado: 'Cerrada'
  }]);
  assert.equal(f.servicio.normalizarFiltros({ estado: 'inexistente' }).estado, '');
});

for (const caso of [
  { metodo: 'crear', dependencia: 'crear', argumentos: [datosValidos()] },
  { metodo: 'modificar', dependencia: 'modificar', argumentos: [21, datosValidos()] },
  { metodo: 'modificar', dependencia: 'obtenerPorId', argumentos: [21, datosValidos()] },
  { metodo: 'obtenerTodos', dependencia: 'obtenerTodos', argumentos: [] },
  { metodo: 'obtenerPorId', dependencia: 'obtenerPorId', argumentos: [21] }
]) {
  test(`Órdenes de trabajo: ${caso.metodo} propaga el error de ${caso.dependencia}`, async () => {
    const error = new Error('Falla simulada del repositorio');
    const f = crearContexto({ [caso.dependencia]: mock.fn(async () => { throw error; }) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), recibido => recibido === error);
  });
}
