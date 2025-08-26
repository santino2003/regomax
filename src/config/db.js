const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

// URL de conexión pública proporcionada por Railway
const RAILWAY_PUBLIC_URL = 'mysql://root:ulwuuyXLgrfQHzYfUspZxSTKyddSGZdg@crossover.proxy.rlwy.net:26920/railway';

// Verificar si estamos en desarrollo local o en Railway
const isRailwayEnvironment = process.env.RAILWAY_ENVIRONMENT === 'production';

if (isRailwayEnvironment) {
  // En Railway, usar variables internas proporcionadas por la plataforma
  console.log('Entorno Railway detectado, usando configuración interna');
  pool = mysql.createPool({
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'railway',
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQL_ROOT_PASSWORD || process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
} else {
  // En entorno local, usar la URL de conexión pública de Railway
  console.log('Entorno de desarrollo local detectado, usando URL de conexión pública');
  pool = mysql.createPool(RAILWAY_PUBLIC_URL);
}

// Verificar conexión
pool.getConnection()
  .then(connection => {
    console.log('Conexión a base de datos establecida correctamente');
    // Mostrar detalles de la conexión para diagnóstico
    connection.query('SELECT DATABASE() as db, USER() as user, @@hostname as host')
      .then(([rows]) => {
        console.log('Detalles de conexión:', rows[0]);
        connection.release();
      })
      .catch(err => {
        console.log('No se pudieron obtener detalles de conexión:', err.message);
        connection.release();
      });
  })
  .catch(err => {
    console.error('Error al conectar a la base de datos:', err);
    console.error('Modo de conexión:', isRailwayEnvironment ? 'Variables Railway internas' : 'URL de conexión pública');
    process.exit(-1);
  });

module.exports = {
  query: async (text, params) => {
    try {
      const [rows] = await pool.execute(text, params);
      return rows;
    } catch (error) {
      console.error('Error en consulta:', error);
      throw error;
    }
  },
  pool
};