const db = require('../config/db');

class AjusteInventarioRepository {
    /**
     * Registrar ajuste de inventario
     * @param {Object} ajusteData - Datos del ajuste
     * @returns {Object} Resultado de la inserción
     */
    async registrarAjuste(ajusteData) {
        try {
            const result = await db.query(`
                INSERT INTO movimientos_stock (
                    tipo_movimiento,
                    tipo_item,
                    item_id,
                    codigo,
                    nombre,
                    cantidad,
                    stock_anterior,
                    stock_nuevo,
                    almacen_id,
                    precio_unitario,
                    cliente,
                    responsable,
                    usuario_sistema,
                    fecha_movimiento,
                    observaciones
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                ajusteData.tipo_movimiento,
                ajusteData.tipo_item,
                ajusteData.item_id,
                ajusteData.codigo,
                ajusteData.nombre,
                ajusteData.cantidad,
                ajusteData.stock_anterior,
                ajusteData.stock_nuevo,
                ajusteData.almacen_id || null,
                ajusteData.precio_unitario || null,
                ajusteData.cliente || null,
                ajusteData.responsable,
                ajusteData.usuario_sistema,
                ajusteData.fecha || new Date(),
                ajusteData.observaciones || null
            ]);

            return { id: result.insertId };
        } catch (error) {
            console.error('Error al registrar ajuste de inventario:', error);
            throw error;
        }
    }

    /**
     * Obtener historial de movimientos con paginación
     * @param {number} page - Página actual
     * @param {number} limit - Registros por página
     * @param {Object} filtros - Filtros opcionales
     * @returns {Object} Movimientos y paginación
     */
    async obtenerMovimientos(page = 1, limit = 20, filtros = {}) {
        try {
            let whereConditions = [];
            let params = [];

            // Aplicar filtros
            if (filtros.tipo_movimiento) {
                whereConditions.push('m.tipo_movimiento = ?');
                params.push(filtros.tipo_movimiento);
            }
            if (filtros.fecha_desde) {
                whereConditions.push('DATE(m.fecha_movimiento) >= ?');
                params.push(filtros.fecha_desde);
            }
            if (filtros.fecha_hasta) {
                whereConditions.push('DATE(m.fecha_movimiento) <= ?');
                params.push(filtros.fecha_hasta);
            }
            if (filtros.bien_id) {
                whereConditions.push('m.item_id = ?');
                params.push(filtros.bien_id);
            }

            const whereClause = whereConditions.length > 0 
                ? 'WHERE ' + whereConditions.join(' AND ')
                : '';

            // Contar total de registros
            const countQuery = `SELECT COUNT(*) as total FROM movimientos_stock m ${whereClause}`;
            const countResult = await db.query(countQuery, params);
            const totalRegistros = countResult[0].total;

            // Obtener registros paginados
            const offset = (page - 1) * limit;
            const query = `
                SELECT 
                    m.*,
                    a.nombre as almacen_nombre
                FROM movimientos_stock m
                LEFT JOIN almacenes a ON m.almacen_id = a.id
                ${whereClause}
                ORDER BY m.fecha_movimiento DESC, m.id DESC
                LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
            `;

            const movimientos = await db.query(query, params);

            return {
                success: true,
                data: {
                    movimientos,
                    paginacion: {
                        paginaActual: parseInt(page),
                        registrosPorPagina: parseInt(limit),
                        totalRegistros,
                        totalPaginas: Math.ceil(totalRegistros / limit)
                    }
                }
            };
        } catch (error) {
            console.error('Error al obtener movimientos:', error);
            throw error;
        }
    }
}

module.exports = new AjusteInventarioRepository();
