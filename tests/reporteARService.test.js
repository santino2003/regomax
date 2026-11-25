const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

function crearContexto(reemplazos = {}) {
  const repositorio = {
    obtenerStockTotal: mock.fn(async () => []), obtenerProduccionTotal: mock.fn(async () => []),
    obtenerLogisticasDetalle: mock.fn(async () => []), ...reemplazos
  };
  return { repositorio, servicio: cargarServicio('reporteARService', {
    '../repositories/reporteARRepository': repositorio
  }) };
}

test('Reporte AR: consulta los tres componentes para la misma fecha y suma los pesos decimales', async () => {
  const logisticas = Object.freeze([{ id: 5, transportista: 'Transporte Sur', peso: '40.5' }]);
  const stock = Object.freeze([Object.freeze({ pesoTotal: '100.25' }), Object.freeze({ pesoTotal: 20.5 })]);
  const produccion = Object.freeze([Object.freeze({ pesoTotal: '30.75' }), Object.freeze({ pesoTotal: 10 })]);
  const f = crearContexto({
    obtenerStockTotal: mock.fn(async () => stock), obtenerProduccionTotal: mock.fn(async () => produccion),
    obtenerLogisticasDetalle: mock.fn(async () => logisticas)
  });
  const resultado = await f.servicio.obtenerReporteAR('2026-11-20');
  assert.deepEqual(resultado, { kilosTotales: 120.75, kilosProduccion: 40.75, logisticasDetalle: logisticas });
  assert.equal(resultado.logisticasDetalle, logisticas);
  for (const consulta of Object.values(f.repositorio)) {
    assert.deepEqual(consulta.mock.calls[0].arguments, ['2026-11-20']);
    assert.equal(consulta.mock.callCount(), 1);
  }
});

test('Reporte AR: un reporte sin registros devuelve cero kilos y una lista logística vacía', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.obtenerReporteAR('2026-11-20'), {
    kilosTotales: 0, kilosProduccion: 0, logisticasDetalle: []
  });
});

test('Reporte AR: los pesos nulos, vacíos o ausentes no alteran las sumas', async () => {
  const filas = [{}, { pesoTotal: null }, { pesoTotal: '' }, { pesoTotal: 0 }, { pesoTotal: '2.5' }];
  const f = crearContexto({ obtenerStockTotal: mock.fn(async () => filas), obtenerProduccionTotal: mock.fn(async () => filas) });
  assert.deepEqual(await f.servicio.obtenerReporteAR('2026-11-20'), {
    kilosTotales: 2.5, kilosProduccion: 2.5, logisticasDetalle: []
  });
});

for (const dependencia of ['obtenerStockTotal', 'obtenerProduccionTotal', 'obtenerLogisticasDetalle']) {
  test(`Reporte AR: propaga el error de ${dependencia} y detiene las consultas posteriores`, async () => {
    const error = new Error('Falla simulada del repositorio');
    const f = crearContexto({ [dependencia]: mock.fn(async () => { throw error; }) });
    await assert.rejects(f.servicio.obtenerReporteAR('2026-11-20'), recibido => recibido === error);
    if (dependencia === 'obtenerStockTotal') assert.equal(f.repositorio.obtenerProduccionTotal.mock.callCount(), 0);
    if (dependencia !== 'obtenerLogisticasDetalle') assert.equal(f.repositorio.obtenerLogisticasDetalle.mock.callCount(), 0);
  });
}
