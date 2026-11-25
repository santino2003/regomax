const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { loadModule } = require('../test-support/loadModule');

test('Bienes: el Excel conserva códigos como texto y exporta stock numérico sin inventar un stock crítico', async () => {
  const servicio = { obtenerParaExportar: mock.fn(async () => [{
    codigo: '0001', nombre: '=1+1', descripcion: 'BULON ALLEN 5/16', cantidad_stock: '12.50', cantidad_critica: null,
    familias_nombres: 'Bulones, Fijaciones', ubicacion: 'A1'
  }]) };
  const controlador = loadModule('src/controllers/bienController.js', {
    '../services/bienService': servicio, '../services/bienProveedorService': {},
    '../utils/imageBarcode': {}, '../config/uploads': {}
  });
  const cabeceras = {};
  let archivo;
  const res = { setHeader(nombre, valor) { cabeceras[nombre] = valor; }, send(buffer) { archivo = buffer; } };
  const body = { alcance: 'seleccionados', ids: [1] };
  await controlador.exportarExcel({ body }, res);
  assert.deepEqual(servicio.obtenerParaExportar.mock.calls[0].arguments, [body]);
  assert.match(cabeceras['Content-Type'], /spreadsheetml/);
  assert.match(cabeceras['Content-Disposition'], /bienes.xlsx/);
  assert.ok(Buffer.isBuffer(archivo));
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(archivo);
  const hoja = libro.getWorksheet('Bienes');
  assert.equal(hoja.getCell('A2').value, '0001');
  assert.equal(hoja.getCell('B2').value, '=1+1');
  assert.equal(hoja.getCell('H2').value, 12.5);
  assert.equal(hoja.getCell('I2').value, null);
});
