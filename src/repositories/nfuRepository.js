const db = require('../config/db');
const { formatMySQLLocal } = require('../utils/fecha');

/**
 * Inserta un nuevo registro de NFU en la base de datos
 */
const insertarNFU = async (fecha, cantidad, responsable) => {
  try {
    console.log('🔍 Repository: Intentando insertar NFU con datos:', { fecha, cantidad, responsable });
    const query = 'INSERT INTO nfu (fecha, cantidad, responsable) VALUES (?, ?, ?)';
    console.log('🔧 Query SQL:', query);
    
    // Corrección del error de destructuración
    const result = await db.query(query, [fecha, cantidad, responsable]);
    // En algunos drivers de MySQL, el resultado puede tener diferentes estructuras
    // Adaptamos el código para manejar diferentes formatos de respuesta
    let insertId;
    if (Array.isArray(result) && result.length > 0) {
      insertId = result[0].insertId || result[0].affectedRows;
    } else if (result && typeof result === 'object') {
      insertId = result.insertId || result.affectedRows;
    } else {
      insertId = 0; // Fallback si no podemos obtener un ID
    }
    
    console.log('✅ Repository: Inserción exitosa, resultado:', result);
    console.log('✅ Repository: ID generado o filas afectadas:', insertId);
    return insertId;
  } catch (error) {
    console.error('❌ Repository Error:', error.message);
    console.error('❌ SQL Error Code:', error.code);
    console.error('❌ SQL Error State:', error.sqlState);
    console.error('❌ Stack Trace:', error.stack);
    throw error; // Re-lanzar el error para que lo maneje el controlador
  }
};

/**
 * Obtiene todos los registros de NFU
 */
const obtenerTodosNFU = async () => {
  const query = 'SELECT id, fecha, cantidad, responsable FROM nfu ORDER BY fecha DESC';
  return await db.query(query);
};

/**
 * Obtiene el ingreso de NFU para una fecha específica
 */
const obtenerNFUPorFecha = async (fecha) => {
  const query = 'SELECT id, fecha, cantidad, responsable FROM nfu WHERE fecha = ? ORDER BY id ASC';
  return await db.query(query, [fecha]);
};

/**
 * Obtiene la cantidad total de NFU ingresados en una fecha específica
 */
const obtenerCantidadNFUPorFecha = async (fecha) => {
  const query = 'SELECT SUM(cantidad) as cantidadTotal FROM nfu WHERE fecha = ?';
  const result = await db.query(query, [fecha]);
  return result[0]?.cantidadTotal || 0;
};

/**
 * Obtiene los NFU ingresados entre dos fechas (inclusive)
 */
const obtenerNFUEntreFechas = async (fechaInicio, fechaFin) => {
  const query = 'SELECT id, fecha, cantidad, responsable FROM nfu WHERE fecha BETWEEN ? AND ? ORDER BY fecha ASC';
  return await db.query(query, [fechaInicio, fechaFin]);
};

/**
 * Obtiene la cantidad total de NFU ingresados entre dos fechas (inclusive)
 */
const obtenerCantidadNFUEntreFechas = async (fechaInicio, fechaFin) => {
  const query = 'SELECT SUM(cantidad) as cantidadTotal FROM nfu WHERE fecha BETWEEN ? AND ?';
  const result = await db.query(query, [fechaInicio, fechaFin]);
  return result[0]?.cantidadTotal || 0;
};

/**
 * Obtiene todos los NFU ingresados hasta una fecha específica (inclusive)
 */
const obtenerNFUHastaFecha = async (fecha) => {
  const query = 'SELECT id, fecha, cantidad, responsable FROM nfu WHERE fecha <= ? ORDER BY fecha ASC';
  return await db.query(query, [fecha]);
};

/**
 * Obtiene la cantidad total de NFU ingresados hasta una fecha específica (inclusive)
 */
const obtenerCantidadNFUHastaFecha = async (fecha) => {
  const query = 'SELECT SUM(cantidad) as cantidadTotal FROM nfu WHERE fecha <= ?';
  const result = await db.query(query, [fecha]);
  return result[0]?.cantidadTotal || 0;
};

module.exports = {
  insertarNFU,
  obtenerTodosNFU,
  obtenerNFUPorFecha,
  obtenerCantidadNFUPorFecha,
  obtenerNFUEntreFechas,
  obtenerCantidadNFUEntreFechas,
  obtenerNFUHastaFecha,
  obtenerCantidadNFUHastaFecha
};