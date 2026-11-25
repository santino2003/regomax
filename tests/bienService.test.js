const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio, simularTransaccion } = require('../test-support/serviceUnit');
mock.method(console, 'error', () => {});

test('Bienes: exportar todos no pagina ni aplica filtros enviados por el navegador', async () => {
  const f = crearContexto();
  f.repositorio.obtenerTodos = mock.fn(async () => ({ data: [{ id: 1 }] }));
  assert.deepEqual(await f.servicio.obtenerParaExportar({ alcance: 'todos', filtros: { busqueda: 'bulon' }, ids: [99] }), [{ id: 1 }]);
  assert.deepEqual(f.repositorio.obtenerTodos.mock.calls[0].arguments, [1, null, {}]);
});

test('Bienes: exportar seleccionados valida y deduplica los identificadores sin aplicar filtros de otra página', async () => {
  const f = crearContexto();
  f.repositorio.obtenerTodos = mock.fn(async () => ({ data: [{ id: 1 }, { id: 2 }] }));
  await f.servicio.obtenerParaExportar({ alcance: 'seleccionados', ids: ['1', 2, 1], filtros: { busqueda: 'otra' } });
  assert.deepEqual(f.repositorio.obtenerTodos.mock.calls[0].arguments, [1, null, { ids: [1, 2] }]);
  for (const ids of [undefined, [], '1,2', [0], ['1 OR 1=1'], [true], [Number.MAX_SAFE_INTEGER + 1]]) {
    await assert.rejects(f.servicio.obtenerParaExportar({ alcance: 'seleccionados', ids }), { status: 400 });
  }
  assert.equal(f.repositorio.obtenerTodos.mock.callCount(), 1);
});

test('Bienes: exportar resultados mantiene búsqueda y filtros con el stock crítico interpretado como booleano', async () => {
  const f = crearContexto();
  f.repositorio.obtenerTodos = mock.fn(async () => ({ data: [] }));
  await f.servicio.obtenerParaExportar({ alcance: 'filtrados', filtros: { busqueda: 'bulon 5/16', familia_id: '3', critico: '1', ids: [99] } });
  assert.deepEqual(f.repositorio.obtenerTodos.mock.calls[0].arguments, [1, null, { busqueda: 'bulon 5/16', familia_id: '3', critico: true }]);
});

test('Bienes: exportar informa si un bien seleccionado fue eliminado antes de descargar', async () => {
  const f = crearContexto();
  f.repositorio.obtenerTodos = mock.fn(async () => ({ data: [] }));
  await assert.rejects(f.servicio.obtenerParaExportar({ alcance: 'seleccionados', ids: [1] }), { status: 400 });
});

function crearContexto(bien = { id: 1, codigo: 'B1', nombre: 'Bien', cantidad_stock: '10.00', cantidad_critica: null }) {
  const { conexion, db } = simularTransaccion();
  const repositorio = { obtenerStockPorId: mock.fn(async () => bien), actualizarStock: mock.fn(async () => true) };
  const avisos = [], correo = { enviarAlertaStockCritico: mock.fn(async () => {}) };
  const destinatarios = { obtenerEmailsActivos: mock.fn(async () => ['prueba@example.invalid']) };
  const servicio = cargarServicio('bienService', {
    '../config/db': db, '../repositories/bienRepository': repositorio,
    '../utils/transaction': { afterCommit: mock.fn((actual, tarea) => { assert.equal(actual, conexion); avisos.push(tarea); }) },
    '../utils/emailService': correo, '../repositories/configAlertasStockRepository': destinatarios
  });
  return { servicio, repositorio, conexion, db, avisos, correo, destinatarios };
}

for (const caso of [{ metodo: 'descontarStock', cantidad: '0.25', nuevo: 9.75 }, { metodo: 'incrementarStock', cantidad: '2.5', nuevo: 12.5 }]) {
  test(`Bienes: ${caso.metodo} calcula el saldo decimal y utiliza la conexión recibida`, async () => {
    const f = crearContexto();
    const resultado = await f.servicio[caso.metodo](1, caso.cantidad, f.conexion);
    assert.equal(resultado.stock_anterior, 10);
    assert.equal(resultado.stock_nuevo, caso.nuevo);
    assert.deepEqual(f.repositorio.actualizarStock.mock.calls[0].arguments, [1, caso.nuevo, f.conexion]);
    assert.equal(f.db.withTransaction.mock.callCount(), 0);
  });
}

test('Bienes: sin conexión solicita una transacción y entrega su conexión al repositorio', async () => {
  const f = crearContexto();
  await f.servicio.descontarStock(1, 2);
  assert.equal(f.db.withTransaction.mock.callCount(), 1);
  assert.deepEqual(f.repositorio.obtenerStockPorId.mock.calls[0].arguments, [1, f.conexion]);
});

test('Bienes: las cantidades inválidas se rechazan antes de consultar las dependencias', async () => {
  const f = crearContexto();
  for (const cantidad of [0, -1, NaN, Infinity, 'abc', '2abc', '', ' ', [], true]) {
    await assert.rejects(f.servicio.descontarStock(1, cantidad));
    await assert.rejects(f.servicio.incrementarStock(1, cantidad));
  }
  assert.equal(f.db.withTransaction.mock.callCount(), 0);
  assert.equal(f.repositorio.obtenerStockPorId.mock.callCount(), 0);
});

test('Bienes: rechaza un bien inexistente, un kit y un descuento superior al saldo', async () => {
  for (const bien of [null, { es_kit: true }, { cantidad_stock: 1 }]) {
    const f = crearContexto(bien);
    await assert.rejects(f.servicio.descontarStock(1, 2));
    assert.equal(f.repositorio.actualizarStock.mock.callCount(), 0);
  }
});

test('Bienes: alcanzar el nivel crítico programa la alerta sin enviarla dentro de la transacción', async () => {
  const f = crearContexto({ id: 1, cantidad_stock: 10, cantidad_critica: 9 });
  await f.servicio.descontarStock(1, 2);
  assert.equal(f.avisos.length, 1);
  assert.equal(f.correo.enviarAlertaStockCritico.mock.callCount(), 0);
  await f.avisos[0]();
  assert.equal(f.correo.enviarAlertaStockCritico.mock.calls[0].arguments[0].cantidad_stock, 8);
});

test('Bienes: no repite la alerta si el saldo ya estaba por debajo del nivel crítico', async () => {
  const f = crearContexto({ id: 1, cantidad_stock: 8, cantidad_critica: 9 });
  await f.servicio.descontarStock(1, 1);
  assert.equal(f.avisos.length, 0);
});

test('Bienes: propaga una falla de escritura sin programar una alerta', async () => {
  const f = crearContexto({ id: 1, cantidad_stock: 10, cantidad_critica: 9 });
  const error = new Error('Falló la escritura');
  f.repositorio.actualizarStock.mock.mockImplementation(async () => { throw error; });
  await assert.rejects(f.servicio.descontarStock(1, 2), recibido => recibido === error);
  assert.equal(f.avisos.length, 0);
});
