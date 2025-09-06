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
            
            // Formatear la fecha para MySQL (YYYY-MM-DD HH:MM:SS) usando zona horaria local
            const year = fechaHora.getFullYear();
            const month = String(fechaHora.getMonth() + 1).padStart(2, '0');
            const day = String(fechaHora.getDate()).padStart(2, '0');
            const hours = String(fechaHora.getHours()).padStart(2, '0');
            const minutes = String(fechaHora.getMinutes()).padStart(2, '0');
            const seconds = String(fechaHora.getSeconds()).padStart(2, '0');
            
            const fechaFormateada = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            console.log('Guardando fecha en historial:', fechaFormateada);
            
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
            // Validación segura de números para paginación
            const lim = Number.isFinite(+limit) ? Math.max(1, +limit) : 50;
            const p = Number.isFinite(+page) ? Math.max(1, +page) : 1;
            const off = (p - 1) * lim;
            
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
            let whereClause = '';
            if (condiciones.length > 0) {
                whereClause = ' AND ' + condiciones.join(' AND ');
                query += whereClause;
            }
            
            // Agregar ordenación y paginación - NO usar placeholders para LIMIT/OFFSET
            query += ` ORDER BY fecha_hora DESC LIMIT ${lim} OFFSET ${off}`;
            
            // Debug temporal
            // console.log('[HISTORIAL] SQL:', query);
            console.log('[HISTORIAL] params(len)=', parametros.length, parametros);
            
            const result = await db.query(query, parametros);
            
            // Consulta para contar el total con los mismos filtros
            let countQuery = `
                SELECT COUNT(*) as total FROM historial_acciones WHERE 1=1
            `;
            
            if (condiciones.length > 0) {
                countQuery += whereClause;
            }
            
            const countResult = await db.query(countQuery, parametros);
            const total = countResult[0]?.total ?? 0;
            
            return {
                data: result.map(item => ({
                    ...item,
                    detalles: item.detalles ? JSON.parse(item.detalles) : null
                })),
                pagination: {
                    total,
                    page: p,
                    limit: lim,
                    totalPages: Math.ceil(total / lim)
                }
            };
        } catch (error) {
            console.error('Error al obtener historial de acciones:', error);
            throw error;
        }
    }
}

module.exports = new HistorialRepository();