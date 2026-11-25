const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

mock.method(console, 'log', () => {});
mock.method(console, 'error', () => {});

function crearContexto(cambios = {}) {
  const bolsones = {
    obtenerTodosBolsonesPorFecha: mock.fn(async () => []), obtenerBolsonesHastaFecha: mock.fn(async () => []),
    obtenerStockDelMes: mock.fn(async () => []), obtenerBolsonesEntreFechas: mock.fn(async () => []), ...cambios.bolsones
  };
  const despachos = {
    obtenerDespachosPorProducto: mock.fn(async () => []), obtenerDespachadosDelMesHastaFecha: mock.fn(async () => []),
    ...cambios.despachos
  };
  const nfu = {
    obtenerCantidadNFUPorFecha: mock.fn(async () => 0), obtenerCantidadNFUEntreFechas: mock.fn(async () => 0),
    obtenerCantidadNFUHastaFecha: mock.fn(async () => 0), ...cambios.nfu
  };
  const diasHabiles = { obtenerDiasHabilesSeleccionados: mock.fn(async () => [1, 2, 4, 5]), ...cambios.diasHabiles };
  const planificacion = {
    obtenerPlanificacion: mock.fn(async () => null),
    obtenerPlanificacionAcumuladaHastaFecha: mock.fn(async () => ({ productos: [] })), ...cambios.planificacion
  };
  const productos = { obtenerTodos: mock.fn(async () => []), ...cambios.productos };
  // Las ventanas y el formateo se simulan para verificar su uso desde el servicio.
  const fechas = {
    ventanaMesOperativo: mock.fn(fecha => ({ inicio: { formato: `${fecha.slice(0, 7)}-01 06:00:00` } })),
    ventanaTurnoDiario: mock.fn(fecha => {
      const siguiente = new Date(`${fecha}T12:00:00Z`);
      siguiente.setUTCDate(siguiente.getUTCDate() + 1);
      return { fin: { formato: `${siguiente.toISOString().slice(0, 10)} 05:59:59` } };
    }),
    formatMySQLLocal: mock.fn(valor => valor.formato || '2026-11-03 23:59:59'),
    parseLocalDate: mock.fn(fecha => new Date(`${fecha}T03:00:00Z`)), ...cambios.fechas
  };
  const db = { query: mock.fn(() => { throw new Error('No debe consultarse la base de datos'); }) };
  return { bolsones, despachos, nfu, diasHabiles, planificacion, productos, fechas, db,
    servicio: cargarServicio('reporteService', {
      '../repositories/bolsonRepository': bolsones, '../repositories/despachoRepository': despachos,
      '../repositories/nfuRepository': nfu, '../repositories/diasHabilesRepository': diasHabiles,
      '../repositories/planificacionRepository': planificacion, '../repositories/productoRepository': productos,
      '../utils/fecha': fechas, '../config/db': db
    })
  };
}

test('Reportes: producción diaria agrupa por identificador, suma pesos y ordena por nombre', async () => {
  const registros = Object.freeze([
    Object.freeze({ producto: 2, nombreProducto: 'Zeta', peso: '10.5' }),
    Object.freeze({ producto: 1, nombreProducto: 'Alfa', peso: '20' }),
    Object.freeze({ producto: 2, nombreProducto: 'Zeta', peso: null })
  ]);
  const f = crearContexto({ bolsones: { obtenerTodosBolsonesPorFecha: mock.fn(async () => registros) } });
  assert.deepEqual(await f.servicio.obtenerSumatoriaPorProducto('2026-11-03'), [
    { productoId: 1, nombre: 'Alfa', cantidadBolsones: 1, pesoTotal: 20 },
    { productoId: 2, nombre: 'Zeta', cantidadBolsones: 2, pesoTotal: 10.5 }
  ]);
  assert.deepEqual(f.bolsones.obtenerTodosBolsonesPorFecha.mock.calls[0].arguments, ['2026-11-03']);
});

test('Reportes: producción diaria distingue productos con el mismo nombre y admite nombres o pesos ausentes', async () => {
  const f = crearContexto({ bolsones: { obtenerTodosBolsonesPorFecha: mock.fn(async () => [
    { producto: 1, nombreProducto: 'Granulado', peso: '2.5' },
    { producto: 2, nombreProducto: 'Granulado', peso: 4 }, { producto: 3 }
  ]) } });
  assert.deepEqual(await f.servicio.obtenerSumatoriaPorProducto('2026-11-03'), [
    { productoId: 3, nombre: '3', cantidadBolsones: 1, pesoTotal: 0 },
    { productoId: 1, nombre: 'Granulado', cantidadBolsones: 1, pesoTotal: 2.5 },
    { productoId: 2, nombre: 'Granulado', cantidadBolsones: 1, pesoTotal: 4 }
  ]);
});

test('Reportes: los despachos diarios convierten cantidades y pesos y conservan el estado de stock', async () => {
  const registros = Object.freeze([
    Object.freeze({ productoId: 1, nombreProducto: 'Alfa', cantidadBolsones: '2', pesoTotal: '30.5', enStock: false }),
    Object.freeze({ productoId: 2, nombreProducto: '', cantidadBolsones: null, pesoTotal: null, enStock: true })
  ]);
  const f = crearContexto({ despachos: { obtenerDespachosPorProducto: mock.fn(async () => registros) } });
  assert.deepEqual(await f.servicio.obtenerDespachosPorProducto('2026-11-03'), [
    { productoId: 1, nombre: 'Alfa', cantidadBolsones: 2, pesoTotal: 30.5, enStock: false },
    { productoId: 2, nombre: '2', cantidadBolsones: 0, pesoTotal: 0, enStock: true }
  ]);
  assert.deepEqual(f.despachos.obtenerDespachosPorProducto.mock.calls[0].arguments, ['2026-11-03']);
});

for (const caso of [
  { metodo: 'obtenerStockAcumuladoHastaFecha', dependencia: 'obtenerBolsonesHastaFecha' },
  { metodo: 'obtenerStockAcumuladoDelMes', dependencia: 'obtenerStockDelMes' }
]) {
  test(`Reportes: ${caso.metodo} agrupa pesos por producto y conserva separados los identificadores`, async () => {
    const f = crearContexto({ bolsones: { [caso.dependencia]: mock.fn(async () => [
      { producto: 1, nombreProducto: 'Granulado', peso: '10.5' },
      { producto: 1, nombreProducto: 'Granulado', peso: 20 },
      { producto: 2, nombreProducto: 'Granulado', peso: 5 }, { producto: 3, peso: '' }
    ]) } });
    assert.deepEqual(await f.servicio[caso.metodo]('2026-11-03'), { productos: [
      { productoId: 1, nombre: 'Granulado', cantidadBolsones: 2, pesoTotal: 30.5 },
      { productoId: 2, nombre: 'Granulado', cantidadBolsones: 1, pesoTotal: 5 },
      { productoId: 3, nombre: '3', cantidadBolsones: 1, pesoTotal: 0 }
    ] });
    assert.deepEqual(f.bolsones[caso.dependencia].mock.calls[0].arguments, ['2026-11-03']);
  });
}

test('Reportes: los despachos mensuales convierten los valores del repositorio', async () => {
  const f = crearContexto({ despachos: { obtenerDespachadosDelMesHastaFecha: mock.fn(async () => [
    { productoId: 1, nombreProducto: 'Alfa', cantidadBolsones: '3', pesoTotal: '40.5' }, { productoId: 2 }
  ]) } });
  assert.deepEqual(await f.servicio.obtenerDespachosAcumuladosDelMes('2026-11-03'), { productos: [
    { productoId: 1, nombre: 'Alfa', cantidadBolsones: 3, pesoTotal: 40.5 },
    { productoId: 2, nombre: '2', cantidadBolsones: 0, pesoTotal: 0 }
  ] });
  assert.deepEqual(f.despachos.obtenerDespachadosDelMesHastaFecha.mock.calls[0].arguments, ['2026-11-03']);
});

for (const caso of [
  { metodo: 'obtenerSumatoriaPorProducto', resultado: [] }, { metodo: 'obtenerDespachosPorProducto', resultado: [] },
  { metodo: 'obtenerStockAcumuladoHastaFecha', resultado: { productos: [] } },
  { metodo: 'obtenerStockAcumuladoDelMes', resultado: { productos: [] } },
  { metodo: 'obtenerDespachosAcumuladosDelMes', resultado: { productos: [] } }
]) {
  test(`Reportes: ${caso.metodo} admite un resultado vacío sin consultar directamente la base`, async () => {
    const f = crearContexto();
    assert.deepEqual(await f.servicio[caso.metodo]('2026-11-03'), caso.resultado);
    assert.equal(f.db.query.mock.callCount(), 0);
  });
}

for (const caso of [
  { metodo: 'obtenerIngresoNFUPorFecha', dependencia: 'obtenerCantidadNFUPorFecha' },
  { metodo: 'obtenerNFUAcumuladoHastaFecha', dependencia: 'obtenerCantidadNFUHastaFecha' }
]) {
  test(`Reportes: ${caso.metodo} convierte el total y conserva la fecha solicitada`, async () => {
    for (const [valor, esperado] of [['12.5', 12.5], [null, 0], [undefined, 0], [0, 0]]) {
      const f = crearContexto({ nfu: { [caso.dependencia]: mock.fn(async () => valor) } });
      assert.deepEqual(await f.servicio[caso.metodo]('2026-11-03'), { fecha: '2026-11-03', cantidadTotal: esperado });
      assert.deepEqual(f.nfu[caso.dependencia].mock.calls[0].arguments, ['2026-11-03']);
    }
  });
}

test('Reportes: el NFU mensual consulta solo las fechas de los límites del mes y del turno', async () => {
  const f = crearContexto({ nfu: { obtenerCantidadNFUEntreFechas: mock.fn(async () => '120.5') } });
  assert.deepEqual(await f.servicio.obtenerNFUAcumuladoDelMes('2026-11-03'), {
    fechaInicio: '2026-11-01 06:00:00', fechaFin: '2026-11-04 05:59:59', cantidadTotal: 120.5
  });
  assert.deepEqual(f.fechas.ventanaMesOperativo.mock.calls[0].arguments, ['2026-11-03']);
  assert.deepEqual(f.fechas.ventanaTurnoDiario.mock.calls[0].arguments, ['2026-11-03']);
  assert.deepEqual(f.nfu.obtenerCantidadNFUEntreFechas.mock.calls[0].arguments, ['2026-11-01', '2026-11-04']);
});

test('Reportes: el NFU mensual usa cero cuando no hay ingresos', async () => {
  const f = crearContexto({ nfu: { obtenerCantidadNFUEntreFechas: mock.fn(async () => null) } });
  assert.equal((await f.servicio.obtenerNFUAcumuladoDelMes('2026-11-03')).cantidadTotal, 0);
});

test('Reportes: la planificación diaria reemplaza los identificadores conocidos por nombres de producto', async () => {
  const plan = Object.freeze({ productos: Object.freeze({ 1: '30.5', 99: 10 }) });
  const f = crearContexto({
    planificacion: { obtenerPlanificacion: mock.fn(async () => plan) },
    productos: { obtenerTodos: mock.fn(async () => [{ id: 1, nombre: 'Alfa' }]) }
  });
  assert.deepEqual(await f.servicio.obtenerPlanificacionPorFecha('2026-11-03'), {
    fecha: '2026-11-03', productos: { Alfa: '30.5', 99: 10 }
  });
  assert.deepEqual(f.planificacion.obtenerPlanificacion.mock.calls[0].arguments, [2026, 11, 3]);
  assert.deepEqual(f.productos.obtenerTodos.mock.calls[0].arguments, []);
});

test('Reportes: una planificación diaria inexistente evita consultar el catálogo de productos', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.obtenerPlanificacionPorFecha('2026-11-03'), { productos: {} });
  assert.equal(f.productos.obtenerTodos.mock.callCount(), 0);
});

test('Reportes: la planificación acumulada agrega un mapa por nombre sin descartar los datos originales', async () => {
  const datos = { productos: [{ productoId: 1, nombre: 'Alfa', kilosAcumulados: '90.5' },
    { productoId: 2, kilosAcumulados: 20 }], total: 110.5 };
  const f = crearContexto({ planificacion: { obtenerPlanificacionAcumuladaHastaFecha: mock.fn(async () => datos) } });
  assert.equal(await f.servicio.obtenerPlanificacionAcumuladaHastaFecha('2026-11-03'), datos);
  assert.deepEqual(datos.productosMap, { Alfa: '90.5' });
  assert.equal(datos.total, 110.5);
  assert.deepEqual(f.planificacion.obtenerPlanificacionAcumuladaHastaFecha.mock.calls[0].arguments, ['2026-11-03']);
});

test('Reportes: la planificación acumulada admite respuestas vacías o ausentes', async () => {
  for (const datos of [null, { productos: [] }]) {
    const f = crearContexto({ planificacion: { obtenerPlanificacionAcumuladaHastaFecha: mock.fn(async () => datos) } });
    assert.equal(await f.servicio.obtenerPlanificacionAcumuladaHastaFecha('2026-11-03'), datos);
  }
});

test('Reportes: el historial de producción suma cada ventana acumulada hasta el día seleccionado', async () => {
  const acumulados = {
    '2026-11-02 05:59:59': [{ peso: '10.5' }, { peso: 2 }],
    '2026-11-03 05:59:59': [{ peso: 20 }, { peso: null }, {}],
    '2026-11-04 05:59:59': []
  };
  const f = crearContexto({ bolsones: { obtenerBolsonesEntreFechas: mock.fn(async (inicio, fin) => acumulados[fin]) } });
  assert.deepEqual(await f.servicio.obtenerProduccionAcumuladaPorDia('2026-11-03'), [12.5, 20, 0]);
  assert.deepEqual(f.bolsones.obtenerBolsonesEntreFechas.mock.calls.map(c => c.arguments), [
    ['2026-11-01 06:00:00', '2026-11-02 05:59:59'], ['2026-11-01 06:00:00', '2026-11-03 05:59:59'],
    ['2026-11-01 06:00:00', '2026-11-04 05:59:59']
  ]);
});

test('Reportes: el historial de planificación suma por día y admite días sin planificación', async () => {
  const acumulados = {
    '2026-11-01': { productos: [{ kilosAcumulados: '10.5' }, { kilosAcumulados: 2 }] },
    '2026-11-02': null, '2026-11-03': { productos: [{ kilosAcumulados: 20 }, {}, { kilosAcumulados: null }] }
  };
  const f = crearContexto({ planificacion: { obtenerPlanificacionAcumuladaHastaFecha: mock.fn(async fecha => acumulados[fecha]) } });
  assert.deepEqual(await f.servicio.obtenerPlanificacionAcumuladaPorDia('2026-11-03'), [12.5, 0, 20]);
  assert.deepEqual(f.planificacion.obtenerPlanificacionAcumuladaHastaFecha.mock.calls.map(c => c.arguments), [
    ['2026-11-01'], ['2026-11-02'], ['2026-11-03']
  ]);
});

function crearReporteConDatos() {
  return crearContexto({
    bolsones: {
      obtenerTodosBolsonesPorFecha: mock.fn(async () => [
        { producto: 2, nombreProducto: 'Zeta', peso: '10.5' }, { producto: 1, nombreProducto: 'Alfa', peso: '20' }
      ]),
      obtenerStockDelMes: mock.fn(async () => [
        { producto: 1, nombreProducto: 'Alfa', peso: '100' }, { producto: 1, nombreProducto: 'Alfa', peso: 50 },
        { producto: 2, nombreProducto: 'Zeta', peso: 20 }
      ]),
      obtenerBolsonesHastaFecha: mock.fn(async () => [{ producto: 1, nombreProducto: 'Alfa', peso: 300 }]),
      obtenerBolsonesEntreFechas: mock.fn(async (inicio, fin) => [{ peso: {
        '2026-11-02 05:59:59': 40, '2026-11-03 05:59:59': 100, '2026-11-04 05:59:59': 150
      }[fin] }])
    },
    despachos: {
      obtenerDespachosPorProducto: mock.fn(async () => [
        { productoId: 1, nombreProducto: 'Alfa', cantidadBolsones: '1', pesoTotal: '25', enStock: true }
      ]),
      obtenerDespachadosDelMesHastaFecha: mock.fn(async () => [
        { productoId: 1, nombreProducto: 'Alfa', cantidadBolsones: '2', pesoTotal: '60' }
      ])
    },
    nfu: { obtenerCantidadNFUPorFecha: mock.fn(async () => '12.5'),
      obtenerCantidadNFUEntreFechas: mock.fn(async () => '100'), obtenerCantidadNFUHastaFecha: mock.fn(async () => '500') },
    productos: { obtenerTodos: mock.fn(async () => [{ id: 1, nombre: 'Alfa' }, { id: 2, nombre: 'Zeta' }]) },
    planificacion: {
      obtenerPlanificacion: mock.fn(async () => ({ productos: { 1: '30', 2: '40' } })),
      obtenerPlanificacionAcumuladaHastaFecha: mock.fn(async fecha => ({ productos: [
        { productoId: 1, nombre: 'Alfa', kilosAcumulados: fecha === '2026-11-03' ? '90' : '10' },
        { productoId: 2, nombre: 'Zeta', kilosAcumulados: fecha === '2026-11-03' ? '80' : '20' }
      ] }))
    }
  });
}

test('Reportes: el reporte completo combina producción, stock, despachos, planificación y proyecciones', async () => {
  const f = crearReporteConDatos();
  const reporte = await f.servicio.obtenerReporteCompleto('2026-11-03');
  assert.equal(reporte.fecha, '2026-11-03');
  assert.deepEqual(reporte.produccion, [
    { productoId: 1, nombre: 'Alfa', cantidadBolsones: 1, pesoTotal: 20, planificacion: 30, planificacionAcumulada: 90 },
    { productoId: 2, nombre: 'Zeta', cantidadBolsones: 1, pesoTotal: 10.5, planificacion: 40, planificacionAcumulada: 80 }
  ]);
  assert.deepEqual(reporte.stockAcumuladoMes, [
    { productoId: 1, nombre: 'Alfa', cantidadBolsones: 2, pesoTotal: 150, proyeccion: 300, planificacion: 30, planificacionAcumulada: 90 },
    { productoId: 2, nombre: 'Zeta', cantidadBolsones: 1, pesoTotal: 20, proyeccion: 40, planificacion: 40, planificacionAcumulada: 80 }
  ]);
  assert.deepEqual(reporte.despachos, [{ productoId: 1, nombre: 'Alfa', cantidadBolsones: 1, pesoTotal: 25, enStock: true }]);
  assert.deepEqual(reporte.despachosAcumuladosMes, [
    { productoId: 1, nombre: 'Alfa', cantidadBolsones: 2, pesoTotal: 60, proyeccion: 120, planificacion: 30 }
  ]);
  assert.deepEqual(reporte.stockAcumuladoHistorico, [
    { productoId: 1, nombre: 'Alfa', cantidadBolsones: 1, pesoTotal: 300, planificacion: 30 }
  ]);
  assert.deepEqual(reporte.nfu, {
    diario: { fecha: '2026-11-03', cantidadTotal: 12.5 },
    acumuladoMes: { fechaInicio: '2026-11-01 06:00:00', fechaFin: '2026-11-04 05:59:59', cantidadTotal: 100, proyeccion: 200 },
    acumuladoHistorico: { fecha: '2026-11-03', cantidadTotal: 500 }
  });
  assert.deepEqual(reporte.planificacionDiaria, { fecha: '2026-11-03', productos: { Alfa: '30', Zeta: '40' } });
  assert.deepEqual(reporte.planificacionAcumulada.productosMap, { Alfa: '90', Zeta: '80' });
  assert.deepEqual(reporte.datosHistoricosProduccion, [40, 100, 150]);
  assert.deepEqual(reporte.datosHistoricosPlanificacion, [30, 30, 170]);
  assert.deepEqual(reporte.proyeccionInfo, {
    nfu: { diasHabilesTotal: 4, diasHabilesTranscurridos: 2, proyeccion: { cantidadTotal: 200 } },
    produccion: { diasHabilesTotal: 4, diasHabilesTranscurridos: 2, proyeccion: { 1: 300, 2: 40 } },
    despachos: { diasHabilesTotal: 4, diasHabilesTranscurridos: 2, proyeccion: { 1: 120 } }
  });
  assert.ok(f.diasHabiles.obtenerDiasHabilesSeleccionados.mock.calls.every(c => c.arguments[0] === 11 && c.arguments[1] === 2026));
  assert.equal(f.db.query.mock.callCount(), 0);
});

test('Reportes: el reporte completo admite ausencia de movimientos y planificación', async () => {
  const f = crearContexto();
  const reporte = await f.servicio.obtenerReporteCompleto('2026-11-01');
  for (const campo of ['produccion', 'despachos', 'stockAcumuladoMes', 'despachosAcumuladosMes', 'stockAcumuladoHistorico']) {
    assert.deepEqual(reporte[campo], [], campo);
  }
  assert.deepEqual(reporte.planificacionDiaria, { productos: {} });
  assert.deepEqual(reporte.datosHistoricosProduccion, [0]);
  assert.deepEqual(reporte.datosHistoricosPlanificacion, [0]);
  assert.equal(reporte.nfu.acumuladoMes.proyeccion, 0);
});

test('Reportes: un producto sin planificación recibe cero en el reporte completo', async () => {
  const f = crearContexto({ bolsones: {
    obtenerTodosBolsonesPorFecha: mock.fn(async () => [{ producto: 1, nombreProducto: 'Alfa', peso: 10 }]),
    obtenerStockDelMes: mock.fn(async () => [{ producto: 1, nombreProducto: 'Alfa', peso: 10 }]),
    obtenerBolsonesHastaFecha: mock.fn(async () => [{ producto: 1, nombreProducto: 'Alfa', peso: 10 }])
  }, despachos: { obtenerDespachadosDelMesHastaFecha: mock.fn(async () => [{ productoId: 1, nombreProducto: 'Alfa', pesoTotal: 5 }]) } });
  const reporte = await f.servicio.obtenerReporteCompleto('2026-11-03');
  for (const campo of ['produccion', 'stockAcumuladoMes', 'despachosAcumuladosMes', 'stockAcumuladoHistorico']) {
    assert.equal(reporte[campo][0].planificacion, 0, campo);
  }
  assert.equal(reporte.produccion[0].planificacionAcumulada, 0);
  assert.equal(reporte.stockAcumuladoMes[0].planificacionAcumulada, 0);
});

test('Reportes: el stock mensual busca planificación acumulada por nombre si no coincide el identificador', async () => {
  const f = crearContexto({
    bolsones: { obtenerStockDelMes: mock.fn(async () => [{ producto: 1, nombreProducto: 'Alfa', peso: 10 }]) },
    planificacion: { obtenerPlanificacionAcumuladaHastaFecha: mock.fn(async () => ({
      productos: [{ productoId: 99, nombre: 'Alfa', kilosAcumulados: '75.5' }]
    })) }
  });
  assert.equal((await f.servicio.obtenerReporteCompleto('2026-11-03')).stockAcumuladoMes[0].planificacionAcumulada, 75.5);
});

test('Reportes: la proyección evita dividir por cero si todavía no transcurrieron días hábiles', async () => {
  const f = crearContexto({
    nfu: { obtenerCantidadNFUEntreFechas: mock.fn(async () => 100) },
    diasHabiles: { obtenerDiasHabilesSeleccionados: mock.fn(async () => [5, 8]) }
  });
  assert.deepEqual((await f.servicio.obtenerReporteCompleto('2026-11-03')).proyeccionInfo.nfu, {
    diasHabilesTotal: 2, diasHabilesTranscurridos: 1, proyeccion: { cantidadTotal: 200 }
  });
});

for (const caso of [
  { fecha: '2026-11-01', calendario: [], dias: 30 },
  { fecha: '2024-02-01', calendario: null, dias: 29 }
]) {
  test(`Reportes: sin calendario hábil la proyección utiliza los ${caso.dias} días del mes de ${caso.fecha}`, async () => {
    const f = crearContexto({
      nfu: { obtenerCantidadNFUEntreFechas: mock.fn(async () => 10) },
      diasHabiles: { obtenerDiasHabilesSeleccionados: mock.fn(async () => caso.calendario) }
    });
    assert.deepEqual((await f.servicio.obtenerReporteCompleto(caso.fecha)).proyeccionInfo.nfu, {
      diasHabilesTotal: caso.dias, diasHabilesTranscurridos: 1, proyeccion: { cantidadTotal: caso.dias * 10 }
    });
  });
}

test('Reportes: las proyecciones redondean los importes al entero más cercano', async () => {
  const f = crearContexto({
    nfu: { obtenerCantidadNFUEntreFechas: mock.fn(async () => 5) },
    bolsones: { obtenerStockDelMes: mock.fn(async () => [{ producto: 1, peso: 10 }]) },
    diasHabiles: { obtenerDiasHabilesSeleccionados: mock.fn(async () => [1, 2, 3, 4, 5]) }
  });
  const reporte = await f.servicio.obtenerReporteCompleto('2026-11-03');
  assert.equal(reporte.nfu.acumuladoMes.proyeccion, 8);
  assert.equal(reporte.stockAcumuladoMes[0].proyeccion, 17);
});

test('Reportes: las proyecciones usan cero para acumulados nulos o negativos', async () => {
  const f = crearContexto({
    nfu: { obtenerCantidadNFUEntreFechas: mock.fn(async () => -5) },
    bolsones: { obtenerStockDelMes: mock.fn(async () => [{ producto: 1, peso: -10 }, { producto: 2, peso: 0 }]) }
  });
  const reporte = await f.servicio.obtenerReporteCompleto('2026-11-03');
  assert.equal(reporte.nfu.acumuladoMes.proyeccion, 0);
  assert.deepEqual(reporte.stockAcumuladoMes.map(p => p.proyeccion), [0, 0]);
});

test('Reportes: una falla del calendario hábil deja las proyecciones en cero sin perder los movimientos', async () => {
  const f = crearReporteConDatos();
  f.diasHabiles.obtenerDiasHabilesSeleccionados.mock.mockImplementation(async () => { throw new Error('Falla simulada'); });
  const reporte = await f.servicio.obtenerReporteCompleto('2026-11-03');
  assert.deepEqual(reporte.proyeccionInfo, { nfu: null, produccion: null, despachos: null });
  assert.equal(reporte.nfu.acumuladoMes.cantidadTotal, 100);
  assert.equal(reporte.nfu.acumuladoMes.proyeccion, 0);
  assert.deepEqual(reporte.stockAcumuladoMes.map(p => p.proyeccion), [0, 0]);
  assert.equal(reporte.despachosAcumuladosMes[0].proyeccion, 0);
  assert.equal(reporte.produccion[0].pesoTotal, 20);
});

for (const caso of [
  { metodo: 'obtenerDespachosAcumuladosDelMes', grupo: 'despachos', dependencia: 'obtenerDespachadosDelMesHastaFecha', resultado: { productos: [] } },
  { metodo: 'obtenerPlanificacionPorFecha', grupo: 'planificacion', dependencia: 'obtenerPlanificacion', resultado: { productos: {} } },
  { metodo: 'obtenerPlanificacionPorFecha', grupo: 'productos', dependencia: 'obtenerTodos', resultado: { productos: {} }, conPlanificacion: true },
  { metodo: 'obtenerPlanificacionAcumuladaHastaFecha', grupo: 'planificacion', dependencia: 'obtenerPlanificacionAcumuladaHastaFecha', resultado: { productos: [], productosMap: {} } },
  { metodo: 'obtenerProduccionAcumuladaPorDia', grupo: 'bolsones', dependencia: 'obtenerBolsonesEntreFechas', resultado: [] },
  { metodo: 'obtenerPlanificacionAcumuladaPorDia', grupo: 'planificacion', dependencia: 'obtenerPlanificacionAcumuladaHastaFecha', resultado: [] }
]) {
  test(`Reportes: ${caso.metodo} devuelve su valor de respaldo si falla ${caso.dependencia}`, async () => {
    const cambios = { [caso.grupo]: { [caso.dependencia]: mock.fn(async () => { throw new Error('Falla simulada'); }) } };
    if (caso.conPlanificacion) cambios.planificacion = { obtenerPlanificacion: mock.fn(async () => ({ productos: { 1: 10 } })) };
    const f = crearContexto(cambios);
    assert.deepEqual(await f.servicio[caso.metodo]('2026-11-03'), caso.resultado);
    assert.equal(f[caso.grupo][caso.dependencia].mock.callCount(), 1);
  });
}

test('Reportes: un error a mitad del historial de producción descarta el resultado parcial', async () => {
  const f = crearContexto({ bolsones: { obtenerBolsonesEntreFechas: mock.fn(async (inicio, fin) => {
    if (fin === '2026-11-03 05:59:59') throw new Error('Falla simulada');
    return [{ peso: 10 }];
  }) } });
  assert.deepEqual(await f.servicio.obtenerProduccionAcumuladaPorDia('2026-11-03'), []);
  assert.equal(f.bolsones.obtenerBolsonesEntreFechas.mock.callCount(), 2);
});

test('Reportes: un error a mitad del historial de planificación descarta el resultado parcial', async () => {
  const f = crearContexto({ planificacion: { obtenerPlanificacionAcumuladaHastaFecha: mock.fn(async fecha => {
    if (fecha === '2026-11-02') throw new Error('Falla simulada');
    return { productos: [{ kilosAcumulados: 10 }] };
  }) } });
  assert.deepEqual(await f.servicio.obtenerPlanificacionAcumuladaPorDia('2026-11-03'), []);
  assert.equal(f.planificacion.obtenerPlanificacionAcumuladaHastaFecha.mock.callCount(), 2);
});

for (const caso of [
  { metodo: 'obtenerSumatoriaPorProducto', grupo: 'bolsones', dependencia: 'obtenerTodosBolsonesPorFecha' },
  { metodo: 'obtenerDespachosPorProducto', grupo: 'despachos', dependencia: 'obtenerDespachosPorProducto' },
  { metodo: 'obtenerStockAcumuladoHastaFecha', grupo: 'bolsones', dependencia: 'obtenerBolsonesHastaFecha' },
  { metodo: 'obtenerStockAcumuladoDelMes', grupo: 'bolsones', dependencia: 'obtenerStockDelMes' },
  { metodo: 'obtenerIngresoNFUPorFecha', grupo: 'nfu', dependencia: 'obtenerCantidadNFUPorFecha' },
  { metodo: 'obtenerNFUAcumuladoDelMes', grupo: 'nfu', dependencia: 'obtenerCantidadNFUEntreFechas' },
  { metodo: 'obtenerNFUAcumuladoHastaFecha', grupo: 'nfu', dependencia: 'obtenerCantidadNFUHastaFecha' }
]) {
  test(`Reportes: ${caso.metodo} propaga el error original de ${caso.dependencia}`, async () => {
    const error = new Error('Falla simulada del repositorio');
    const f = crearContexto({ [caso.grupo]: { [caso.dependencia]: mock.fn(async () => { throw error; }) } });
    await assert.rejects(f.servicio[caso.metodo]('2026-11-03'), recibido => recibido === error);
  });
  test(`Reportes: el reporte completo propaga una falla en ${caso.dependencia}`, async () => {
    const error = new Error('Falla simulada del repositorio');
    const f = crearContexto({ [caso.grupo]: { [caso.dependencia]: mock.fn(async () => { throw error; }) } });
    await assert.rejects(f.servicio.obtenerReporteCompleto('2026-11-03'), recibido => recibido === error);
  });
}
