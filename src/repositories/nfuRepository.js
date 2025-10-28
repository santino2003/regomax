const db = require('../config/db');
const { formatMySQLLocal, parseLocalDate, fechaActual } = require('../utils/fecha');

/**
 * Inserta un nuevo registro de NFU en la base de datos
 */
const insertarNFU = async (fecha, cantidad, responsable, cliente_id = null, categoria = null, tipo = null) => {
  try {
    console.log('🔍 Repository: Intentando insertar NFU con datos:', { fecha, cantidad, responsable, cliente_id, categoria, tipo });
    
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
    
    // Obtener la hora actual en Buenos Aires
    const horaActual = fechaActual();
    const horaString = `${horaActual.getHours()}:${horaActual.getMinutes()}:${horaActual.getSeconds()}`;
    
    console.log('⏰ Hora actual en Buenos Aires:', horaString);
    
    const query = 'INSERT INTO nfu (fecha, cantidad, responsable, hora, cliente_id, categoria, tipo) VALUES (?, ?, ?, ?, ?, ?, ?)';
    
    // Usar la fecha formateada en lugar de la fecha directa
    const result = await db.query(query, [fechaFormateada, cantidad, responsable, horaString, cliente_id, categoria, tipo]);
    
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
 * Obtiene la cantidad total de NFU ingresados en una fecha específica
 */
const obtenerCantidadNFUPorFecha = async (fecha) => {
  const query = 'SELECT SUM(cantidad) as cantidadTotal FROM nfu WHERE fecha = ?';
  const result = await db.query(query, [fecha]);
  return result[0]?.cantidadTotal || 0;
};



/**
 * Obtiene la cantidad total de NFU ingresados entre dos fechas (inclusive)
 */
const obtenerCantidadNFUEntreFechas = async (fechaInicio, fechaFin) => {
  const query = 'SELECT SUM(cantidad) as cantidadTotal FROM nfu WHERE fecha BETWEEN ? AND ?';
  const result = await db.query(query, [fechaInicio, fechaFin]);
  console.log(`\x1b[31mCantidad NFU acumulada entre ${fechaInicio} y ${fechaFin}:\x1b[0m`, result[0]?.cantidadTotal);
  return result[0]?.cantidadTotal || 0;
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
 * @param {Object} filtros - Filtros a aplicar (fechaDesde, fechaHasta, categoria, tipo)
 * @returns {Promise<Object>} - Registros y metadatos de paginación
 */
const obtenerRegistrosNFU = async (page = 1, limit = 10, filtros = {}) => {
  try {
    // Validación segura de números para paginación
    const lim = Number.isFinite(+limit) ? Math.max(1, +limit) : 10;
    const p = Number.isFinite(+page) ? Math.max(1, +page) : 1;
    const off = (p - 1) * lim;
    
    // Construir consulta base con JOIN para traer el cliente
    let query = `
      SELECT 
        nfu.id, 
        nfu.fecha, 
        nfu.cantidad, 
        nfu.responsable,
        nfu.cliente_id,
        nfu.categoria,
        nfu.tipo,
        cn.empresa AS cliente_empresa,
        cn.cuit AS cliente_cuit
      FROM nfu 
      LEFT JOIN clientes_nfu cn ON nfu.cliente_id = cn.id
      WHERE 1=1
    `;
    const queryParams = [];
    
    // Aplicar filtros
    if (filtros.fechaDesde && filtros.fechaDesde.trim() !== '') {
      query += ' AND nfu.fecha >= ?';
      queryParams.push(filtros.fechaDesde);
    }
    
    if (filtros.fechaHasta && filtros.fechaHasta.trim() !== '') {
      query += ' AND nfu.fecha <= ?';
      queryParams.push(filtros.fechaHasta);
    }
    
    if (filtros.categoria && filtros.categoria.trim() !== '') {
      query += ' AND nfu.categoria = ?';
      queryParams.push(filtros.categoria);
    }
    
    if (filtros.tipo && filtros.tipo.trim() !== '') {
      query += ' AND nfu.tipo = ?';
      queryParams.push(filtros.tipo);
    }
    
    // Ordenar por fecha descendente
    query += ' ORDER BY nfu.fecha DESC';
    
    // Agregar paginación directamente en la consulta (sin usar marcadores de posición)
    // En MySQL, no se puede usar marcadores de posición para LIMIT y OFFSET
    query += ` LIMIT ${lim} OFFSET ${off}`;
    
    // Ejecutar la consulta
    const registros = await db.query(query, queryParams);
    
    // Debug: verificar los primeros registros
    if (registros.length > 0) {
      console.log('🔍 Debug NFU - Primer registro:', JSON.stringify(registros[0], null, 2));
    }
    
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
    
    if (filtros.categoria && filtros.categoria.trim() !== '') {
      countQuery += ' AND categoria = ?';
      countParams.push(filtros.categoria);
    }
    
    if (filtros.tipo && filtros.tipo.trim() !== '') {
      countQuery += ' AND tipo = ?';
      countParams.push(filtros.tipo);
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

/**
 * Obtiene registros NFU con filtros (sin paginación, para exportar)
 * @param {Object} filtros - Filtros a aplicar (fechaDesde, fechaHasta, categoria, tipo)
 * @returns {Promise<Array>} - Registros
 */
const obtenerConFiltros = async (filtros = {}) => {
  try {
    // Construir consulta base con JOIN para traer el cliente
    let query = `
      SELECT 
        nfu.id, 
        nfu.fecha, 
        nfu.cantidad, 
        nfu.responsable,
        nfu.cliente_id,
        nfu.categoria,
        nfu.tipo,
        cn.empresa AS cliente_empresa,
        cn.cuit AS cliente_cuit
      FROM nfu 
      LEFT JOIN clientes_nfu cn ON nfu.cliente_id = cn.id
      WHERE 1=1
    `;
    const queryParams = [];
    
    // Aplicar filtros
    if (filtros.fechaDesde && filtros.fechaDesde.trim() !== '') {
      query += ' AND nfu.fecha >= ?';
      queryParams.push(filtros.fechaDesde);
    }
    
    if (filtros.fechaHasta && filtros.fechaHasta.trim() !== '') {
      query += ' AND nfu.fecha <= ?';
      queryParams.push(filtros.fechaHasta);
    }
    
    if (filtros.categoria && filtros.categoria.trim() !== '') {
      query += ' AND nfu.categoria = ?';
      queryParams.push(filtros.categoria);
    }
    
    if (filtros.tipo && filtros.tipo.trim() !== '') {
      query += ' AND nfu.tipo = ?';
      queryParams.push(filtros.tipo);
    }
    
    // Ordenar por fecha descendente
    query += ' ORDER BY nfu.fecha DESC';
    
    // Ejecutar la consulta sin paginación
    const registros = await db.query(query, queryParams);
    
    return registros;
  } catch (error) {
    console.error('Error al obtener registros NFU con filtros:', error);
    throw error;
  }
};

module.exports = {
  insertarNFU,
  obtenerTodosNFU,
  obtenerCantidadNFUPorFecha,
  obtenerCantidadNFUEntreFechas,
  obtenerCantidadNFUHastaFecha,
  obtenerRegistrosNFU,
  obtenerConFiltros
};