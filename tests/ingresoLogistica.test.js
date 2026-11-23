const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ejs = require('ejs');
const { loadModule } = require('../test-support/loadModule');

test('Ingresos logística: el desplegable consulta ambos estados sin exigir stock o productos', async () => {
  const query = mock.fn(async () => []);
  const repositorio = loadModule('src/repositories/ordenDeVentaRepository.js', { '../config/db': { query } });
  await repositorio.obtenerParaIngresosLogistica();
  const [sql, parametros] = query.mock.calls[0].arguments;
  assert.deepEqual(parametros, ['abierta', 'en_logistica']);
  assert.match(sql, /estado IN \(\?, \?\)/);
  assert.doesNotMatch(sql, /JOIN|en_stock/);
  const conexion = {};
  await repositorio.obtenerParaIngresoLogistica(5, conexion);
  assert.match(query.mock.calls[1].arguments[0], /WHERE id = \? FOR UPDATE/);
  assert.deepEqual(query.mock.calls[1].arguments.slice(1), [[5], conexion]);
});

test('Ingresos logística: el formulario muestra cliente final y código, y escapa los datos de la orden', async () => {
  const ataque = '\"><img src=x onerror=alert(1)>';
  const html = await ejs.renderFile(path.resolve(__dirname, '../views/ingresosNuevo.ejs'), {
    username: 'operador', clientes: [], errorClientes: false, errorOrdenes: false,
    ordenesVenta: [{ id: 5, cliente_final: ataque, codigo_venta: 'VENTA-5', estado: 'abierta' }]
  });
  assert.match(html, /value="Logística"/);
  assert.match(html, /VENTA-5 \(Abierta\)/);
  assert.match(html, /id="empresaLogistica" readonly/);
  assert.match(html, /id="patente"/);
  assert.ok(!html.includes(ataque));
  assert.match(html, /&lt;img/);
});

test('Ingresos logística: elegir una orden completa la empresa y cambiar de motivo limpia la selección', () => {
  const elementos = new Map();
  function elemento(id) {
    if (!elementos.has(id)) {
      const clases = new Set();
      const eventos = {};
      elementos.set(id, { value: '', dataset: {}, disabled: false, selectedOptions: [], eventos,
        classList: {
          add(...nombres) { nombres.forEach(nombre => clases.add(nombre)); },
          remove(...nombres) { nombres.forEach(nombre => clases.delete(nombre)); },
          contains(nombre) { return clases.has(nombre); },
          toggle(nombre, activo) { if (activo) clases.add(nombre); else clases.delete(nombre); }
        },
        addEventListener(nombre, callback) { eventos[nombre] = callback; }
      });
    }
    return elementos.get(id);
  }
  let iniciar;
  const document = { getElementById: elemento, querySelectorAll: () => [],
    addEventListener(evento, callback) { iniciar = callback; } };
  const window = { location: { href: 'http://localhost/ingresos' } };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../src/assets/js/ingresosNuevo.js'), 'utf8'), { document, window, URL });
  iniciar();
  const motivo = elemento('motivoIngreso');
  motivo.value = 'Logística';
  motivo.eventos.change();
  assert.equal(elemento('camposLogistica').disabled, false);
  assert.equal(elemento('camposVehiculo').disabled, false);
  assert.equal(elemento('camposNFU').disabled, true);
  const orden = elemento('orden_venta_id');
  orden.value = '5';
  orden.selectedOptions = [{ dataset: { clienteFinal: 'Empresa final' } }];
  orden.eventos.change();
  assert.equal(elemento('empresaLogistica').value, 'Empresa final');
  orden.selectedOptions = [{ dataset: { clienteFinal: 'Otra empresa' } }];
  orden.eventos.change();
  assert.equal(elemento('empresaLogistica').value, 'Otra empresa');
  // El DOM real actualiza selectedOptions al limpiar el valor del select.
  Object.defineProperty(orden, 'selectedOptions', { get() { return orden.value ? [{ dataset: { clienteFinal: 'Otra empresa' } }] : []; } });
  motivo.value = 'CNFU/NFU';
  motivo.eventos.change();
  assert.equal(orden.value, '');
  assert.equal(elemento('empresaLogistica').value, '');
  assert.equal(elemento('camposLogistica').disabled, true);
  assert.equal(elemento('camposNFU').disabled, false);
});
