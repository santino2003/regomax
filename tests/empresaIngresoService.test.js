const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

function contexto() {
  const repositorio = { guardar: mock.fn(async datos => ({ id: 3, ...datos })), obtener: mock.fn(async () => ({ id: 3, nombre: 'Empresa', activo: 1 })), darDeBaja: mock.fn(async () => {}) };
  return { repositorio, servicio: cargarServicio('empresaIngresoService', { '../repositories/empresaIngresoRepository': repositorio }) };
}

test('Empresas de ingresos: el alta normaliza nombre y descripción', async () => {
  const f = contexto();
  assert.deepEqual(await f.servicio.guardar({ nombre: ' Empresa ', descripcion: ' Descripción\nOtra línea ' }), {
    id: 3, nombre: 'Empresa', descripcion: 'Descripción\nOtra línea', activo: 1
  });
  for (const nombre of ['', '  ', 123, 'E'.repeat(256), 'Empresa\nOtra']) await assert.rejects(f.servicio.guardar({ nombre }), { status: 400 });
  assert.equal(f.repositorio.guardar.mock.callCount(), 1);
});

test('Empresas de ingresos: un nombre duplicado devuelve conflicto', async () => {
  const f = contexto();
  f.repositorio.guardar.mock.mockImplementation(async () => { throw Object.assign(new Error('Duplicada'), { code: 'ER_DUP_ENTRY' }); });
  await assert.rejects(f.servicio.guardar({ nombre: 'Empresa' }), { status: 409 });
});

test('Empresas de ingresos: la baja conserva la empresa para sus movimientos históricos', async () => {
  const f = contexto();
  await f.servicio.eliminar('3');
  assert.deepEqual(f.repositorio.darDeBaja.mock.calls[0].arguments, [3]);
});
