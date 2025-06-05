const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verificar conexión
pool.getConnection()
  .then(connection => {
    console.log('Conexión a MariaDB establecida correctamente');
    connection.release();
  })
  .catch(err => {
    console.error('Error al conectar a MariaDB:', err);
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