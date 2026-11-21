const { randomUUID } = require('node:crypto');

async function connectDatabase() {
  require('dotenv').config();
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  if (!process.env.DATABASE_URL) throw new Error('Se requiere TEST_DATABASE_URL o DATABASE_URL para las pruebas de integración');
  process.env.SKIP_DB_CONNECTION_ERROR = '1';
  const db = require('../src/config/db');
  global._keepaliveInterval?.unref();
  global._memoryMonitorInterval?.unref();
  if (!await db.verifyConnection(1, 0)) {
    await closeDatabase(db);
    throw new Error('No se pudo conectar con la base de pruebas');
  }
  return db;
}

async function closeDatabase(db) {
  clearInterval(global._keepaliveInterval);
  clearInterval(global._memoryMonitorInterval);
  if (db) await db.getPool()?.end();
}

async function checkTables(db, tables) {
  const placeholders = tables.map(() => '?').join(', ');
  const rows = await db.query(`SELECT TABLE_NAME AS name, ENGINE AS engine
    FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders})`, tables);
  for (const table of tables) {
    if (!rows.some(row => row.name === table && row.engine === 'InnoDB')) {
      throw new Error(`La prueba requiere la tabla ${table} con motor InnoDB`);
    }
  }
}

function createScope() {
  const token = randomUUID().replaceAll('-', '').slice(0, 12);
  return { prefix: `IT-${token}`, user: `integration_${token}` };
}

async function createStockFixture(t, db, { stock = 10, secondStock = 10, critical = null, kit = false } = {}) {
  const scope = createScope();
  const codes = [1, 2, 3].map(index => `${scope.prefix}-${index}`);
  t.after(async () => {
    // Cada eliminación se limita a los identificadores generados por estos datos de prueba.
    await db.query('DELETE FROM movimientos_stock WHERE usuario_sistema = ?', [scope.user]);
    await db.query('DELETE FROM bienes WHERE responsable = ? AND codigo IN (?, ?, ?)', [scope.user, ...codes]);
    const remaining = await db.query('SELECT COUNT(*) AS total FROM bienes WHERE responsable = ?', [scope.user]);
    if (Number(remaining[0].total) !== 0) throw new Error('No se pudieron limpiar los bienes de la prueba');
  });
  async function add(index, amount, isKit = false) {
    const result = await db.query(`INSERT INTO bienes
      (codigo, nombre, tipo, cantidad_stock, cantidad_critica, es_kit, responsable)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [codes[index - 1], `${scope.prefix} fixture ${index}`, 'Consumo', amount, index === 1 ? critical : null, isKit, scope.user]);
    return result.insertId;
  }
  const first = await add(1, stock);
  let second, kitId;
  if (kit) {
    second = await add(2, secondStock);
    kitId = await add(3, 0, true);
    await db.query('INSERT INTO bien_componentes (bien_kit_id, bien_componente_id, cantidad) VALUES (?, ?, ?), (?, ?, ?)',
      [kitId, first, 2, kitId, second, 1]);
  }
  return {
    ...scope, first, second, kitId,
    async balance(id = first) {
      const rows = await db.query('SELECT cantidad_stock FROM bienes WHERE id = ?', [id]);
      return Number(rows[0].cantidad_stock);
    },
    async movements() {
      return db.query('SELECT * FROM movimientos_stock WHERE usuario_sistema = ? ORDER BY id', [scope.user]);
    }
  };
}

module.exports = { connectDatabase, closeDatabase, checkTables, createScope, createStockFixture };
