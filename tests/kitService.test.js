const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio, simularTransaccion } = require('../test-support/serviceUnit');

function crearContexto(kit = { cantidad_stock: 2, componentes: [{ bien_componente_id: 2, cantidad: 1 }, { bien_componente_id: 1, cantidad: 2 }] }) {
  const { conexion, db } = simularTransaccion();
  const bienes = { descontarStock: mock.fn(async () => {}), incrementarStock: mock.fn(async () => {}) };
  let consultas = 0;
  const repositorio = { obtenerPorId: mock.fn(async () => ++consultas === 1 ? kit : { ...kit, cantidad_stock: 0 }) };
  const servicio = cargarServicio('kitService', { '../config/db': db, './bienService': bienes, '../repositories/kitRepository': repositorio });
  return { servicio, bienes, repositorio, conexion, db };
}

for (const metodo of ['descontarStock', 'incrementarStock']) {
  test(`Kits: ${metodo} calcula las cantidades por componente y comparte la conexión`, async () => {
    const f = crearContexto();
    const resultado = await f.servicio[metodo](3, '2');
    assert.deepEqual(f.bienes[metodo].mock.calls.map(llamada => llamada.arguments), [[1, 4, f.conexion], [2, 2, f.conexion]]);
    assert.equal(f.db.withTransaction.mock.callCount(), 1);
    assert.equal(resultado.stock_anterior, 2);
    assert.equal(resultado.stock_nuevo, 0);
  });
}

test('Kits: la falla de un componente se propaga sin informar una operación exitosa', async () => {
  const f = crearContexto();
  const error = new Error('Stock insuficiente');
  f.bienes.descontarStock.mock.mockImplementation(async id => { if (id === 2) throw error; });
  await assert.rejects(f.servicio.descontarStock(3, 1), recibido => recibido === error);
  assert.equal(f.repositorio.obtenerPorId.mock.callCount(), 1);
});

test('Kits: rechaza un kit inexistente o sin componentes', async () => {
  for (const kit of [null, { componentes: [] }]) {
    const f = crearContexto(kit);
    await assert.rejects(f.servicio.descontarStock(3, 1));
    assert.equal(f.bienes.descontarStock.mock.callCount(), 0);
  }
});

test('Kits: las cantidades inválidas se rechazan antes de solicitar una transacción', async () => {
  const f = crearContexto();
  for (const cantidad of [0, -1, NaN, Infinity, 'abc', '', [], true]) await assert.rejects(f.servicio.incrementarStock(3, cantidad));
  assert.equal(f.db.withTransaction.mock.callCount(), 0);
});
