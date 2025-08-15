const db = require('../config/db');

class HistorialRepository {
    /**
     * Registra una acción en el historial
     * @param {string} usuario - Nombre de usuario que realizó la acción
     * @param {string} accion - Tipo de acción (crear, editar, eliminar, etc.)
     * @param {string} entidad - Entidad afectada (bolson, orden, parte_diario, etc.)
     * @param {Object} detalles - Detalles adicionales de la acción (opcional)
     * @param {Date} fechaHora - Fecha y hora de la acción (opcional, por defecto es la hora actual)
     */
    async registrarAccion(usuario, accion, entidad, detalles = null, fechaHora = new Date()) {
        try {
            const query = `
                INSERT INTO historial_acciones 
                (usuario, accion, entidad, detalles, fecha_hora)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const detallesStr = detalles ? JSON.stringify(detalles) : null;
            
            // Formatear la fecha para MySQL (YYYY-MM-DD HH:MM:SS)
            const fechaFormateada = fechaHora.toISOString().slice(0, 19).replace('T', ' ');
            
            await db.query(query, [
                usuario, 
                accion, 
                entidad,
                detallesStr, 
                fechaFormateada
            ]);
            
            return true;
        } catch (error) {
            console.error('Error al registrar acción en historial:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene el historial de acciones con filtros y paginación
     */
    async obtenerHistorial(page = 1, limit = 50, filtros = {}) {
        try {
            const offset = (page - 1) * limit;
            
            // Construir consulta base
            let query = `
                SELECT id, usuario, accion, entidad, detalles, fecha_hora
                FROM historial_acciones
                WHERE 1=1
            `;
            
            // Condiciones para filtros
            const condiciones = [];
            const parametros = [];
            
            if (filtros.usuario) {
                condiciones.push('usuario = ?');
                parametros.push(filtros.usuario);
            }
            
            if (filtros.accion) {
                condiciones.push('accion = ?');
                parametros.push(filtros.accion);
            }
            
            if (filtros.entidad) {
                condiciones.push('entidad = ?');
                parametros.push(filtros.entidad);
            }
            
            if (filtros.fechaDesde) {
                condiciones.push('fecha_hora >= ?');
                parametros.push(filtros.fechaDesde);
            }
            
            if (filtros.fechaHasta) {
                condiciones.push('fecha_hora <= ?');
                parametros.push(filtros.fechaHasta);
            }
            
            // Agregar condiciones a la consulta
            if (condiciones.length > 0) {
                query += ' AND ' + condiciones.join(' AND ');
            }
            
            // Agregar ordenación y paginación
            query += ' ORDER BY fecha_hora DESC LIMIT ? OFFSET ?';
            parametros.push(limit, offset);
            
            const result = await db.query(query, parametros);
            
            // Consulta para contar el total con los mismos filtros
            let countQuery = `
                SELECT COUNT(*) as total FROM historial_acciones WHERE 1=1
            `;
            
            if (condiciones.length > 0) {
                countQuery += ' AND ' + condiciones.join(' AND ');
            }
            
            const countResult = await db.query(countQuery, parametros.slice(0, -2)); // Eliminar limit y offset
            
            return {
                data: result.map(item => ({
                    ...item,
                    detalles: item.detalles ? JSON.parse(item.detalles) : null
                })),
                pagination: {
                    total: countResult[0].total,
                    page,
                    limit,
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            };
        } catch (error) {
            console.error('Error al obtener historial de acciones:', error);
            throw error;
        }
    }
}

module.exports = new HistorialRepository();