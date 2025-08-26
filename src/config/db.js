const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

// Primero intentar con DATABASE_URL (formato priorizado por Railway)
if (process.env.DATABASE_URL) {
  console.log('Usando DATABASE_URL para la conexión a la base de datos');
  pool = mysql.createPool(process.env.DATABASE_URL);
} else {
  // Si no hay DATABASE_URL, usar configuración por partes
  console.log('Usando variables de entorno individuales para la conexión');
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

// Verificar conexión
pool.getConnection()
  .then(connection => {
    console.log('Conexión a MariaDB establecida correctamente');
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
    console.error('Error al conectar a MariaDB:', err);
    if (err.code === 'ECONNREFUSED') {
      console.error('La conexión fue rechazada. Verifica que el servidor de base de datos esté en ejecución y sea accesible.');
    }
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