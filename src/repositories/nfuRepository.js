const db = require('../config/db');
const { formatMySQLLocal } = require('../utils/fecha');

/**
 * Inserta un nuevo registro de NFU en la base de datos
 */
const insertarNFU = async (fecha, cantidad, responsable) => {
  const query = 'INSERT INTO nfu (fecha, cantidad, responsable) VALUES (?, ?, ?)';
  const [result] = await db.query(query, [fecha, cantidad, responsable]);
  return result.insertId;
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