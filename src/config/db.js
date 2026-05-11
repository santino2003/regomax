const mysql = require('mysql2/promise');
require('dotenv').config();

// Pool sizing can be overridden via environment variables DB_CONNECTION_LIMIT and DB_QUEUE_LIMIT
const connectionOptions = {
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'), // 10 concurrent connections for production
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '10'), // cap queue to prevent unbounded memory growth
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000'),
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '10000'),
  timeout: parseInt(process.env.DB_TIMEOUT || '10000'),
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  idleTimeout: 15000, // release idle connections faster to free memory
  maxIdle: 2
};

console.log('🔌 Inicializando conexión a base de datos...');

let pool;

function createPool() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL no encontrada');
    if (!process.env.SKIP_DB_CONNECTION_ERROR) {
      process.exit(-1);
    }
    return null;
  }
  console.log('🟢 Creando pool MySQL - Límite:', connectionOptions.connectionLimit, 'conexiones');
  return mysql.createPool(process.env.DATABASE_URL, connectionOptions);
}

function getPool() {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

// Función para verificar la conexión con reintentos
async function verifyConnection(retries = parseInt(process.env.DB_RETRY_ATTEMPTS || '3'), 
                               delay = parseInt(process.env.DB_RETRY_DELAY || '5000')) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Intento de conexión ${attempt} de ${retries}...`);
      const connection = await getPool().getConnection();
      
      // Obtener detalles de la conexión y configuración
      const [rows] = await connection.query(`
        SELECT 
          DATABASE() as db, 
          USER() as user, 
          @@hostname as host,
          @@max_connections as max_conn,
          @@version as version
      `);
      console.log('🟢 Conexión establecida:', rows[0]);
      
      connection.release(); // ⚠️ CRÍTICO: Siempre liberar la conexión
      return true;
    } catch (err) {
      console.error(`🔴 Error en intento ${attempt}:`, err.code || err.message);
      
      if (pool) {
        try {
          await pool.end();
          console.log('🗑️ Pool anterior cerrado correctamente');
        } catch (e) {
          console.error('⚠️ Error cerrando pool:', e.message);
        }
      }
      pool = null;
      
      if (attempt < retries) {
        console.log(`⏳ Reintentando en ${delay/1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('❌ Se agotaron los reintentos de conexión');
        console.error('💡 Verifica:');
        console.error('  1. La URL de conexión (DATABASE_URL) es correcta');
        console.error('  2. El servicio de base de datos está activo en Railway');
        console.error('  3. No hay límites de memoria excedidos');
        console.error('  4. Revisa los logs de MySQL en Railway');
        
        if (!process.env.SKIP_DB_CONNECTION_ERROR) {
          process.exit(-1);
        }
      }
    }
  }
  
  return false;
}

// ✅ FIX 1: Evitar duplicación usando global
if (global._keepaliveInterval) {
  clearInterval(global._keepaliveInterval);
  console.log('🔄 Limpiando keepalive anterior para evitar leak');
}

// ✅ FIX 2: Keepalive SIMPLE sin acceso a internals
global._keepaliveInterval = setInterval(async () => {
  try {
    const currentPool = getPool();
    if (currentPool) {
      await currentPool.query('SELECT 1');
      console.log('🟢 Keepalive OK');
    }
  } catch (e) {
    console.error('🔴 Keepalive falló:', e.message);
    if (pool) {
      await pool.end().catch(() => {});
    }
    pool = null;
  }
}, 300000); // 5 minutos

// ✅ FIX 3: Monitoreo de memoria para detectar leaks (sin crear múltiples intervals)
if (process.env.DEBUG_MEMORY === 'true') {
  if (global._memoryMonitorInterval) {
    clearInterval(global._memoryMonitorInterval);
    console.log('🔄 Limpiando monitor de memoria anterior para evitar leak');
  }
  
  global._memoryMonitorInterval = setInterval(() => {
    const m = process.memoryUsage();
    console.log('💾 MEMORIA:', {
      rss: Math.round(m.rss / 1024 / 1024) + 'MB',
      heap: Math.round(m.heapUsed / 1024 / 1024) + 'MB',
      external: Math.round(m.external / 1024 / 1024) + 'MB'
    });
  }, 60000); // Cada minuto
}

function hasPlaceholders(sql) {
  return /\?/.test(sql);
}

function countPlaceholders(sql) {
  let count = 0, inS = false, inD = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === "?" && !inS && !inD) count++;
  }
  return count;
}

async function query(text, params) {
  try {
    const currentPool = getPool();
    if (!currentPool) {
      throw new Error('Pool de conexiones no disponible');
    }
    
    const hasQ = hasPlaceholders(text);
    const placeCount = countPlaceholders(text);

    if (!hasQ) {
      const [rows] = await currentPool.query(text);
      return rows;
    }

    if (!Array.isArray(params)) {
      throw new Error('db.query: params debe ser un array cuando el SQL tiene placeholders (?)');
    }
    if (params.length !== placeCount) {
      throw new Error(`db.query: cantidad de valores (${params.length}) no coincide con placeholders (${placeCount})`);
    }

    const [rows] = await currentPool.execute(text, params);
    return rows;

  } catch (error) {
    // Reconexión automática en caso de pérdida de conexión
    const reconnectErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST', 'ECONNRESET', 'EPIPE'];
    
    if (reconnectErrors.includes(error.code)) {
      console.error('🔁 Conexión perdida:', error.code, '- Intentando reconectar...');
      
      if (pool) {
        await pool.end().catch(() => {});
      }
      pool = null;
      
      await verifyConnection(1, 2000);
      const pool2 = getPool();

      if (!hasPlaceholders(text)) {
        const [rows] = await pool2.query(text);
        return rows;
      } else {
        const [rows] = await pool2.execute(text, Array.isArray(params) ? params : []);
        return rows;
      }
    }
    
    console.error('❌ Error en consulta SQL:', error.message);
    throw error;
  }
}

// Limpieza completa al cerrar
function cleanup() {
  console.log('🛑 Cerrando conexiones DB...');
  
  // Limpiar todos los intervals para evitar leaks
  if (global._keepaliveInterval) {
    clearInterval(global._keepaliveInterval);
    console.log('✅ Keepalive interval limpiado');
  }
  if (global._memoryMonitorInterval) {
    clearInterval(global._memoryMonitorInterval);
    console.log('✅ Memory monitor interval limpiado');
  }
  
  if (pool) {
    pool.end().then(() => {
      console.log('✅ Pool cerrado correctamente');
      process.exit(0);
    }).catch(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

// Primera verificación
verifyConnection();

module.exports = {
  query,
  get pool() {
    return getPool();
  },
  getPool,
  verifyConnection
};
