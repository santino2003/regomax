const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const mysql = require('mysql2/promise');
const { createPoolOptions } = require('../src/config/dbOptions');

test('the installed driver applies URL credentials and pool limits from a single options object', async () => {
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
  } finally { await pool.end(); }
});

test('defaults cap the connection queue and keep idle connections within the pool limit', () => {
  const options = createPoolOptions({});
  assert.equal(options.connectionLimit, 10);
  assert.equal(options.queueLimit, 10);
  assert.equal(createPoolOptions({ DB_CONNECTION_LIMIT: '1' }).maxIdle, 1);
  assert.ok(!Object.hasOwn(options, 'acquireTimeout'));
  assert.ok(!Object.hasOwn(options, 'timeout'));
});

test('invalid environment limits fail early with a useful message', () => {
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
  const dependencies = {
    'mysql2/promise': { createPool(...args) { calls.push(args); return pool; } },
    dotenv: { config() {} }
  };
  const mod = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module: mod, exports: mod.exports,
    require: name => Object.hasOwn(dependencies, name) ? dependencies[name] : baseRequire(name),
    process: { env: { DATABASE_URL: 'mysql://review:fake@127.0.0.1/review', SKIP_DB_CONNECTION_ERROR: '1', DB_RETRY_ATTEMPTS: '1' }, on() {}, exit() { throw new Error('unexpected exit'); } },
    console: { log() {}, error() {} }, global: {}, setInterval: () => 1, clearInterval() {}, setTimeout
  }, { filename });
  return { db: mod.exports, calls };
}

test('database bootstrap passes one options object and releases verification connections', async () => {
  let releases = 0;
  const pool = { async getConnection() { return { async query() { return [[{ db: 'mock' }]]; }, release() { releases++; } }; } };
  const { db, calls } = isolatedDatabase(pool);
  assert.equal(await db.verifyConnection(1, 0), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].length, 1);
  assert.equal(calls[0][0].queueLimit, 10);
  assert.ok(releases >= 1);
});

test('verification also releases a connection when its query fails', async () => {
  let releases = 0;
  const pool = { async getConnection() { return { async query() { throw new Error('verification failed'); }, release() { releases++; } }; }, async end() {} };
  const { db } = isolatedDatabase(pool);
  assert.equal(await db.verifyConnection(1, 0), false);
  assert.ok(releases >= 1);
});

test('transaction queries unwrap rows and never reconnect or retry after a connection failure', async () => {
  const pool = { async getConnection() { return { async query() { return [[{}]]; }, release() {} }; } };
  const { db, calls } = isolatedDatabase(pool);
  let attempts = 0;
  const connection = { async query() { attempts++; throw Object.assign(new Error('disconnected'), { code: 'ECONNRESET' }); } };
  await assert.rejects(db.query('INSERT INTO example VALUES (?)', [1], connection), /disconnected/);
  assert.equal(attempts, 1);
  assert.equal(calls.length, 1);
  const rows = await db.query('SELECT 1', [], { async query() { return [[{ value: 1 }]]; } });
  assert.equal(rows[0].value, 1);
});
