const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ejs = require('ejs');
const { escaparHtml } = require('../src/assets/js/htmlSeguro');

const ataque = `</ScRiPt><script>globalThis.xss = 1</script><img src=x onerror="globalThis.xss=2">'"\\&\u2028\u2029`;
const vistas = ['bienesNuevo', 'bienesEditar', 'kitNuevo', 'kitEditar', 'ordenesCompraNueva', 'ordenesCompraEditar'];

function datosVista(nombre = ataque) {
  const registro = { id: 1, nombre, codigo: nombre, nombre_lindo: nombre, cantidad_stock: 10, precio: 25, moneda: 'ARS' };
  const proveedor = { id: 1, nombre, precio: 25, moneda: 'ARS' };
  const item = { id: 1, bien_id: 1, cantidad: 2, cantidad_recibida: 0, descripcion: nombre,
    centro_costo: nombre, unidad_medida_id: 1, proveedor_sugerido_id: 1, precio_unitario: 25, moneda: 'ARS', medio_pago: 'Efectivo' };
  return {
    username: 'operador', tipos: ['Consumible'], categorias: [registro], familias: [registro],
    unidadesMedida: [registro], almacenes: [registro], proveedores: [proveedor], bienes: [registro],
    bienesDisponibles: [registro], centrosCosto: [registro], cuotasExistentes: [], adelantoExistente: null,
    bien: { ...registro, tipo: 'Consumible', descripcion: nombre, familias: [registro], proveedores: [proveedor],
      archivos: [{ id: 1, nombre_archivo: nombre, ruta_archivo: '/uploads/documento.pdf', tipo_mime: 'application/pdf', tamanio: 100 }] },
    kit: { ...registro, tipo: 'Consumible', descripcion: nombre, componentes: [{ bien_componente_id: 1, cantidad: 2 }] },
    orden: { id: 1, codigo: 'OC-1', estado: 'En Proceso', condicion: 'No Critica', asunto: nombre,
      contrafactura: false, items: [item], archivo_adjunto: JSON.stringify([nombre]) }
  };
}

function scriptDeDatos(html, expresion) {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(c => c[1]);
  const script = scripts.find(codigo => codigo.includes(`${expresion} = `));
  assert.ok(script, `Se encontró la asignación de ${expresion}`);
  return script;
}

test('JSON en scripts: un cierre de etiqueta, comillas y separadores Unicode se conservan como datos', async () => {
  const entrada = { nombre: ataque, anidado: [{ descripcion: '<!-- comentario --> & A > B' }] };
  const json = await ejs.renderFile(path.resolve(__dirname, '../views/partials/jsonSeguro.ejs'), { valor: entrada });
  assert.doesNotMatch(json, /[<>&\u2028\u2029]/);
  assert.deepEqual(JSON.parse(json), entrada);
  const contexto = vm.createContext({});
  vm.runInContext(`globalThis.datos = ${json};`, contexto);
  assert.equal(contexto.datos.nombre, ataque);
  assert.equal(contexto.xss, undefined);
});

test('JSON en scripts: listas, valores vacíos, números y booleanos mantienen su tipo', async () => {
  for (const entrada of [[], {}, null, undefined, '', 0, false, [1, 'A & B', null]]) {
    const json = await ejs.renderFile(path.resolve(__dirname, '../views/partials/jsonSeguro.ejs'), { valor: entrada });
    assert.deepEqual(JSON.parse(json), entrada ?? null);
  }
});

test('HTML dinámico: escapar texto y atributos preserva caracteres legítimos sin crear etiquetas', () => {
  assert.equal(escaparHtml(`A & B <Repuesto> "Especial" 'Sur'`), 'A &amp; B &lt;Repuesto&gt; &quot;Especial&quot; &#39;Sur&#39;');
  assert.equal(escaparHtml('Ñandú — Técnico\nSegunda línea'), 'Ñandú — Técnico\nSegunda línea');
  assert.equal(escaparHtml(0), '0');
  assert.equal(escaparHtml(false), 'false');
  assert.equal(escaparHtml(null), '');
  assert.equal(escaparHtml(undefined), '');
  assert.doesNotMatch(escaparHtml(ataque), /[<>"']/);
});

for (const vista of vistas) {
  test(`XSS: ${vista} mantiene los datos sin permitir que cierren el script del documento`, async () => {
    const ruta = path.resolve(__dirname, `../views/${vista}.ejs`);
    const datos = datosVista();
    const html = await ejs.renderFile(ruta, datos);
    const referencia = await ejs.renderFile(ruta, datosVista('Repuesto normal'));
    assert.equal([...html.matchAll(/<script\b/gi)].length, [...referencia.matchAll(/<script\b/gi)].length);
    assert.ok(!html.includes(ataque));
    const variables = vista.startsWith('bienes')
      ? { 'window.proveedoresDisponibles': datos.proveedores, ...(vista === 'bienesEditar' ? { 'window.proveedoresActuales': datos.bien.proveedores } : {}) }
      : vista.startsWith('kit')
        ? { bienesDisponibles: datos.bienesDisponibles, ...(vista === 'kitEditar' ? { componentesExistentes: datos.kit.componentes } : {}) }
        : { bienes: datos.bienes, unidadesMedida: datos.unidadesMedida, centrosCosto: datos.centrosCosto,
          ...(vista === 'ordenesCompraEditar' ? { itemsExistentes: datos.orden.items, cuotasExistentesServidor: [], adelantoExistenteServidor: null } : {}) };
    const script = scriptDeDatos(html, Object.keys(variables)[0]);
    // Solo se evalúan las declaraciones iniciales; no se inicializan formularios ni peticiones.
    const inicioFormulario = script.indexOf('$(document).ready');
    const contexto = vm.createContext({ window: {}, localStorage: { getItem: () => null } });
    vm.runInContext(inicioFormulario < 0 ? script : script.slice(0, inicioFormulario), contexto);
    for (const [expresion, esperado] of Object.entries(variables)) {
      assert.deepEqual(JSON.parse(vm.runInContext(`JSON.stringify(${expresion})`, contexto)), esperado, expresion);
    }
    assert.equal(contexto.xss, undefined);
    const helper = html.indexOf('<script src="/assets/js/htmlSeguro.js">');
    assert.ok(helper >= 0);
    if (!vista.startsWith('ordenes')) assert.ok(helper < html.indexOf(`<script src="/assets/js/${vista}.js">`));
    else assert.ok(helper < html.indexOf(script));
  });
}

function crearNavegador(ejecutarInicio = true) {
  const fragmentos = [];
  const eventos = new Map();
  function $(selector) {
    const elemento = {
      length: 0,
      ready(tarea) { if (ejecutarInicio) tarea(); return elemento; },
      on(evento, ...argumentos) { eventos.set(`${selector}:${evento}`, argumentos.at(-1)); return elemento; },
      append(html) { fragmentos.push(String(html)); return elemento; },
      html(valor) { if (valor === undefined) return ''; fragmentos.push(String(valor)); return elemento; },
      val(valor) { return valor === undefined ? (selector && selector.valor || '') : elemento; },
      data() { return 1; }, is() { return false; }, each() { return elemento; },
      find(consulta) { return $(consulta); }, closest() { return elemento; }, last() { return elemento; }
    };
    for (const metodo of ['select2', 'text', 'empty', 'prop', 'remove', 'slideDown', 'slideUp', 'addClass']) {
      elemento[metodo] = () => elemento;
    }
    return elemento;
  }
  $.ajax = opciones => {
    if (opciones.success) opciones.success({ success: true, data: [{ id: 1, nombre: ataque, precio: 25, moneda: 'ARS' }] });
  };
  const datos = datosVista();
  const contexto = vm.createContext({
    $, document: {}, escaparHtml, bienesDisponibles: datos.bienesDisponibles, componentesExistentes: datos.kit.componentes,
    window: { proveedoresDisponibles: datos.proveedores, proveedoresActuales: datos.bien.proveedores, scrollTo() {} },
    localStorage: { getItem: () => null }, bootstrap: { Modal: class {} }, console: { log() {}, error() {} }
  });
  return { contexto, fragmentos, eventos, datos };
}

for (const archivo of ['bienesNuevo', 'bienesEditar', 'kitNuevo', 'kitEditar']) {
  test(`XSS: ${archivo} escapa los nombres al construir sus opciones HTML`, () => {
    const f = crearNavegador();
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, `../src/assets/js/${archivo}.js`), 'utf8'), f.contexto);
    if (archivo === 'bienesNuevo') f.eventos.get('#btnAgregarProveedor:click')();
    const html = f.fragmentos.join('\n');
    assert.ok(html.includes(escaparHtml(ataque)));
    assert.ok(!html.includes(ataque));
    assert.doesNotMatch(html, /<script>globalThis\.xss/);
    assert.ok(html.includes('value="1"'));
    assert.equal(f.contexto.xss, undefined);
  });
}

for (const vista of ['ordenesCompraNueva', 'ordenesCompraEditar']) {
  test(`XSS: ${vista} escapa los datos al agregar ítems y cargar proveedores`, async () => {
    const f = crearNavegador(false);
    const html = await ejs.renderFile(path.resolve(__dirname, `../views/${vista}.ejs`), f.datos);
    vm.runInContext(scriptDeDatos(html, 'bienes'), f.contexto);
    if (vista === 'ordenesCompraEditar') {
      f.contexto.item = f.datos.orden.items[0];
      vm.runInContext('agregarItemExistente(item)', f.contexto);
      const fragmento = f.fragmentos.find(valor => valor.includes('item-row'));
      assert.ok(fragmento.includes(`>${escaparHtml(ataque)}</textarea>`));
    } else {
      vm.runInContext('agregarItemVacio()', f.contexto);
      f.eventos.get('[data-item="1"] .select2-bien:change').call({ valor: '1' });
    }
    const fragmentos = f.fragmentos.join('\n');
    assert.ok(fragmentos.includes(escaparHtml(ataque)));
    assert.ok(!fragmentos.includes(ataque));
    assert.doesNotMatch(fragmentos, /<script>globalThis\.xss/);
    assert.ok(fragmentos.includes('value="1"'));
  });
}

test('XSS: los botones de archivos conservan los nombres en atributos de datos en lugar de código JavaScript', async () => {
  for (const vista of ['bienesEditar', 'ordenesCompraEditar']) {
    const html = await ejs.renderFile(path.resolve(__dirname, `../views/${vista}.ejs`), datosVista());
    assert.ok(html.includes(`data-archivo-nombre="${ejs.escapeXML(ataque)}"`));
    assert.match(html, /onclick="eliminarArchivo(?:Servidor)?\([^"']*this\.dataset\.archivoNombre\)"/);
  }
});
