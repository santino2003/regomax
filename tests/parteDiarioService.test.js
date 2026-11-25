const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

mock.method(console, 'log', () => {});
mock.method(console, 'error', () => {});

function crearContexto(reemplazos = {}, reemplazosBolsones = {}) {
  const repositorio = {
    crearParteDiario: mock.fn(async () => 31), agregarDatosGrupo: mock.fn(async () => true),
    agregarChecklistPala: mock.fn(async () => true), asociarBolsonAParteDiario: mock.fn(async () => true),
    obtenerPartesDiarios: mock.fn(async () => ({ data: [], total: 0 })),
    obtenerParteDiarioPorId: mock.fn(async () => ({ id: 31 })),
    actualizarEstadoParteDiario: mock.fn(async () => true),
    obtenerPartesDiariosPorEstado: mock.fn(async () => []),
    actualizarParteDiario: mock.fn(async () => true), eliminarGruposDeParteDiario: mock.fn(async () => true),
    eliminarParteDiario: mock.fn(async () => true), ...reemplazos
  };
  const bolsones = { obtenerBolsonesNoAsociados: mock.fn(async () => []), ...reemplazosBolsones };
  return { repositorio, bolsones, servicio: cargarServicio('parteDiarioService', {
    '../repositories/parteDiarioRepository': repositorio, '../repositories/bolsonRepository': bolsones
  }) };
}

function datosValidos(cambios = {}) {
  return { fecha: '2026-11-20', turno: 'Mañana', responsable: 'operador', datosControl: {}, ...cambios };
}

test('Partes diarios: convertir a booleano reconoce los valores afirmativos y negativos', () => {
  const f = crearContexto();
  for (const valor of [true, 1, 2, -1, '1', 'true', 'si', 'yes', 'ok', 'on', 'checked', '  OK  ']) {
    assert.equal(f.servicio._convertirABooleano(valor), 1, `Valor afirmativo: ${valor}`);
  }
  for (const valor of [null, undefined, false, 0, '', '0', 'false', 'no', 'desconocido', {}, []]) {
    assert.equal(f.servicio._convertirABooleano(valor), 0, `Valor negativo: ${String(valor)}`);
  }
});

for (const campo of ['fecha', 'turno', 'datosControl']) {
  test(`Partes diarios: crear rechaza la ausencia de ${campo} antes de escribir`, async () => {
    const f = crearContexto();
    await assert.rejects(f.servicio.crearParteDiario(datosValidos({ [campo]: null })), {
      message: 'Error al crear el parte diario: Datos incompletos para crear el parte diario'
    });
    assert.equal(f.repositorio.crearParteDiario.mock.callCount(), 0);
    assert.equal(f.bolsones.obtenerBolsonesNoAsociados.mock.callCount(), 0);
  });
}

test('Partes diarios: crear convierte los controles y conserva los valores numéricos sin mutar la entrada', async () => {
  const f = crearContexto();
  const datosControl = Object.freeze({
    proteccionesVallas: 'OK', pref1EncendidoVacio: false, nivelLiquidoHidraulicoT1: 'Si',
    nivelLiquidoCajaT1: 'no', nivelLiqHidraulicoD1: true, cosFi: '0.95', temperaturaSalidaG1: 40
  });
  assert.deepEqual(await f.servicio.crearParteDiario(datosValidos({ datosControl })), {
    success: true, id: 31, bolsonesAsociados: 0
  });
  assert.deepEqual(f.repositorio.crearParteDiario.mock.calls[0].arguments, [
    '2026-11-20', 'Mañana', 'operador', {
      proteccionesVallas: 1, pref1EncendidoVacio: 0, nivelLiquidoHidraulicoT1: 1,
      nivelLiquidoCajaT1: 0, nivelLiqHidraulicoD1: 1, cosFi: '0.95', temperaturaSalidaG1: 40
    }
  ]);
});

test('Partes diarios: crear registra los grupos y asocia únicamente los bolsones pendientes', async () => {
  const f = crearContexto({}, { obtenerBolsonesNoAsociados: mock.fn(async () => [{ id: 8 }, { id: 9 }]) });
  const grupos = [
    { nombre: 'G1', kgPorHora: 100, porcentajeCarga: 80, porcentajeDebajo3350: 30, criba: 'A' },
    { nombre: 'G2', kgPorHora: 200, porcentajeCarga: 90, porcentajeDebajo3350: 40, criba: 'B' }
  ];
  assert.deepEqual(await f.servicio.crearParteDiario(datosValidos({ grupos })), {
    success: true, id: 31, bolsonesAsociados: 2
  });
  assert.deepEqual(f.repositorio.agregarDatosGrupo.mock.calls.map(c => c.arguments), [
    [31, 'G1', 100, 80, 30, 'A'], [31, 'G2', 200, 90, 40, 'B']
  ]);
  assert.deepEqual(f.repositorio.asociarBolsonAParteDiario.mock.calls.map(c => c.arguments), [[31, 8], [31, 9]]);
});

test('Partes diarios: crear formatea las horas y conserva las observaciones del checklist', async () => {
  const f = crearContexto();
  const checkListPala = Object.freeze({ horasEquipo: '12.5', observaciones: 'Revisar motor', lucesTrabajo: 'OK', frenos: 'no' });
  await f.servicio.crearParteDiario(datosValidos({ checkListPala }));
  assert.deepEqual(f.repositorio.agregarChecklistPala.mock.calls[0].arguments, [31, {
    horas_trabajadas: 12.5, observaciones: 'Revisar motor', lucesTrabajo: 1, frenos: 0
  }]);
});

test('Partes diarios: crear permite omitir grupos, checklist y bolsones pendientes', async () => {
  for (const pendientes of [[], null]) {
    const f = crearContexto({}, { obtenerBolsonesNoAsociados: mock.fn(async () => pendientes) });
    assert.equal((await f.servicio.crearParteDiario(datosValidos())).bolsonesAsociados, 0);
    assert.equal(f.repositorio.agregarDatosGrupo.mock.callCount(), 0);
    assert.equal(f.repositorio.agregarChecklistPala.mock.callCount(), 0);
    assert.equal(f.repositorio.asociarBolsonAParteDiario.mock.callCount(), 0);
  }
});

test('Partes diarios: las horas vacías o nulas del checklist se guardan como null', async () => {
  for (const horasEquipo of ['', null]) {
    const f = crearContexto();
    await f.servicio.crearParteDiario(datosValidos({ checkListPala: { horasEquipo } }));
    await f.servicio.actualizarParteDiario(31, { checkListPala: { horasEquipo } });
    for (const llamada of f.repositorio.agregarChecklistPala.mock.calls) {
      assert.deepEqual(llamada.arguments, [31, { horas_trabajadas: null }]);
    }
  }
});

for (const metodo of ['obtenerPartesDiarios', 'obtenerTodosPartesDiarios']) {
  test(`Partes diarios: ${metodo} conserva los registros y la paginación`, async () => {
    const resultado = { data: [{ id: 31 }], total: 9 };
    const f = crearContexto({ obtenerPartesDiarios: mock.fn(async () => resultado) });
    assert.equal(await f.servicio[metodo](), resultado);
    assert.equal(await f.servicio[metodo](3, 5), resultado);
    assert.deepEqual(f.repositorio.obtenerPartesDiarios.mock.calls.map(c => c.arguments), [[1, 10], [3, 5]]);
  });
}

test('Partes diarios: buscar por identificador y filtrar por estado conserva los resultados', async () => {
  const parte = { id: 31, turno: 'Mañana' };
  const listado = [{ id: 31 }];
  const f = crearContexto({
    obtenerParteDiarioPorId: mock.fn(async () => parte), obtenerPartesDiariosPorEstado: mock.fn(async () => listado)
  });
  assert.equal(await f.servicio.obtenerParteDiarioPorId(31), parte);
  assert.deepEqual(f.repositorio.obtenerParteDiarioPorId.mock.calls[0].arguments, [31]);
  assert.equal(await f.servicio.obtenerPartesDiariosPorEstado('aprobado'), listado);
  await f.servicio.obtenerPartesDiariosPorEstado('pendiente', 2, 5);
  assert.deepEqual(f.repositorio.obtenerPartesDiariosPorEstado.mock.calls.map(c => c.arguments), [
    ['aprobado', 1, 10], ['pendiente', 2, 5]
  ]);
});

test('Partes diarios: cambiar el estado admite pendiente y aprobado y conserva el aprobador', async () => {
  const f = crearContexto();
  for (const estado of ['pendiente', 'aprobado']) {
    assert.equal(await f.servicio.actualizarEstadoParteDiario(31, estado, 'supervisor'), true);
  }
  assert.deepEqual(f.repositorio.actualizarEstadoParteDiario.mock.calls.map(c => c.arguments), [
    [31, 'pendiente', 'supervisor'], [31, 'aprobado', 'supervisor']
  ]);
});

test('Partes diarios: cambiar a un estado desconocido no escribe', async () => {
  const f = crearContexto();
  await assert.rejects(f.servicio.actualizarEstadoParteDiario(31, 'cerrado', 'supervisor'), {
    message: 'Error al actualizar el estado del parte diario: Estado no válido. Debe ser uno de: pendiente, aprobado'
  });
  assert.equal(f.repositorio.actualizarEstadoParteDiario.mock.callCount(), 0);
});

test('Partes diarios: actualizar convierte controles, reemplaza grupos y normaliza los campos del checklist', async () => {
  const f = crearContexto();
  const datos = Object.freeze({
    fecha: '2026-11-21', turno: 'Tarde', responsable: 'supervisor', cosFi: 0.96,
    proteccionesVallas: 'OK', pref1EncendidoVacio: 'no', nivelLiquidoHidraulicoT1: true,
    nivelLiquidoCajaT1: 1, nivelLiqHidraulicoD1: false, temperaturaLiqHidT1: 30,
    temperaturaSalidaG1: 40, temperaturaSalidaG2: 41, temperaturaSalidaG3: 42,
    grupos: [{ nombre: 'G3', kgPorHora: 300, porcentajeCarga: 70, porcentajeDebajo3350: 20, criba: 'C' }],
    checkListPala: { horasEquipo: '7.25', observaciones: 'Revisado', lucesTrabajo: 'OK', nivelAceite: 'no' }
  });
  assert.deepEqual(await f.servicio.actualizarParteDiario(31, datos), {
    success: true, message: 'Parte diario actualizado correctamente', id: 31
  });
  assert.deepEqual(f.repositorio.actualizarParteDiario.mock.calls[0].arguments, [31, {
    fecha: '2026-11-21', turno: 'Tarde', responsable: 'supervisor', cosFi: 0.96,
    proteccionesVallas: 1, pref1EncendidoVacio: 0, nivelLiquidoHidraulicoT1: 1,
    nivelLiquidoCajaT1: 1, nivelLiqHidraulicoD1: 0, temperaturaLiqHidT1: 30,
    temperaturaSalidaG1: 40, temperaturaSalidaG2: 41, temperaturaSalidaG3: 42
  }]);
  assert.deepEqual(f.repositorio.eliminarGruposDeParteDiario.mock.calls[0].arguments, [31]);
  assert.deepEqual(f.repositorio.agregarDatosGrupo.mock.calls[0].arguments, [31, 'G3', 300, 70, 20, 'C']);
  assert.deepEqual(f.repositorio.agregarChecklistPala.mock.calls[0].arguments, [31, {
    horas_trabajadas: 7.25, observaciones: 'Revisado', luces_trabajo: 1, nivel_aceite: 0
  }]);
  assert.equal(f.bolsones.obtenerBolsonesNoAsociados.mock.callCount(), 0);
});

test('Partes diarios: actualizar datos principales sin grupos ni checklist conserva esos componentes', async () => {
  const f = crearContexto();
  await f.servicio.actualizarParteDiario(31, { fecha: '2026-11-21' });
  assert.equal(f.repositorio.actualizarParteDiario.mock.callCount(), 1);
  assert.equal(f.repositorio.eliminarGruposDeParteDiario.mock.callCount(), 0);
  assert.equal(f.repositorio.agregarDatosGrupo.mock.callCount(), 0);
  assert.equal(f.repositorio.agregarChecklistPala.mock.callCount(), 0);
});

test('Partes diarios: eliminar devuelve el resultado del repositorio', async () => {
  const f = crearContexto({ eliminarParteDiario: mock.fn(async () => false) });
  assert.equal(await f.servicio.eliminarParteDiario(31), false);
  assert.deepEqual(f.repositorio.eliminarParteDiario.mock.calls[0].arguments, [31]);
});

for (const caso of [
  { metodo: 'obtenerParteDiarioPorId', argumentos: [31], prefijo: 'obtener el parte diario' },
  { metodo: 'actualizarEstadoParteDiario', argumentos: [31, 'aprobado', 'supervisor'], prefijo: 'actualizar el estado del parte diario' },
  { metodo: 'actualizarParteDiario', argumentos: [31, {}], prefijo: 'actualizar el parte diario' },
  { metodo: 'eliminarParteDiario', argumentos: [31], prefijo: 'eliminar el parte diario' }
]) {
  test(`Partes diarios: ${caso.metodo} rechaza un registro inexistente sin escribir`, async () => {
    const f = crearContexto({ obtenerParteDiarioPorId: mock.fn(async () => null) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), {
      message: `Error al ${caso.prefijo}: Parte diario no encontrado`
    });
    assert.equal(f.repositorio.actualizarEstadoParteDiario.mock.callCount(), 0);
    assert.equal(f.repositorio.actualizarParteDiario.mock.callCount(), 0);
    assert.equal(f.repositorio.eliminarParteDiario.mock.callCount(), 0);
  });
}

for (const caso of [
  { metodo: 'crearParteDiario', dependencia: 'crearParteDiario', argumentos: [datosValidos()], prefijo: 'crear el parte diario' },
  { metodo: 'crearParteDiario', dependencia: 'agregarDatosGrupo', argumentos: [datosValidos({ grupos: [{ nombre: 'G1' }] })], prefijo: 'crear el parte diario' },
  { metodo: 'crearParteDiario', dependencia: 'agregarChecklistPala', argumentos: [datosValidos({ checkListPala: {} })], prefijo: 'crear el parte diario' },
  { metodo: 'obtenerPartesDiarios', dependencia: 'obtenerPartesDiarios', argumentos: [], prefijo: 'obtener los partes diarios' },
  { metodo: 'obtenerTodosPartesDiarios', dependencia: 'obtenerPartesDiarios', argumentos: [], prefijo: 'obtener los partes diarios' },
  { metodo: 'obtenerParteDiarioPorId', dependencia: 'obtenerParteDiarioPorId', argumentos: [31], prefijo: 'obtener el parte diario' },
  { metodo: 'obtenerPartesDiariosPorEstado', dependencia: 'obtenerPartesDiariosPorEstado', argumentos: ['pendiente'], prefijo: 'obtener los partes diarios por estado' },
  { metodo: 'actualizarEstadoParteDiario', dependencia: 'actualizarEstadoParteDiario', argumentos: [31, 'aprobado', 'supervisor'], prefijo: 'actualizar el estado del parte diario' },
  { metodo: 'actualizarParteDiario', dependencia: 'actualizarParteDiario', argumentos: [31, {}], prefijo: 'actualizar el parte diario' },
  { metodo: 'actualizarParteDiario', dependencia: 'eliminarGruposDeParteDiario', argumentos: [31, { grupos: [{ nombre: 'G1' }] }], prefijo: 'actualizar el parte diario' },
  { metodo: 'eliminarParteDiario', dependencia: 'eliminarParteDiario', argumentos: [31], prefijo: 'eliminar el parte diario' }
]) {
  test(`Partes diarios: ${caso.metodo} informa el fallo de ${caso.dependencia}`, async () => {
    const f = crearContexto({ [caso.dependencia]: mock.fn(async () => { throw new Error('Falla simulada'); }) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), { message: `Error al ${caso.prefijo}: Falla simulada` });
  });
}

test('Partes diarios: si falla la consulta de bolsones no se intenta asociar ninguno', async () => {
  const f = crearContexto({}, { obtenerBolsonesNoAsociados: mock.fn(async () => { throw new Error('Falla simulada'); }) });
  await assert.rejects(f.servicio.crearParteDiario(datosValidos()), {
    message: 'Error al crear el parte diario: Falla simulada'
  });
  assert.equal(f.repositorio.asociarBolsonAParteDiario.mock.callCount(), 0);
});

test('Partes diarios: si falla una asociación se detiene el procesamiento de bolsones', async () => {
  const f = crearContexto({ asociarBolsonAParteDiario: mock.fn(async () => { throw new Error('Falla simulada'); }) }, {
    obtenerBolsonesNoAsociados: mock.fn(async () => [{ id: 8 }, { id: 9 }])
  });
  await assert.rejects(f.servicio.crearParteDiario(datosValidos()), {
    message: 'Error al crear el parte diario: Falla simulada'
  });
  assert.equal(f.repositorio.asociarBolsonAParteDiario.mock.callCount(), 1);
});
