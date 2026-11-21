const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { cargarServicio } = require('../test-support/serviceUnit');

const { createLoginProtection } = cargarServicio('loginProtection');
const peticion = Object.freeze({ ip: '192.0.2.1', socket: Object.freeze({ remoteAddress: '192.0.2.2' }) });

function crearContexto(filas = []) {
  const db = { query: mock.fn(async sql => sql.startsWith('SELECT') ? filas : []) };
  const fetchImpl = mock.fn(async () => ({ ok: true, json: async () => ({ success: true }) }));
  const env = { RECAPTCHA_SITE_KEY: 'clave-publica-simulada', RECAPTCHA_SECRET_KEY: 'secreto-simulado' };
  const proteccion = createLoginProtection({ db, fetchImpl, env });
  return { proteccion, db, fetchImpl, env };
}

test('Protección del login: la configuración requiere ambas claves sin aceptar espacios vacíos', () => {
  for (const env of [{}, { RECAPTCHA_SITE_KEY: 'pública' }, { RECAPTCHA_SITE_KEY: 'pública', RECAPTCHA_SECRET_KEY: '  ' }]) {
    assert.equal(createLoginProtection({ db: {}, env }).configured(), false);
  }
  const f = crearContexto();
  assert.equal(f.proteccion.configured(), true);
  assert.equal(f.proteccion.siteKey(), f.env.RECAPTCHA_SITE_KEY);
  assert.equal(createLoginProtection({ db: {}, env: {} }).siteKey(), '');
});

test('Protección del login: exige reCAPTCHA a partir de dos intentos fallidos', async () => {
  for (const caso of [{ filas: [], requerido: false }, { filas: [{ failures: 1 }], requerido: false }, { filas: [{ failures: 2 }], requerido: true }, { filas: [{ failures: 5 }], requerido: true }]) {
    assert.equal(await crearContexto(caso.filas).proteccion.required(peticion), caso.requerido);
  }
});

test('Protección del login: inicializa el almacenamiento una sola vez ante consultas simultáneas', async () => {
  const f = crearContexto();
  await Promise.all([f.proteccion.required(peticion), f.proteccion.required(peticion)]);
  assert.equal(f.db.query.mock.calls.filter(llamada => llamada.arguments[0].startsWith('CREATE TABLE')).length, 1);
  assert.equal(f.db.query.mock.calls.filter(llamada => llamada.arguments[0].startsWith('SELECT')).length, 2);
});

test('Protección del login: una inicialización fallida permite reintentar posteriormente', async () => {
  const f = crearContexto();
  const error = new Error('Falló la inicialización');
  let creaciones = 0;
  f.db.query.mock.mockImplementation(async sql => {
    if (sql.startsWith('CREATE TABLE') && ++creaciones === 1) throw error;
    return [];
  });
  await assert.rejects(f.proteccion.required(peticion), recibido => recibido === error);
  assert.equal(await f.proteccion.required(peticion), false);
  assert.equal(creaciones, 2);
});

test('Protección del login: almacena un hash de la IP y respeta las fuentes alternativas de dirección', async () => {
  for (const caso of [
    { req: peticion, ip: '192.0.2.1' },
    { req: { socket: { remoteAddress: '192.0.2.2' } }, ip: '192.0.2.2' },
    { req: { socket: {} }, ip: 'unknown' }
  ]) {
    const f = crearContexto();
    await f.proteccion.required(caso.req);
    const consulta = f.db.query.mock.calls.find(llamada => llamada.arguments[0].startsWith('SELECT'));
    assert.deepEqual(consulta.arguments[1], [createHash('sha256').update(caso.ip).digest('hex')]);
    assert.notEqual(consulta.arguments[1][0], caso.ip);
  }
});

test('Protección del login: registrar una falla limpia vencimientos, guarda el intento y consulta el nuevo requisito', async () => {
  const f = crearContexto([{ failures: 2 }]);
  assert.equal(await f.proteccion.failed(peticion), true);
  const llamadas = f.db.query.mock.calls;
  assert.deepEqual(llamadas.map(llamada => llamada.arguments[0].trim().split(/\s+/)[0]), ['CREATE', 'DELETE', 'INSERT', 'SELECT']);
  assert.deepEqual(llamadas[2].arguments[1], llamadas[3].arguments[1]);
});

test('Protección del login: limpiar elimina únicamente los intentos correspondientes al hash de la petición', async () => {
  const f = crearContexto();
  await f.proteccion.clear(peticion);
  const eliminacion = f.db.query.mock.calls.find(llamada => llamada.arguments[0].startsWith('DELETE'));
  assert.match(eliminacion.arguments[0], /WHERE ip_hash = \?/);
  assert.deepEqual(eliminacion.arguments[1], [createHash('sha256').update(peticion.ip).digest('hex')]);
});

test('Protección del login: verificar sin configuración falla antes de enviar solicitudes', async () => {
  const f = crearContexto();
  delete f.env.RECAPTCHA_SECRET_KEY;
  await assert.rejects(f.proteccion.verify('token'), { message: 'reCAPTCHA no configurado' });
  assert.equal(f.fetchImpl.mock.callCount(), 0);
});

test('Protección del login: los tokens ausentes, de otro tipo o demasiado largos se rechazan sin solicitudes', async () => {
  const f = crearContexto();
  for (const token of [undefined, null, '', 123, {}, 'A'.repeat(10001)]) assert.equal(await f.proteccion.verify(token), false);
  assert.equal(f.fetchImpl.mock.callCount(), 0);
});

test('Protección del login: verificar envía los parámetros y el límite de tiempo al cliente HTTP simulado', async () => {
  const f = crearContexto();
  assert.equal(await f.proteccion.verify('token-simulado'), true);
  const [url, opciones] = f.fetchImpl.mock.calls[0].arguments;
  assert.equal(url, 'https://www.google.com/recaptcha/api/siteverify');
  assert.equal(opciones.method, 'POST');
  assert.equal(opciones.body.get('secret'), 'secreto-simulado');
  assert.equal(opciones.body.get('response'), 'token-simulado');
  assert.ok(opciones.signal instanceof AbortSignal);
  assert.equal(opciones.signal.aborted, false);
});

test('Protección del login: únicamente una respuesta con success igual a true valida el token', async () => {
  for (const success of [false, undefined, 1, 'true']) {
    const f = crearContexto();
    f.fetchImpl.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ success }) }));
    assert.equal(await f.proteccion.verify('token'), false);
  }
});

test('Protección del login: una respuesta HTTP fallida informa que reCAPTCHA no está disponible', async () => {
  const f = crearContexto();
  const leer = mock.fn(async () => ({}));
  f.fetchImpl.mock.mockImplementation(async () => ({ ok: false, json: leer }));
  await assert.rejects(f.proteccion.verify('token'), { message: 'reCAPTCHA no disponible' });
  assert.equal(leer.mock.callCount(), 0);
});

for (const etapa of ['solicitud', 'respuesta JSON']) {
  test(`Protección del login: una falla de ${etapa} conserva el error original`, async () => {
    const f = crearContexto();
    const error = new Error('Falla simulada del cliente HTTP');
    f.fetchImpl.mock.mockImplementation(async () => {
      if (etapa === 'solicitud') throw error;
      return { ok: true, json: async () => { throw error; } };
    });
    await assert.rejects(f.proteccion.verify('token'), recibido => recibido === error);
  });
}

for (const metodo of ['required', 'failed', 'clear']) {
  test(`Protección del login: ${metodo} propaga una falla del almacenamiento`, async () => {
    const f = crearContexto();
    const error = new Error('Falló el almacenamiento');
    f.db.query.mock.mockImplementation(async sql => {
      if (!sql.startsWith('CREATE TABLE')) throw error;
      return [];
    });
    await assert.rejects(f.proteccion[metodo](peticion), recibido => recibido === error);
  });
}
