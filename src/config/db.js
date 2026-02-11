const mysql = require('mysql2/promise');
require('dotenv').config();

// Opciones optimizadas para Railway - Evitar fugas de memoria y conexiones
const connectionOptions = {
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '5'), // Reducido para menos memoria
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0'),
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000'), // Reducido a 10s
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '10000'), // Reducido a 10s
  timeout: parseInt(process.env.DB_TIMEOUT || '10000'), // Reducido a 10s
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  // CRÍTICO: Cerrar conexiones inactivas automáticamente
  idleTimeout: 30000, // Cerrar conexiones inactivas después de 30s
  maxIdle: 2 // Máximo 2 conexiones inactivas en el pool
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
      
      if (err.code === 'ETIMEDOUT') {
        console.error('⏱️ Timeout - Verifica conectividad de red o firewall');
      } else if (err.code === 'ECONNREFUSED') {
        console.error('🚫 Conexión rechazada - El servidor MySQL no está disponible');
      } else if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('📡 Conexión perdida - El servidor cerró la conexión');
      }
      
      // Cerrar pool anterior completamente
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

// Ping anti-timeout para Railway + Monitoreo de pool
let keepaliveInterval = setInterval(async () => {
  try {
    const currentPool = getPool();
    if (currentPool) {
      await currentPool.query('SELECT 1');
      
      // Mostrar estado del pool para debugging
      const poolState = currentPool.pool;
      const allConns = poolState._allConnections?.length || 0;
      const freeConns = poolState._freeConnections?.length || 0;
      const inUse = allConns - freeConns;
      
      console.log('🟢 Keepalive OK - Pool:', {
        total: allConns,
        libres: freeConns,
        enUso: inUse
      });
      
      // Alertar si hay muchas conexiones en uso
      if (inUse > 3) {
        console.warn('⚠️ Alto uso de conexiones:', inUse, '- Verifica si hay fugas');
      }
    }
  } catch (e) {
    console.log('🔴 Keepalive falló:', e.message, '- Recreando pool...');
    if (pool) {
      await pool.end().catch(() => {});
    }
    pool = null;
  }
}, 300000); // 5 minutos

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
      console.error('🔁 Conexión perdida:', error.code, '- Recreando pool y reintentando...');
      
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

// Limpieza al cerrar la aplicación
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM recibido - Cerrando conexiones DB...');
  clearInterval(keepaliveInterval);
  if (pool) {
    await pool.end();
    console.log('✅ Pool de conexiones cerrado correctamente');
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT recibido - Cerrando conexiones DB...');
  clearInterval(keepaliveInterval);
  if (pool) {
    await pool.end();
    console.log('✅ Pool de conexiones cerrado correctamente');
  }
  process.exit(0);
});

// Primera verificación al boot
verifyConnection();

module.exports = {
  query,
  get pool() {
    return getPool(); // Getter dinámico para compatibilidad con db.pool.getConnection()
  },
  getPool,
  verifyConnection
};
