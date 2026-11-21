const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { cargarServicio } = require('../test-support/serviceUnit');

mock.method(console, 'error', () => {});

function crearContexto() {
  const personas = { obtenerPorDni: mock.fn(async () => null), crear: mock.fn(async persona => ({ id: 42, ...persona })) };
  const movimientos = { contar: mock.fn(async () => 123), listar: mock.fn(async () => []), crear: mock.fn(async datos => ({ id: 42, ...datos })) };
  const clientes = { obtenerTodos: mock.fn(async () => []), obtenerPorId: mock.fn(async () => ({ id: 2, empresa: 'Empresa de prueba' })) };
  return { personas, movimientos, clientes, servicio: cargarServicio('ingresoService', {
    '../repositories/personaRepository': personas, '../repositories/movimientoIngresoRepository': movimientos,
    '../repositories/clienteNFURepository': clientes
  }) };
}

const movimiento = Object.freeze({ tipo_movimiento: ' ingreso ', motivo: ' Visita ', nombre: ' Ana ', apellido: ' García ', patente: ' ab123cd ' });
const persona = Object.freeze({ dni: ' 12345678 ', nombre: ' Ana ', apellido: ' García ', sexo: ' f ' });

test('Ingresos: obtener los datos del formulario conserva las empresas y admite una lista vacía', async () => {
  for (const clientes of [[{ id: 2, empresa: 'Empresa de prueba' }], [], null, undefined]) {
    const f = crearContexto();
    f.clientes.obtenerTodos.mock.mockImplementation(async () => clientes);
    assert.deepEqual(await f.servicio.obtenerDatosNuevoIngreso(), { clientes: clientes || [], errorClientes: false });
  }
});

test('Ingresos: una falla al consultar empresas devuelve el indicador de error del formulario', async () => {
  const f = crearContexto();
  f.clientes.obtenerTodos.mock.mockImplementation(async () => { throw new Error('Falló la consulta'); });
  assert.deepEqual(await f.servicio.obtenerDatosNuevoIngreso(), { clientes: [], errorClientes: true });
});

test('Ingresos: listar utiliza páginas de cincuenta elementos y limita la página al total disponible', async () => {
  const f = crearContexto();
  const registros = [{ id: 42 }];
  f.movimientos.listar.mock.mockImplementation(async () => registros);
  assert.deepEqual(await f.servicio.listarMovimientos('2'), { movimientos: registros, total: 123, pagina: 2, paginas: 3 });
  assert.deepEqual(f.movimientos.listar.mock.calls[0].arguments, [50, 50]);
  assert.equal((await f.servicio.listarMovimientos(99)).pagina, 3);
  assert.deepEqual(f.movimientos.listar.mock.calls[1].arguments, [50, 100]);
});

test('Ingresos: listar utiliza la primera página ante valores inválidos', async () => {
  const f = crearContexto();
  for (const pagina of [undefined, null, 0, -1, 1.5, 'abc', Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal((await f.servicio.listarMovimientos(pagina)).pagina, 1);
  }
  assert.ok(f.movimientos.listar.mock.calls.every(llamada => llamada.arguments[1] === 0));
});

test('Ingresos: un listado vacío mantiene una página válida sin desplazamiento', async () => {
  const f = crearContexto();
  f.movimientos.contar.mock.mockImplementation(async () => 0);
  assert.deepEqual(await f.servicio.listarMovimientos(99), { movimientos: [], total: 0, pagina: 1, paginas: 1 });
  assert.deepEqual(f.movimientos.listar.mock.calls[0].arguments, [50, 0]);
});

test('Ingresos: registrar normaliza los campos y descarta propiedades ajenas al movimiento', async () => {
  const f = crearContexto();
  const entrada = Object.freeze({ ...movimiento, empresa: 'Empresa enviada sin autorización', id: 900 });
  const esperado = { tipo_movimiento: 'INGRESO', motivo: 'Visita', nombre: 'Ana', apellido: 'García', patente: 'AB123CD', empresa: null };
  assert.deepEqual(await f.servicio.registrarMovimiento(entrada), { id: 42, ...esperado });
  assert.deepEqual(f.movimientos.crear.mock.calls[0].arguments, [esperado]);
  assert.equal(f.clientes.obtenerPorId.mock.callCount(), 0);
  assert.equal(entrada.nombre, ' Ana ');
});

test('Ingresos: registrar rechaza entradas que no sean objetos de datos', async () => {
  const f = crearContexto();
  for (const entrada of [undefined, null, [], 'movimiento', 12]) {
    await assert.rejects(f.servicio.registrarMovimiento(entrada), { status: 400, message: 'Ingrese los datos del movimiento.' });
  }
  assert.equal(f.movimientos.crear.mock.callCount(), 0);
});

for (const [campo, limite] of Object.entries({ tipo_movimiento: 7, motivo: 100, nombre: 100, apellido: 100, patente: 20 })) {
  test(`Ingresos: ${campo} debe ser texto obligatorio dentro del límite y sin caracteres de control`, async () => {
    const f = crearContexto();
    for (const valor of [undefined, null, '', ' \t ', 12, {}, 'a'.repeat(limite + 1), 'A\x00B', 'A\nB', 'A\x7fB']) {
      await assert.rejects(f.servicio.registrarMovimiento({ ...movimiento, [campo]: valor }), { status: 400 });
    }
    assert.equal(f.movimientos.crear.mock.callCount(), 0);
    assert.equal(f.clientes.obtenerPorId.mock.callCount(), 0);
  });
}

test('Ingresos: registrar acepta los límites máximos de los textos y el tipo EGRESO', async () => {
  const f = crearContexto();
  const entrada = { tipo_movimiento: 'egreso', motivo: 'M'.repeat(100), nombre: 'N'.repeat(100), apellido: 'A'.repeat(100), patente: 'P'.repeat(20) };
  const resultado = await f.servicio.registrarMovimiento(entrada);
  assert.equal(resultado.tipo_movimiento, 'EGRESO');
  assert.equal(resultado.nombre.length, 100);
  assert.equal(resultado.patente.length, 20);
});

test('Ingresos: registrar rechaza tipos de movimiento distintos de INGRESO y EGRESO', async () => {
  const f = crearContexto();
  await assert.rejects(f.servicio.registrarMovimiento({ ...movimiento, tipo_movimiento: 'OTRO' }), {
    status: 400, message: 'El tipo de movimiento debe ser INGRESO o EGRESO.'
  });
  assert.equal(f.movimientos.crear.mock.callCount(), 0);
});

test('Ingresos: registrar toma la empresa del cliente consultado y no de la entrada recibida', async () => {
  const f = crearContexto();
  const resultado = await f.servicio.registrarMovimiento({ ...movimiento, motivo: 'CNFU/NFU', cliente_id: '2', empresa: 'Empresa manipulada' });
  assert.equal(resultado.empresa, 'Empresa de prueba');
  assert.deepEqual(f.clientes.obtenerPorId.mock.calls[0].arguments, [2]);
});

test('Ingresos: seleccionar un cliente también resuelve la empresa en un egreso', async () => {
  const f = crearContexto();
  assert.equal((await f.servicio.registrarMovimiento({ ...movimiento, tipo_movimiento: 'EGRESO', cliente_id: 2 })).empresa, 'Empresa de prueba');
});

test('Ingresos: un ingreso CNFU/NFU exige un identificador de empresa válido antes de consultarla', async () => {
  const f = crearContexto();
  for (const cliente_id of [undefined, null, '', 0, '01', '-1', '1.5', 'abc', true, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(f.servicio.registrarMovimiento({ ...movimiento, motivo: 'CNFU/NFU', cliente_id }), {
      status: 400, message: 'Seleccione una empresa válida.'
    });
  }
  assert.equal(f.clientes.obtenerPorId.mock.callCount(), 0);
  assert.equal(f.movimientos.crear.mock.callCount(), 0);
});

test('Ingresos: una empresa inexistente o sin nombre evita registrar el movimiento', async () => {
  for (const cliente of [null, {}, { empresa: '' }]) {
    const f = crearContexto();
    f.clientes.obtenerPorId.mock.mockImplementation(async () => cliente);
    await assert.rejects(f.servicio.registrarMovimiento({ ...movimiento, cliente_id: 2 }), {
      status: 400, message: 'La empresa seleccionada no existe.'
    });
    assert.equal(f.movimientos.crear.mock.callCount(), 0);
  }
});

test('Ingresos: normalizar el DNI elimina espacios y ceros iniciales sin aceptar formatos inválidos', () => {
  const f = crearContexto();
  assert.equal(f.servicio.normalizarDni(' 12345678 '), '12345678');
  assert.equal(f.servicio.normalizarDni('01234567'), '1234567');
  for (const dni of [undefined, null, 12345678, '123456', '123456789', '00000001', '12.345.678', 'ABC12345']) {
    assert.throws(() => f.servicio.normalizarDni(dni), { status: 400 });
  }
});

test('Ingresos: validar una persona normaliza los nombres y las opciones de sexo admitidas', () => {
  const f = crearContexto();
  for (const sexo of ['m', 'f', 'x']) {
    assert.deepEqual(f.servicio.validarPersona({ ...persona, sexo }), {
      dni: '12345678', nombre: 'Ana', apellido: 'García', sexo: sexo.toUpperCase()
    });
  }
});

test('Ingresos: registrar una persona rechaza nombres inseguros y valores de sexo inválidos antes de consultar', async () => {
  const f = crearContexto();
  for (const campo of ['nombre', 'apellido']) {
    for (const valor of [undefined, '', ' ', 'A'.repeat(101), 'Ana@otra', 'Ana\\otra', 'Ana\notra']) {
      await assert.rejects(f.servicio.registrarPersona({ ...persona, [campo]: valor }), { status: 400 });
    }
  }
  for (const sexo of [undefined, '', 'otro', 1]) await assert.rejects(f.servicio.registrarPersona({ ...persona, sexo }), { status: 400 });
  assert.equal(f.personas.obtenerPorDni.mock.callCount(), 0);
  assert.equal(f.personas.crear.mock.callCount(), 0);
});

test('Ingresos: identificar por DNI devuelve la persona existente sin volver a crearla', async () => {
  const f = crearContexto();
  const existente = Object.freeze({ id: 42, dni: '12345678', nombre: 'Ana' });
  f.personas.obtenerPorDni.mock.mockImplementation(async () => existente);
  assert.deepEqual(await f.servicio.identificar(' 12345678 '), { persona: existente, requiereRegistro: false });
  assert.deepEqual(f.personas.obtenerPorDni.mock.calls[0].arguments, ['12345678']);
  assert.equal(f.personas.crear.mock.callCount(), 0);
});

test('Ingresos: identificar un DNI nuevo solicita el registro sin crear una persona incompleta', async () => {
  const f = crearContexto();
  assert.deepEqual(await f.servicio.identificar('12345678'), { dni: '12345678', requiereRegistro: true });
  assert.equal(f.personas.crear.mock.callCount(), 0);
});

test('Ingresos: escanear un DNI nuevo interpreta separadores normales o escapados y registra la persona', async () => {
  for (const separador of ['@', '\\@']) {
    const f = crearContexto();
    const entrada = ['trámite', ' García ', ' Ana ', 'f', '12345678'].join(separador);
    const esperado = { dni: '12345678', nombre: 'Ana', apellido: 'García', sexo: 'F' };
    assert.deepEqual(await f.servicio.identificar(entrada), { persona: { id: 42, ...esperado }, requiereRegistro: false });
    assert.deepEqual(f.personas.crear.mock.calls[0].arguments, [esperado]);
  }
});

test('Ingresos: escanear un DNI existente conserva sus datos sin sobrescribirlos', async () => {
  const f = crearContexto();
  const existente = Object.freeze({ id: 42, dni: '12345678', nombre: 'Nombre registrado' });
  f.personas.obtenerPorDni.mock.mockImplementation(async () => existente);
  assert.deepEqual(await f.servicio.identificar('trámite@Otro apellido@Otro nombre@M@12345678'), { persona: existente, requiereRegistro: false });
  assert.equal(f.personas.crear.mock.callCount(), 0);
});

test('Ingresos: identificar rechaza entradas inválidas y escaneos incompletos antes de consultar', async () => {
  const f = crearContexto();
  for (const entrada of [undefined, null, {}, 12345678, 'A'.repeat(1001), 'trámite@apellido', '12.345.678']) {
    await assert.rejects(f.servicio.identificar(entrada), { status: 400 });
  }
  assert.equal(f.personas.obtenerPorDni.mock.callCount(), 0);
});

test('Ingresos: registrar una persona nueva descarta propiedades ajenas y normaliza los datos', async () => {
  const f = crearContexto();
  const esperado = { dni: '12345678', nombre: 'Ana', apellido: 'García', sexo: 'F' };
  assert.deepEqual(await f.servicio.registrarPersona({ ...persona, id: 900, empresa: 'Otra' }), { id: 42, ...esperado });
  assert.deepEqual(f.personas.crear.mock.calls[0].arguments, [esperado]);
});

test('Ingresos: registrar una persona existente conserva el registro y evita duplicarlo', async () => {
  const f = crearContexto();
  const existente = { id: 42, dni: '12345678', nombre: 'Ana' };
  f.personas.obtenerPorDni.mock.mockImplementation(async () => existente);
  assert.equal(await f.servicio.registrarPersona(persona), existente);
  assert.equal(f.personas.crear.mock.callCount(), 0);
});

for (const caso of [
  { nombre: 'contar movimientos', grupo: 'movimientos', dependencia: 'contar', ejecutar: servicio => servicio.listarMovimientos(1) },
  { nombre: 'listar movimientos', grupo: 'movimientos', dependencia: 'listar', ejecutar: servicio => servicio.listarMovimientos(1) },
  { nombre: 'crear un movimiento', grupo: 'movimientos', dependencia: 'crear', ejecutar: servicio => servicio.registrarMovimiento(movimiento) },
  { nombre: 'consultar la empresa', grupo: 'clientes', dependencia: 'obtenerPorId', ejecutar: servicio => servicio.registrarMovimiento({ ...movimiento, cliente_id: 2 }) },
  { nombre: 'identificar una persona', grupo: 'personas', dependencia: 'obtenerPorDni', ejecutar: servicio => servicio.identificar('12345678') },
  { nombre: 'crear una persona escaneada', grupo: 'personas', dependencia: 'crear', ejecutar: servicio => servicio.identificar('trámite@García@Ana@F@12345678') },
  { nombre: 'consultar una persona al registrarla', grupo: 'personas', dependencia: 'obtenerPorDni', ejecutar: servicio => servicio.registrarPersona(persona) },
  { nombre: 'crear una persona manualmente', grupo: 'personas', dependencia: 'crear', ejecutar: servicio => servicio.registrarPersona(persona) }
]) {
  test(`Ingresos: ${caso.nombre} propaga el error original del repositorio`, async () => {
    const f = crearContexto();
    const error = new Error('Falla simulada del repositorio');
    f[caso.grupo][caso.dependencia].mock.mockImplementation(async () => { throw error; });
    await assert.rejects(caso.ejecutar(f.servicio), recibido => recibido === error);
  });
}
