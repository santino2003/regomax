// repositories/bolsonRepository.js
// ------------------------------------------------------------
const db = require('../config/db');
const { formatMySQLLocal, parseLocalDate, ventanaTurnoDiario, ventanaMesOperativo } = require('../utils/fecha');

class BolsonRepository {
  async getUltimaFecha(){
    try {
      const result = await db.query('SELECT fecha FROM metadata');
      if (!result || result.length === 0) return null;
      return result[0].fecha;
    } catch (error) {
      console.error('Error al obtener la última fecha:', error);
      throw error;
    }
  }

  async setUltimaFecha(fecha){
    try {
      await db.query('UPDATE metadata SET fecha = ?', [fecha]);
      return true;
    } catch (error) {
      console.error('Error al actualizar metadata.fecha:', error);
      throw error;
    }
  }

  async getUltimoNumero() {
    try {
      const result = await db.query('SELECT numero FROM metadata');
      if (!result || result.length === 0) return null;
      return result[0].numero;
    } catch (error) {
      console.error('Error al obtener el último número:', error);
      throw error;
    }
  }

  async setUltimoNumero(numero) {
    try {
      await db.query('UPDATE metadata SET numero = ?', [numero]);
    } catch (error) {
      console.error('Error al actualizar el último número:', error);
      throw error;
    }
  }

  async crearBolson(codigo, producto, peso, precinto, fecha, hora, responsable) {
    try {
      await db.query(
        `INSERT INTO bolsones (codigo, producto, peso, precinto, fecha, hora, responsable) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [codigo, producto, peso, precinto, fecha, hora, responsable]
      );
      return true;
    } catch (error) {
      console.error('Error detallado al crear el bolson:', error);
      throw error;
    }
  }

  async obtenerTodos(page = 1, limit = 10, sortBy = 'id', sortOrder = 'DESC') {
    try {
      const lim = Number.isFinite(+limit) ? Math.max(1, +limit) : 10;
      const p = Number.isFinite(+page) ? Math.max(1, +page) : 1;
      const off = (p - 1) * lim;
      
      const allowedSortBy = new Set(['id', 'codigo', 'producto', 'peso', 'precinto', 'fecha', 'hora', 'responsable', 'despachado']);
      const allowedSortOrder = new Set(['ASC', 'DESC']);
      
      const safeSortBy = allowedSortBy.has(sortBy) ? sortBy : 'id';
      const safeSortOrder = allowedSortOrder.has((sortOrder || '').toUpperCase()) ? 
                      sortOrder.toUpperCase() : 'DESC';
      
      const query = `SELECT * FROM bolsones ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ${lim} OFFSET ${off}`;
      
      const result = await db.query(query);
      
      const countResult = await db.query('SELECT COUNT(*) as total FROM bolsones');
      const total = countResult[0]?.total ?? 0;
      
      return {
        data: result,
        pagination: {
          total,
          page: p,
          limit: lim,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error al obtener todos los bolsones:', error);
      throw error;
    }
  }

  async obtenerPorId(id) {
    try {
      const result = await db.query('SELECT * FROM bolsones WHERE id = ?', [id]);
      if (!result || result.length === 0) return null;
      return result[0];
    } catch (error) {
      console.error('Error al obtener bolson por ID:', error);
      throw error;
    }
  }

  async actualizarBolson(id ,producto, peso, precinto) {
    try {
      const result = await db.query(
        `UPDATE bolsones SET producto = ?, peso = ?, precinto = ? WHERE id = ?`,
        [producto, peso, precinto, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error al actualizar el bolson:', error);
      throw error;
    }
  }

  async eliminarBolson(id) {
    try {
      const result = await db.query('DELETE FROM bolsones WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error al eliminar el bolson:', error);
      throw error;
    }
  }

  async obtenerPorCodigo(codigo) {
    try {
      const result = await db.query('SELECT * FROM bolsones WHERE codigo = ?', [codigo]);
      if (!result || result.length === 0) return null;
      return result[0];
    } catch (error) {
      console.error('Error al obtener bolsón por código:', error);
      throw error;
    }
  }

  async marcarComoDespachadoPorCodigo(codigo) {
    try {
      await db.query('UPDATE bolsones SET despachado = 1 WHERE codigo = ?', [codigo]);
    } catch (error) {
      console.error('Error al marcar bolsón como despachado:', error);
      throw error;
    }
  }

  async obtenerNoDespachados(page = 1, limit = 10, sortBy = 'id', sortOrder = 'DESC', filtros = {}) {
    const lim = Number.isInteger(+limit) ? Math.max(1, +limit) : 10;
    const off = Number.isInteger(+page) ? Math.max(0, (+page - 1) * lim) : 0;
  
    const allowedSortBy = new Set(['id', 'codigo', 'producto', 'peso', 'precinto', 'fecha', 'hora', 'responsable', 'despachado']);
    const allowedSortOrder = new Set(['ASC', 'DESC']);
    const safeSortBy = allowedSortBy.has(sortBy) ? sortBy : 'id';
    const safeSortOrder = allowedSortOrder.has((sortOrder || '').toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
  
    const where = ['despachado = 0'];
    const filterParams = [];
  
    if (filtros.producto) { where.push('producto LIKE ?'); filterParams.push(`%${filtros.producto}%`); }
    if (filtros.codigo)   { where.push('codigo LIKE ?');   filterParams.push(`%${filtros.codigo}%`); }
    if (filtros.precinto) { where.push('precinto LIKE ?'); filterParams.push(`%${filtros.precinto}%`); }
  
    const whereClause = where.join(' AND ');
  
    const selectSql = `
      SELECT * FROM bolsones
      WHERE ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ${lim} OFFSET ${off}
    `;
    const result = await db.query(selectSql, filterParams);
  
    const countSql = `SELECT COUNT(*) AS total FROM bolsones WHERE ${whereClause}`;
    const countRes = await db.query(countSql, filterParams);
    const total = countRes[0]?.total ?? 0;
  
    return {
      data: result,
      pagination: {
        total,
        page,
        limit: lim,
        totalPages: Math.ceil(total / lim)
      }
    };
  }

  async obtenerBolsonesDespachados(page = 1, limit = 10, sortBy = 'id', sortOrder = 'DESC', filtros = {}) {
    const lim = Number.isFinite(+limit) ? Math.max(1, +limit) : 10;
    const p = Number.isFinite(+page) ? Math.max(1, +page) : 1;
    const off = (p - 1) * lim;
  
    const allowedSortBy = new Set(['id','codigo','producto','peso','precinto','fecha','hora','responsable','despachado','parte_diario_id']);
    const allowedSortOrder = new Set(['ASC','DESC']);
    const safeSortBy = allowedSortBy.has(sortBy) ? sortBy : 'id';
    const safeSortOrder = allowedSortOrder.has((sortOrder || '').toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
  
    const where = ['despachado = 1'];
    const filterParams = [];
  
    if (filtros.producto) { where.push('CAST(producto AS CHAR) LIKE ?'); filterParams.push(`%${filtros.producto}%`); }
    if (filtros.codigo)   { where.push('codigo LIKE ?');   filterParams.push(`%${filtros.codigo}%`); }
    if (filtros.precinto) { where.push('precinto LIKE ?'); filterParams.push(`%${filtros.precinto}%`); }
  
    const whereClause = where.join(' AND ');
  
    const selectSql = `
      SELECT *
      FROM bolsones
      WHERE ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ${lim} OFFSET ${off}
    `;
    console.log('[DESPACHADOS] SQL:', selectSql);
  
    const rows = await db.query(selectSql, filterParams);
  
    const countSql = `SELECT COUNT(*) AS total FROM bolsones WHERE ${whereClause}`;
    const countRes = await db.query(countSql, filterParams);
    const total = countRes[0]?.total ?? 0;
  
    return {
      data: rows,
      pagination: {
        total,
        page: p,
        limit: lim,
        totalPages: Math.ceil(total / lim),
      },
    };
  }

  async obtenerBolsonesDisponibles() {
    try {
      const result = await db.query(`
        SELECT 
            b.id, 
            b.codigo, 
            b.producto, 
            b.peso, 
            b.precinto, 
            b.fecha, 
            b.hora, 
            b.responsable,
            p.nombre AS nombreProducto
        FROM 
            bolsones b
        LEFT JOIN 
            productos p ON b.producto = p.id
        WHERE 
            b.despachado = 0
        ORDER BY 
            b.fecha DESC, b.id DESC
      `);
      return result;
    } catch (error) {
      console.error('Error en repositorio al obtener bolsones disponibles:', error);
      throw error;
    }
  }

  async obtenerBolsonesNoAsociados() {
    try {
      const result = await db.query(`
        SELECT 
            b.id, 
            b.codigo, 
            b.producto, 
            b.peso, 
            b.precinto, 
            b.fecha, 
            b.hora, 
            b.responsable,
            p.nombre AS nombreProducto
        FROM 
            bolsones b
        LEFT JOIN 
            productos p ON b.producto = p.id
        WHERE 
            (b.asociado_a_parte = 0 OR b.asociado_a_parte IS NULL)
            AND b.parte_diario_id IS NULL
        ORDER BY 
            b.fecha ASC, b.id ASC
      `);
      return result;
    } catch (error) {
      console.error('Error en repositorio al obtener bolsones no asociados:', error);
      throw error;
    }
  }
  
  // *** PRODUCCIÓN DEL DÍA (VENTANA 06:00 -> 05:59:59.999)
  async obtenerTodosBolsonesPorFecha(fecha /* 'YYYY-MM-DD' */){
    try {
      const { inicio, fin } = ventanaTurnoDiario(fecha);
      const iniStr = formatMySQLLocal(inicio);
      const finStr = formatMySQLLocal(fin);


      const result = await db.query(`
        SELECT b.*, p.nombre AS nombreProducto
        FROM bolsones b
        LEFT JOIN productos p ON b.producto = p.id
        WHERE CONCAT(b.fecha, ' ', b.hora) BETWEEN ? AND ?
        ORDER BY b.fecha ASC, b.hora ASC, b.id ASC
      `, [iniStr, finStr]);

      return result;
    } catch (error) {
      console.error('Error al obtener bolsones por fecha (turno):', error);
      throw error;
    }
  }

 // *** HISTÓRICO HASTA FECHA (exclusive a partir de 06:00 del día siguiente)
async obtenerBolsonesHastaFecha(fecha /* 'YYYY-MM-DD' */) {
  try {
    const { fin } = ventanaTurnoDiario(fecha);
    const finStr = formatMySQLLocal(fin);

    const result = await db.query(`
      SELECT b.*, p.nombre AS nombreProducto
      FROM bolsones b
      LEFT JOIN productos p ON b.producto = p.id
      LEFT JOIN despachos_detalle dd ON dd.bolson_codigo = b.codigo
      LEFT JOIN despachos d ON d.id = dd.despacho_id
      WHERE CONCAT(b.fecha, ' ', b.hora) <= ?
        AND (b.despachado = 0 OR d.fecha > ? OR d.id IS NULL)
      ORDER BY b.fecha ASC, b.hora ASC, b.id ASC
    `, [finStr, finStr]);

    return result;
  } catch (err) {
    console.error("[ERROR obtenerBolsonesHastaFecha]", err);
    throw err;
  }
}

  // *** STOCK DEL MES (producidos en el mes operativo)
  async obtenerStockDelMes(fecha /* 'YYYY-MM-DD' */) {
    try {
      const { inicio, _ } = ventanaMesOperativo(fecha);   // inicio del mes operativo
      const { inicioDia, fin } = ventanaTurnoDiario(fecha); // fin del día de la fecha solicitada
  
      const iniStr = formatMySQLLocal(inicio);
      const finStr = formatMySQLLocal(fin);
      if (!iniStr || !finStr) {
        throw new Error('Fechas de inicio o fin inválidas para consulta de stock del mes');
      }
  
   
  
      const result = await db.query(`
        SELECT 
          b.*,
          p.nombre AS nombreProducto,
          b.producto AS producto_id_real,
          COALESCE(p.nombre, CONCAT('Producto ID ', b.producto)) AS producto_nombre_real
        FROM 
          bolsones b
        LEFT JOIN 
          productos p ON b.producto = p.id
        WHERE 
          CONCAT(b.fecha, ' ', b.hora) BETWEEN ? AND ?
        ORDER BY b.fecha ASC, b.hora ASC, b.id ASC
      `, [iniStr, finStr]);
  
      
  
      return result;
    } catch (error) {
      console.error('Error al obtener stock del mes (operativo):', error);
      throw error;
    }
  }
    
  // *** DESPACHADOS DEL MES (en el mes operativo, con despachado=1)
  async obtenerDespachadosDelMes(fecha /* 'YYYY-MM-DD' */){
    try {
      const { inicio, fin } = ventanaMesOperativo(fecha);
      const iniStr = formatMySQLLocal(inicio);
      const finStr = formatMySQLLocal(fin);

      const result = await db.query(`
        SELECT b.*, p.nombre AS nombreProducto
        FROM bolsones b
        LEFT JOIN productos p ON b.producto = p.id
        WHERE b.despachado = 1
          AND CONCAT(b.fecha, ' ', b.hora) >= ?
          AND CONCAT(b.fecha, ' ', b.hora) <= ?
        ORDER BY b.fecha ASC, b.hora ASC, b.id ASC
      `, [iniStr, finStr]);

      return result;
    } catch (error) {
      console.error('Error al obtener despachados del mes (operativo):', error);
      throw error;
    }
  }

  async obtenerBolsonesPorMes(fecha) {
    try {
      const { inicio, fin } = ventanaMesOperativo(fecha);
      const iniStr = formatMySQLLocal(inicio);
      const finStr = formatMySQLLocal(fin);
      
      console.log(`Consultando bolsones del mes desde ${iniStr} hasta ${finStr}`);
      
      const result = await db.query(`
        SELECT b.*, p.nombre AS nombreProducto
        FROM bolsones b
        LEFT JOIN productos p ON b.producto = p.id
        WHERE CONCAT(b.fecha, ' ', b.hora) BETWEEN ? AND ?
        ORDER BY b.fecha ASC, b.hora ASC, b.id ASC
      `, [iniStr, finStr]);
      
      return result;
    } catch (error) {
      console.error('Error al obtener bolsones por mes:', error);
      throw error;
    }
  }

  // Obtener bolsones producidos entre dos fechas específicas para calcular acumulados históricos
  async obtenerBolsonesEntreFechas(fechaInicio, fechaFin) {
    try {
      
      
      const result = await db.query(`
        SELECT b.*, p.nombre AS nombreProducto
        FROM bolsones b
        LEFT JOIN productos p ON b.producto = p.id
        WHERE CONCAT(b.fecha, ' ', b.hora) BETWEEN ? AND ?
        ORDER BY b.fecha ASC, b.hora ASC, b.id ASC
      `, [fechaInicio, fechaFin]);
      
     
      return result;
    } catch (error) {
      console.error('Error al obtener bolsones entre fechas:', error);
      throw error;
    }
  }
}

module.exports = new BolsonRepository();
