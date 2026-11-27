const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { createRequire } = require('node:module');
const mysql = require('mysql2/promise');
const { createPoolOptions } = require('../src/config/dbOptions');

test('El controlador instalado aplica las credenciales de la URL y los límites del pool desde un único objeto', async () => {
  const pool = mysql.createPool(createPoolOptions({
    DATABASE_URL: 'mysql://review:p%40ss%3Aword@127.0.0.1:3339/regomax',
    DB_CONNECTION_LIMIT: '3', DB_QUEUE_LIMIT: '7', DB_CONNECT_TIMEOUT: '4000', DB_IDLE_TIMEOUT: '9000'
  }));
  try {
    const options = pool.pool.config;
    assert.equal(options.connectionLimit, 3);
    assert.equal(options.queueLimit, 7);
    assert.equal(options.maxIdle, 2);
    assert.equal(options.idleTimeout, 9000);
    assert.equal(options.connectionConfig.connectTimeout, 4000);
    assert.equal(options.connectionConfig.user, 'review');
    assert.equal(options.connectionConfig.password, 'p@ss:word');
    assert.equal(options.connectionConfig.port, 3339);
    assert.equal(options.connectionConfig.database, 'regomax');
    assert.equal(options.connectionConfig.timezone, '-03:00');
  } finally { await pool.end(); }
});

test('Los valores predeterminados limitan la cola y mantienen las conexiones inactivas dentro del límite del pool', () => {
  const options = createPoolOptions({});
  assert.equal(options.connectionLimit, 10);
  assert.equal(options.queueLimit, 10);
  assert.equal(createPoolOptions({ DB_CONNECTION_LIMIT: '1' }).maxIdle, 1);
  assert.ok(!Object.hasOwn(options, 'acquireTimeout'));
  assert.ok(!Object.hasOwn(options, 'timeout'));
});

test('Los límites de entorno inválidos se rechazan con un mensaje claro', () => {
  for (const value of ['abc', '-1', '1.5', 'Infinity', '2abc', '0']) {
    assert.throws(() => createPoolOptions({ DB_CONNECTION_LIMIT: value }), /DB_CONNECTION_LIMIT/);
  }
  assert.throws(() => createPoolOptions({ DB_QUEUE_LIMIT: '-1' }), /DB_QUEUE_LIMIT/);
  assert.equal(createPoolOptions({ DB_QUEUE_LIMIT: '0' }).queueLimit, 0);
});

function isolatedDatabase(pool) {
  const filename = path.resolve(__dirname, '../src/config/db.js');
  const baseRequire = createRequire(filename);
  const calls = [];
  const events = new EventEmitter();
  pool.on = events.on.bind(events);
  const dependencies = {
    'mysql2/promise': { createPool(...args) { calls.push(args); return pool; } },
    dotenv: { config() {} }
  };
  const mod = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module: mod, exports: mod.exports,
    require: name => Object.hasOwn(dependencies, name) ? dependencies[name] : baseRequire(name),
    process: { env: { DATABASE_URL: 'mysql://review:fake@127.0.0.1/review', SKIP_DB_CONNECTION_ERROR: '1', DB_RETRY_ATTEMPTS: '1' }, on() {}, exit() { throw new Error('Salida inesperada del proceso'); } },
    console: { log() {}, error() {} }, global: {}, setInterval: () => 1, clearInterval() {}, setTimeout
  }, { filename });
  return { db: mod.exports, calls, events };
}

test('Las conexiones nuevas fijan la sesión de MySQL en horario argentino', () => {
  const pool = { async getConnection() { return { async query() { return [[{}]]; }, release() {} }; } };
  const { events } = isolatedDatabase(pool);
  const consultas = [];
  events.emit('connection', {
    query(sql, callback) { consultas.push(sql); callback(null); }
  });
  assert.deepEqual(consultas, ["SET SESSION time_zone = '-03:00'"]);
});

test('Una conexión que no puede configurar la hora argentina se descarta', () => {
  const pool = { async getConnection() { return { async query() { return [[{}]]; }, release() {} }; } };
  const { events } = isolatedDatabase(pool);
  let destruida = false;
  events.emit('connection', {
    query(sql, callback) { callback(new Error('No se pudo configurar la sesión')); },
    destroy() { destruida = true; }
  });
  assert.equal(destruida, true);
});

test('La inicialización de la base pasa un único objeto de opciones y libera las conexiones de verificación', async () => {
  let releases = 0;
  const pool = { async getConnection() { return { async query() { return [[{ db: 'mock' }]]; }, release() { releases++; } }; } };
  const { db, calls } = isolatedDatabase(pool);
  assert.equal(await db.verifyConnection(1, 0), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].length, 1);
  assert.equal(calls[0][0].queueLimit, 10);
  assert.ok(releases >= 1);
});

test('La verificación también libera la conexión cuando falla su consulta', async () => {
  let releases = 0;
  const pool = { async getConnection() { return { async query() { throw new Error('Falló la verificación'); }, release() { releases++; } }; }, async end() {} };
  const { db } = isolatedDatabase(pool);
  assert.equal(await db.verifyConnection(1, 0), false);
  assert.ok(releases >= 1);
});

test('Las consultas de una transacción devuelven las filas sin reconectarse ni reintentarse ante una falla de conexión', async () => {
  const pool = { async getConnection() { return { async query() { return [[{}]]; }, release() {} }; } };
  const { db, calls } = isolatedDatabase(pool);
  let attempts = 0;
  const connection = { async query() { attempts++; throw Object.assign(new Error('Conexión interrumpida'), { code: 'ECONNRESET' }); } };
  await assert.rejects(db.query('INSERT INTO example VALUES (?)', [1], connection), /Conexión interrumpida/);
  assert.equal(attempts, 1);
  assert.equal(calls.length, 1);
  const rows = await db.query('SELECT 1', [], { async query() { return [[{ value: 1 }]]; } });
  assert.equal(rows[0].value, 1);
});
