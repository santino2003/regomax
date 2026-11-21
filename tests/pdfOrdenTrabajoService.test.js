const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

function crearContexto(reemplazos = {}, metodosDocumento = {}) {
  const documento = {
    page: { width: 595, height: 842, margins: { top: 40, bottom: 40, left: 40, right: 40 } },
    heightOfString: mock.fn(() => 10)
  };
  for (const metodo of ['font', 'fontSize', 'text', 'rect', 'stroke', 'fillAndStroke', 'fillColor',
    'addPage', 'moveTo', 'lineTo', 'strokeColor', 'end']) {
    documento[metodo] = mock.fn(() => documento);
  }
  Object.assign(documento, metodosDocumento);
  const ConstructorPDF = mock.fn(function () { return documento; });
  const orden = {
    id: 21, descripcion: 'Cambiar correa', mantenimiento: 'Preventivo', tipo: 'Mecanico', maquina: 'Molino',
    fecha_pedido: '2026-11-20T12:00:00', estado: 'Pendiente', fecha_terminada: null
  };
  const repositorio = { obtenerPorId: mock.fn(async () => orden), ...reemplazos };
  const servicio = cargarServicio('pdfOrdenTrabajoService', {
    pdfkit: ConstructorPDF, '../repositories/ordenTrabajoRepository': repositorio
  });
  const textos = () => documento.text.mock.calls.map(c => c.arguments[0]);
  return { servicio, documento, ConstructorPDF, repositorio, orden, textos };
}

test('PDF de órdenes de trabajo: generar consulta la orden y devuelve el documento finalizado', async () => {
  const f = crearContexto();
  assert.equal(await f.servicio.generarPDF(21), f.documento);
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, [21]);
  assert.deepEqual(f.ConstructorPDF.mock.calls[0].arguments, [{
    size: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 }
  }]);
  assert.equal(f.documento.end.mock.callCount(), 1);
  for (const texto of ['Regomax S.A.', 'Orden de Trabajo 21', 'Cambiar correa', 'Preventivo', 'Mecanico',
    'Molino', '20/11/2026', 'Pendiente', 'Firma', 'Aclaración', 'Fecha']) {
    assert.ok(f.textos().includes(texto), `El documento incluye: ${texto}`);
  }
});

test('PDF de órdenes de trabajo: una orden inexistente se rechaza antes de crear el documento', async () => {
  const f = crearContexto({ obtenerPorId: mock.fn(async () => null) });
  await assert.rejects(f.servicio.generarPDF(21), { message: 'Orden de trabajo no encontrada' });
  assert.equal(f.ConstructorPDF.mock.callCount(), 0);
});

test('PDF de órdenes de trabajo: formatear fechas admite valores ausentes, texto y objetos Date', () => {
  const f = crearContexto();
  for (const valor of [null, undefined, '']) assert.equal(f.servicio.formatDate(valor), '');
  for (const valor of ['2026-11-20T12:00:00', new Date(2026, 10, 20, 12)]) {
    assert.equal(f.servicio.formatDate(valor), '20/11/2026');
  }
});

test('PDF de órdenes de trabajo: la tabla de información admite datos opcionales ausentes', () => {
  const f = crearContexto();
  assert.equal(f.servicio.drawInfoTable(f.documento, {}, 40, 100, 515), 226);
  assert.deepEqual(f.textos().filter((_, indice) => indice % 2 === 0), [
    'Descripción', 'Mantenimiento', 'Tipo', 'Máquina', 'Fecha Pedido', 'Estado', 'Fecha Terminada'
  ]);
  assert.deepEqual(f.textos().filter((_, indice) => indice % 2 === 1), Array(7).fill(''));
});

test('PDF de órdenes de trabajo: una descripción extensa aumenta la fila y la desplaza a otra página', () => {
  const descripcion = 'Descripción extensa';
  const f = crearContexto({}, { heightOfString: mock.fn(texto => texto === descripcion ? 300 : 10) });
  f.servicio.drawInfoTable(f.documento, { ...f.orden, descripcion }, 40, 650, 515);
  assert.equal(f.documento.addPage.mock.callCount(), 1);
  assert.deepEqual(f.documento.rect.mock.calls[0].arguments, [40, 40, 260, 308]);
  assert.ok(f.textos().includes(descripcion));
});

test('PDF de órdenes de trabajo: el límite de página admite el borde exacto y agrega página al superarlo', () => {
  const f = crearContexto();
  assert.equal(f.servicio.exceedsPage(f.documento, 780, 22), false);
  assert.equal(f.servicio.exceedsPage(f.documento, 780, 23), true);
  assert.equal(f.servicio.ensureSpace(f.documento, 780, 22), 780);
  assert.equal(f.documento.addPage.mock.callCount(), 0);
  assert.equal(f.servicio.ensureSpace(f.documento, 780, 23), 40);
  assert.equal(f.documento.addPage.mock.callCount(), 1);
});

test('PDF de órdenes de trabajo: los riesgos continúan en otra página y repiten sus encabezados', () => {
  const f = crearContexto();
  const final = f.servicio.drawRiskTable(f.documento, 40, 700, 515);
  assert.equal(f.documento.addPage.mock.callCount(), 1);
  assert.equal(f.textos().filter(texto => texto === 'Riesgos').length, 2);
  assert.equal(f.textos().filter(texto => texto === 'Precauciones').length, 2);
  for (const texto of ['Precauciones Preliminares', 'Riesgo Mecánico', 'Riesgo Ergonómicos',
    'Riesgo Eléctrico', 'Utilizar Guantes Protectores', 'Uso de Tablero Eléctrico con Disyuntor Diferencial']) {
    assert.ok(f.textos().includes(texto), `Se conserva la precaución o riesgo: ${texto}`);
  }
  assert.ok(final <= 802);
});

test('PDF de órdenes de trabajo: dibujar firmas distribuye tres líneas y sus etiquetas', () => {
  const f = crearContexto();
  f.servicio.drawSignatureLines(f.documento, 40, 600, 500);
  assert.deepEqual(f.documento.moveTo.mock.calls.map(c => c.arguments), [[40, 600], [215, 600], [390, 600]]);
  assert.deepEqual(f.documento.lineTo.mock.calls.map(c => c.arguments), [[190, 600], [365, 600], [540, 600]]);
  assert.deepEqual(f.textos(), ['Firma', 'Aclaración', 'Fecha']);
});

test('PDF de órdenes de trabajo: un error de consulta se propaga sin construir el documento', async () => {
  const error = new Error('Falla simulada del repositorio');
  const f = crearContexto({ obtenerPorId: mock.fn(async () => { throw error; }) });
  await assert.rejects(f.servicio.generarPDF(21), recibido => recibido === error);
  assert.equal(f.ConstructorPDF.mock.callCount(), 0);
});

test('PDF de órdenes de trabajo: un error al dibujar se propaga y no finaliza el documento', async () => {
  const error = new Error('Falla simulada de PDFKit');
  const f = crearContexto({}, { text: mock.fn(() => { throw error; }) });
  await assert.rejects(f.servicio.generarPDF(21), recibido => recibido === error);
  assert.equal(f.documento.end.mock.callCount(), 0);
});
