const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

mock.method(console, 'error', () => {});

function crearContexto(cambiosOrden = {}, reemplazos = {}, metodosDocumento = {}) {
  const documento = { heightOfString: mock.fn(() => 10) };
  for (const metodo of ['fontSize', 'font', 'text', 'moveTo', 'lineTo', 'stroke', 'end']) {
    documento[metodo] = mock.fn(() => documento);
  }
  Object.assign(documento, metodosDocumento);
  const ConstructorPDF = mock.fn(function () { return documento; });
  const orden = {
    id: 11, codigo: 'OC-011', created_at: '2026-11-20T12:00:00', condicion: 'Contado',
    asunto: 'Repuestos', estado: 'Pendiente', items: [], ...cambiosOrden
  };
  const repositorio = { obtenerPorId: mock.fn(async () => orden), ...reemplazos };
  return { documento, ConstructorPDF, repositorio, orden,
    textos: () => documento.text.mock.calls.map(c => c.arguments[0]),
    servicio: cargarServicio('pdfOrdenCompraService', {
      pdfkit: ConstructorPDF, '../repositories/ordenCompraRepository': repositorio
    })
  };
}

test('PDF de órdenes de compra: generar consulta la orden y devuelve el documento finalizado', async () => {
  const f = crearContexto();
  assert.equal(await f.servicio.generarPDF(11), f.documento);
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, [11]);
  assert.deepEqual(f.ConstructorPDF.mock.calls[0].arguments, [{
    size: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 }
  }]);
  assert.equal(f.documento.end.mock.callCount(), 1);
  for (const texto of ['Regomax S.A.', 'Orden de Compra OC-011', '20/11/2026', 'Contado', 'Repuestos',
    'Pendiente', 'Bien', 'Centro de Costo', 'Descripción', 'Cantidad', 'Unidad', 'Medio Pago']) {
    assert.ok(f.textos().includes(texto), `El documento incluye: ${texto}`);
  }
});

test('PDF de órdenes de compra: una orden inexistente se rechaza antes de construir el documento', async () => {
  const f = crearContexto({}, { obtenerPorId: mock.fn(async () => null) });
  await assert.rejects(f.servicio.generarPDF(11), { message: 'Orden de compra no encontrada' });
  assert.equal(f.ConstructorPDF.mock.callCount(), 0);
});

test('PDF de órdenes de compra: los datos generales ausentes se muestran con un guion', async () => {
  const f = crearContexto({ created_at: null, condicion: null, asunto: '', estado: undefined, items: null });
  await f.servicio.generarPDF(11);
  assert.equal(f.textos().filter(texto => texto === '-').length, 4);
  assert.equal(f.documento.end.mock.callCount(), 1);
});

test('PDF de órdenes de compra: los ítems conservan su contenido y formatean cantidades decimales', async () => {
  const item = Object.freeze({
    bien_nombre: 'Correa', centro_costo: 'Mantenimiento', descripcion: 'Correa del molino', cantidad: '1234.5678',
    unidad_medida_nombre_lindo: 'Unidades', unidad_medida_nombre: 'un', medio_pago: 'Transferencia'
  });
  const f = crearContexto({ items: Object.freeze([item]) });
  await f.servicio.generarPDF(11);
  for (const texto of ['Correa', 'Mantenimiento', 'Correa del molino', '1.234,568', 'Unidades', 'Transferencia']) {
    assert.ok(f.textos().includes(texto), `El ítem incluye: ${texto}`);
  }
  assert.ok(!f.textos().includes('un'));
});

test('PDF de órdenes de compra: la unidad usa el nombre alternativo y los campos faltantes tienen valores de respaldo', async () => {
  const f = crearContexto({ items: [{ unidad_medida_nombre: 'kg' }, {}] });
  await f.servicio.generarPDF(11);
  assert.ok(f.textos().includes('kg'));
  assert.equal(f.textos().filter(texto => texto === '0').length, 2);
  assert.equal(f.textos().filter(texto => texto === '-').length, 5);
});

test('PDF de órdenes de compra: la altura de los ítems se adapta a las descripciones extensas', async () => {
  const f = crearContexto({ items: [{ bien_nombre: 'Correa', descripcion: 'Descripción extensa', cantidad: 2 }] }, {}, {
    heightOfString: mock.fn(texto => texto === 'Descripción extensa' ? 60 : 10)
  });
  await f.servicio.generarPDF(11);
  const descripcion = f.documento.text.mock.calls.find(c => c.arguments[0] === 'Descripción extensa');
  const y = descripcion.arguments[2];
  assert.equal(descripcion.arguments[3].lineBreak, true);
  assert.ok(f.documento.moveTo.mock.calls.some(c => c.arguments[0] === 40 && c.arguments[1] === y + 66));
});

test('PDF de órdenes de compra: contrafactura agrupa importes por moneda y aplica ajustes a la primera', async () => {
  const f = crearContexto({ contrafactura: true, impuestos: '50', descuento: '20', items: [
    { cantidad: '2', precio_unitario: '100', moneda: 'ars' },
    { cantidad: 3, precio_unitario: 100, moneda: 'ARS' },
    { cantidad: 2, precio_unitario: 15, moneda: 'usd' }
  ] });
  await f.servicio.generarPDF(11);
  for (const texto of ['Resumen de importes', 'Impuestos: ARS 50,00', 'Descuento: ARS 20,00',
    'Total ARS: 530,00', 'Total USD: 30,00']) assert.ok(f.textos().includes(texto), texto);
});

test('PDF de órdenes de compra: el descuento no permite que el total mostrado sea negativo', async () => {
  const f = crearContexto({ contrafactura: true, descuento: 500, items: [{ cantidad: 1, precio_unitario: 100 }] });
  await f.servicio.generarPDF(11);
  assert.ok(f.textos().includes('Total ARS: 0,00'));
});

test('PDF de órdenes de compra: contrafactura usa ARS y cero para importes ausentes', async () => {
  const f = crearContexto({ contrafactura: true, items: [{ cantidad: 2, precio_unitario: '10.25' }] });
  await f.servicio.generarPDF(11);
  for (const texto of ['Impuestos: ARS 0,00', 'Descuento: ARS 0,00', 'Total ARS: 20,50']) {
    assert.ok(f.textos().includes(texto), texto);
  }
});

test('PDF de órdenes de compra: una orden sin contrafactura omite el resumen de ajustes', async () => {
  const f = crearContexto({ contrafactura: false, impuestos: 50, descuento: 20, items: [{ cantidad: 2, precio_unitario: 100 }] });
  await f.servicio.generarPDF(11);
  assert.ok(!f.textos().includes('Resumen de importes'));
  assert.ok(!f.textos().some(texto => texto.startsWith('Total ARS:')));
});

test('PDF de órdenes de compra: un error de consulta se propaga sin crear el documento', async () => {
  const error = new Error('Falla simulada del repositorio');
  const f = crearContexto({}, { obtenerPorId: mock.fn(async () => { throw error; }) });
  await assert.rejects(f.servicio.generarPDF(11), recibido => recibido === error);
  assert.equal(f.ConstructorPDF.mock.callCount(), 0);
});

test('PDF de órdenes de compra: un error al dibujar se propaga sin finalizar el documento', async () => {
  const error = new Error('Falla simulada de PDFKit');
  const f = crearContexto({}, {}, { text: mock.fn(() => { throw error; }) });
  await assert.rejects(f.servicio.generarPDF(11), recibido => recibido === error);
  assert.equal(f.documento.end.mock.callCount(), 0);
});
