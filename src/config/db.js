const mysql = require('mysql2/promise');
require('dotenv').config();

// Opciones avanzadas de conexión para manejar problemas de red
const connectionOptions = {
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0'),
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '60000'), // ms (60 segundos)
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'), // ms (60 segundos)
  timeout: parseInt(process.env.DB_TIMEOUT || '60000'), // ms (60 segundos)
  enableKeepAlive: process.env.DB_KEEP_ALIVE !== 'false',
  keepAliveInitialDelay: parseInt(process.env.DB_KEEP_ALIVE_DELAY || '10000') // ms (10 segundos)
};

console.log('Intentando conectar a la base de datos...');

// Crear el pool de conexiones con la URL desde variables de entorno
let pool;

if (process.env.DATABASE_URL) {
  console.log('Usando DATABASE_URL de variables de entorno');
  pool = mysql.createPool(process.env.DATABASE_URL, connectionOptions);
} else {
  console.error('ERROR: No se encontró la variable de entorno DATABASE_URL. La aplicación no podrá conectarse a la base de datos.');
  if (!process.env.SKIP_DB_CONNECTION_ERROR) {
    process.exit(-1);
  }
}

// Función para verificar la conexión con reintentos
async function verifyConnection(retries = parseInt(process.env.DB_RETRY_ATTEMPTS || '3'), 
                               delay = parseInt(process.env.DB_RETRY_DELAY || '5000')) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Intento de conexión ${attempt} de ${retries}...`);
      const connection = await pool.getConnection();
      console.log('¡Conexión a base de datos establecida correctamente!');
      
      // Obtener detalles de la conexión
      const [rows] = await connection.query('SELECT DATABASE() as db, USER() as user, @@hostname as host');
      console.log('Detalles de conexión:', rows[0]);
      
      connection.release();
      return true;
    } catch (err) {
      console.error(`Error en intento ${attempt}:`, err.message);
      
      if (err.code === 'ETIMEDOUT') {
        console.error('Tiempo de espera agotado. Esto puede deberse a:');
        console.error('- Problemas de red entre tu entorno y el servidor de base de datos');
        console.error('- Firewall bloqueando la conexión saliente');
        console.error('- El host o puerto de la base de datos no es correcto');
      }
      
      if (attempt < retries) {
        console.log(`Reintentando en ${delay/1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('Se agotaron los reintentos de conexión. Verifica:');
        console.error('1. La URL de conexión es correcta');
        console.error('2. Tienes acceso a internet');
        console.error('3. No hay firewalls bloqueando la conexión');
        console.error('4. El servicio de base de datos está activo');
        console.error('Detalles de configuración:', {
          url: process.env.DATABASE_URL ? 'Configurada con DATABASE_URL' : 'DATABASE_URL no encontrada'
        });
        
        if (!process.env.SKIP_DB_CONNECTION_ERROR) {
          process.exit(-1);
        }
      }
    }
  }
  
  return false;
}

// Iniciar verificación de conexión
verifyConnection();

function hasPlaceholders(sql) {
  return /\?/.test(sql);
}

function countPlaceholders(sql) {
  // cuenta ? que no estén dentro de comillas simples o dobles (simple aproximación)
  let count = 0, inS=false, inD=false;
  for (let i=0;i<sql.length;i++){
    const c = sql[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === "?" && !inS && !inD) count++;
  }
  return count;
}

module.exports = {
  query: async (text, params) => {
    try {
      const hasQ = hasPlaceholders(text);
      const placeCount = countPlaceholders(text);

      // Logs de depuración (podés comentar luego)
      // console.log('[DB] SQL:', text);
      // console.log('[DB] has?=', hasQ, 'placeCount=', placeCount, 'paramsType=', Array.isArray(params) ? `array(${params.length})` : typeof params, 'params=', params);

      if (!hasQ) {
        // SQL sin ?, NO pasar params
        const [rows] = await pool.query(text);
        return rows;
      }

      // SQL con ?, validar params
      if (!Array.isArray(params)) {
        throw new Error('db.query: params debe ser un array cuando el SQL tiene placeholders (?)');
      }
      if (params.length !== placeCount) {
        throw new Error(`db.query: cantidad de valores (${params.length}) no coincide con placeholders (${placeCount})`);
      }

      const [rows] = await pool.execute(text, params);
      return rows;

    } catch (error) {
      // reconexión como ya tenías
      if (['ECONNREFUSED','ETIMEDOUT','PROTOCOL_CONNECTION_LOST'].includes(error.code)) {
        console.error('Error de conexión en consulta. Intentando reconectar...');
        await verifyConnection(1);
        const hasQ = hasPlaceholders(text);
        if (!hasQ) {
          const [rows] = await pool.query(text);
          return rows;
        } else {
          const [rows] = await pool.execute(text, Array.isArray(params) ? params : []);
          return rows;
        }
      }
      console.error('Error en consulta:', error);
      throw error;
    }
  },
  pool,
  verifyConnection
};