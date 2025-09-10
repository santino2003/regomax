const db = require('../config/db');
const { formatMySQLLocal, parseLocalDate } = require('../utils/fecha');

/**
 * Inserta un nuevo registro de NFU en la base de datos
 */
const insertarNFU = async (fecha, cantidad, responsable) => {
  try {
    console.log('🔍 Repository: Intentando insertar NFU con datos:', { fecha, cantidad, responsable });
    
    // Usar parseLocalDate para interpretar la fecha correctamente en zona horaria de Buenos Aires
    // y luego formatMySQLLocal para formatearla para MySQL
    let fechaFormateada;
    if (fecha.includes('T')) {
      // Si es formato ISO con hora (YYYY-MM-DDTHH:MM:SS)
      fechaFormateada = formatMySQLLocal(new Date(fecha));
    } else {
      // Si es solo fecha (YYYY-MM-DD)
      // parseLocalDate asegura que la fecha se interprete en zona horaria de Buenos Aires
      const fechaParsed = parseLocalDate(fecha);
      fechaFormateada = fecha + ' 00:00:00'; // Solo añadimos la hora 00:00:00
    }
    
    console.log('📅 Fecha formateada con zona horaria Buenos Aires:', fechaFormateada);
    
    const query = 'INSERT INTO nfu (fecha, cantidad, responsable) VALUES (?, ?, ?)';
    
    // Usar la fecha formateada en lugar de la fecha directa
    const result = await db.query(query, [fechaFormateada, cantidad, responsable]);
    
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

/**
 * Obtiene registros NFU con paginación y filtros
 * @param {number} page - Número de página
 * @param {number} limit - Límite de registros por página
 * @param {Object} filtros - Filtros a aplicar (fechaDesde, fechaHasta)
 * @returns {Promise<Object>} - Registros y metadatos de paginación
 */
const obtenerRegistrosNFU = async (page = 1, limit = 10, filtros = {}) => {
  try {
    // Validación segura de números para paginación
    const lim = Number.isFinite(+limit) ? Math.max(1, +limit) : 10;
    const p = Number.isFinite(+page) ? Math.max(1, +page) : 1;
    const off = (p - 1) * lim;
    
    // Construir consulta base
    let query = 'SELECT id, fecha, cantidad, responsable FROM nfu WHERE 1=1';
    const queryParams = [];
    
    // Aplicar filtros
    if (filtros.fechaDesde && filtros.fechaDesde.trim() !== '') {
      query += ' AND fecha >= ?';
      queryParams.push(filtros.fechaDesde);
    }
    
    if (filtros.fechaHasta && filtros.fechaHasta.trim() !== '') {
      query += ' AND fecha <= ?';
      queryParams.push(filtros.fechaHasta);
    }
    
    // Ordenar por fecha descendente
    query += ' ORDER BY fecha DESC';
    
    // Agregar paginación directamente en la consulta (sin usar marcadores de posición)
    // En MySQL, no se puede usar marcadores de posición para LIMIT y OFFSET
    query += ` LIMIT ${lim} OFFSET ${off}`;
    
    // Ejecutar la consulta
    const registros = await db.query(query, queryParams);
    
    // Consulta para contar total de registros con los mismos filtros
    let countQuery = 'SELECT COUNT(*) as total FROM nfu WHERE 1=1';
    const countParams = [];
    
    if (filtros.fechaDesde && filtros.fechaDesde.trim() !== '') {
      countQuery += ' AND fecha >= ?';
      countParams.push(filtros.fechaDesde);
    }
    
    if (filtros.fechaHasta && filtros.fechaHasta.trim() !== '') {
      countQuery += ' AND fecha <= ?';
      countParams.push(filtros.fechaHasta);
    }
    
    const countResult = await db.query(countQuery, countParams);
    const total = countResult[0]?.total ?? 0;
    
    return {
      data: registros,
      pagination: {
        total,
        page: p,
        limit: lim,
        totalPages: Math.ceil(total / lim)
      }
    };
  } catch (error) {
    console.error('Error al obtener registros NFU paginados:', error);
    throw error;
  }
};

module.exports = {
  insertarNFU,
  obtenerTodosNFU,
  obtenerNFUPorFecha,
  obtenerCantidadNFUPorFecha,
  obtenerNFUEntreFechas,
  obtenerCantidadNFUEntreFechas,
  obtenerNFUHastaFecha,
  obtenerCantidadNFUHastaFecha,
  obtenerRegistrosNFU
};