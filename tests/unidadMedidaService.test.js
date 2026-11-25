const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

mock.method(console, 'error', () => {});

function crearContexto(reemplazos = {}) {
  const repositorio = {
    crearUnidadMedida: mock.fn(async () => true), modificarUnidadMedida: mock.fn(async () => true),
    eliminarUnidadMedida: mock.fn(async () => true), obtenerTodas: mock.fn(async () => ({ data: [], total: 0 })),
    obtenerPorId: mock.fn(async () => null), ...reemplazos
  };
  return { repositorio, servicio: cargarServicio('unidadMedidaService', {
    '../repositories/unidadMedidaRepository': repositorio
  }) };
}

test('Unidades de medida: crear normaliza ambos nombres y conserva el responsable sin mutar la entrada', async () => {
  const f = crearContexto();
  const datos = Object.freeze({ nombre: '  kg  ', nombreLindo: '\tKilogramos\n', responsable: 'operador' });
  assert.deepEqual(await f.servicio.crearUnidadMedida(datos), {
    success: true, message: 'Unidad de medida creada exitosamente'
  });
  assert.deepEqual(f.repositorio.crearUnidadMedida.mock.calls[0].arguments, ['kg', 'Kilogramos', 'operador']);
});

test('Unidades de medida: crear admite un responsable ausente', async () => {
  const f = crearContexto();
  await f.servicio.crearUnidadMedida({ nombre: 'kg', nombreLindo: 'Kilogramos' });
  assert.deepEqual(f.repositorio.crearUnidadMedida.mock.calls[0].arguments, ['kg', 'Kilogramos', undefined]);
});

test('Unidades de medida: modificar conserva el identificador y elimina espacios externos de ambos nombres', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.modificarUnidadMedida(3, '  m²  ', '  Metros cuadrados  '), {
    success: true, message: 'Unidad de medida modificada exitosamente'
  });
  assert.deepEqual(f.repositorio.modificarUnidadMedida.mock.calls[0].arguments, [3, 'm²', 'Metros cuadrados']);
});

for (const campo of ['nombre', 'nombreLindo']) {
  for (const metodo of ['crearUnidadMedida', 'modificarUnidadMedida']) {
    test(`Unidades de medida: ${metodo} rechaza ${campo} ausente o vacío antes de guardar`, async () => {
      const f = crearContexto();
      for (const valor of [undefined, null, '', '  ', '\t\n']) {
        const datos = { nombre: 'kg', nombreLindo: 'Kilogramos', [campo]: valor };
        const argumentos = metodo === 'crearUnidadMedida' ? [datos] : [3, datos.nombre, datos.nombreLindo];
        await assert.rejects(f.servicio[metodo](...argumentos), {
          message: campo === 'nombre' ? 'El nombre de la unidad de medida es obligatorio' : 'El nombre lindo de la unidad de medida es obligatorio'
        });
      }
      assert.equal(f.repositorio[metodo].mock.callCount(), 0);
    });
  }
}

test('Unidades de medida: eliminar solicita el identificador y devuelve la confirmación', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.eliminarUnidadMedida(3), {
    success: true, message: 'Unidad de medida eliminada exitosamente'
  });
  assert.deepEqual(f.repositorio.eliminarUnidadMedida.mock.calls[0].arguments, [3]);
});

test('Unidades de medida: listar utiliza la paginación predeterminada y admite un resultado vacío', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.obtenerTodas(), { data: [], total: 0 });
  assert.deepEqual(f.repositorio.obtenerTodas.mock.calls[0].arguments, [1, 10]);
});

test('Unidades de medida: listar conserva los registros y metadatos de la página solicitada', async () => {
  const resultado = { data: [{ id: 3, nombre: 'kg' }], pagination: { page: 2, limit: 5, total: 8 } };
  const f = crearContexto({ obtenerTodas: mock.fn(async () => resultado) });
  assert.equal(await f.servicio.obtenerTodas(2, 5), resultado);
  assert.deepEqual(f.repositorio.obtenerTodas.mock.calls[0].arguments, [2, 5]);
});

test('Unidades de medida: buscar conserva todos los datos del registro', async () => {
  const unidad = Object.freeze({ id: 3, nombre: 'kg', nombre_lindo: 'Kilogramos' });
  const f = crearContexto({ obtenerPorId: mock.fn(async () => unidad) });
  assert.equal(await f.servicio.obtenerPorId(3), unidad);
  assert.deepEqual(f.repositorio.obtenerPorId.mock.calls[0].arguments, [3]);
});

test('Unidades de medida: buscar informa un registro inexistente', async () => {
  for (const unidad of [null, undefined]) {
    const f = crearContexto({ obtenerPorId: mock.fn(async () => unidad) });
    await assert.rejects(f.servicio.obtenerPorId(3), { message: 'Unidad de medida no encontrada' });
  }
});

for (const caso of [
  { metodo: 'crearUnidadMedida', argumentos: [{ nombre: 'kg', nombreLindo: 'Kilogramos' }] },
  { metodo: 'modificarUnidadMedida', argumentos: [3, 'kg', 'Kilogramos'] },
  { metodo: 'eliminarUnidadMedida', argumentos: [3] },
  { metodo: 'obtenerTodas', argumentos: [] }, { metodo: 'obtenerPorId', argumentos: [3] }
]) {
  test(`Unidades de medida: ${caso.metodo} propaga el error original del repositorio`, async () => {
    const error = new Error('Falla simulada del repositorio');
    const f = crearContexto({ [caso.metodo]: mock.fn(async () => { throw error; }) });
    await assert.rejects(f.servicio[caso.metodo](...caso.argumentos), recibido => recibido === error);
  });
}
