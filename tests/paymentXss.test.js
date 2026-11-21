const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ejs = require('ejs');

const detailPath = path.resolve(__dirname, '../views/pagoDetalle.ejs');
const listPath = path.resolve(__dirname, '../views/listarPagos.ejs');
const payload = '<img src=x onerror="window.xss=1">\n<script>window.xss=2</script>';
const pago = { id: 1, pagado: true, tipo_pago: 'CONTRAFACTURA', monto_pago: 100, proveedor_nombre: 'Proveedor', orden_codigo: 'OC-1' };

test('El detalle del pago y el recibo imprimible escapan el HTML almacenado', async () => {
  const html = await ejs.renderFile(detailPath, { username: 'operator', pago: { ...pago, detalle_pago: payload } });
  assert.ok(!html.includes(payload));
  assert.equal(html.split(ejs.escapeXML(payload)).length - 1, 2);
  assert.match(html, /white-space:\s*pre-wrap/);
});

test('Las observaciones del recibo también se escapan cuando no hay detalle del pago', async () => {
  const html = await ejs.renderFile(detailPath, { username: 'operator', pago: { ...pago, observaciones: payload } });
  assert.ok(!html.includes(payload));
  assert.ok(html.includes(ejs.escapeXML(payload)));
});

test('El texto del pago conserva saltos de línea, tildes y caracteres especiales', async () => {
  const text = 'Transferencia recibida\nRazón social: A & B <sociedad>';
  const html = await ejs.renderFile(detailPath, { username: 'operator', pago: { ...pago, detalle_pago: text } });
  assert.ok(html.includes(ejs.escapeXML(text)));
});

test('El modal de pagos múltiples crea las celdas como texto sin interpretar HTML', () => {
  function element() {
    return { children: [], textContent: '', value: '',
      set innerHTML(value) { throw new Error('Inserción de HTML sin escapar'); },
      appendChild(child) { this.children.push(child); },
      replaceChildren(...children) { this.children = children; }
    };
  }
  const elements = new Map();
  const document = {
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    createElement: element
  };
  const context = vm.createContext({ document, $: () => ({ ready() {} }), bootstrap: { Modal: class { show() {} } } });
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../src/assets/js/pagos.js'), 'utf8'), context);
  context.payload = payload;
  vm.runInContext("pagosSeleccionados.set(1, { ordenCodigo: payload, bienNombre: payload, bienCodigo: 'B1', monto: 100 }); abrirModalPagoMultiple();", context);
  const row = elements.get('listaPagosSeleccionados').children[0];
  assert.equal(row.children[0].textContent, payload);
  assert.equal(row.children[1].textContent, `${payload} (B1)`);
});

test('Los nombres de proveedores con comillas se tratan como datos en el botón de refinanciación', async () => {
  const name = "Proveedor');window.xss=1;//";
  const html = await ejs.renderFile(listPath, {
    username: 'operator', proveedores: [], pagos: [{ ...pago, pagado: false, proveedor_nombre: name }],
    filtros: {}, totales: {}, totalesPorMoneda: {}, paginacion: { totalPages: 1 }
  });
  assert.ok(html.includes(`data-proveedor-nombre="${ejs.escapeXML(name)}"`));
  assert.ok(!html.includes('onclick="abrirModalRefinanciar('));
});
