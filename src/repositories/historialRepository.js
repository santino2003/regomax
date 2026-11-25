const db = require('../config/db');
const { parsearDetalles } = require('../utils/historial');
const { formatMySQLLocal, fechaActual } = require('../utils/fecha');

function patron(texto) {
    return `%${String(texto).trim().replace(/[!%_]/g, '!$&')}%`;
}

class HistorialRepository {
    async obtenerOpciones() {
        const filas = await db.query('SELECT DISTINCT accion, entidad FROM historial_acciones');
        return {
            acciones: [...new Set(filas.map(f => f.accion).filter(Boolean))].sort(),
            entidades: [...new Set(filas.map(f => f.entidad).filter(Boolean))].sort()
        };
    }

    /**
     * Registra una acción en el historial
     * @param {string} usuario - Nombre de usuario que realizó la acción
     * @param {string} accion - Tipo de acción (crear, editar, eliminar, etc.)
     * @param {string} entidad - Entidad afectada (bolson, orden, parte_diario, etc.)
     * @param {Object} detalles - Detalles adicionales de la acción (opcional)
     * @param {Date} fechaHora - Fecha y hora de la acción (opcional, por defecto es la hora actual)
     */
    async registrarAccion(usuario, accion, entidad, detalles = null, fechaHora = fechaActual()) {
        try {
            const query = `
                INSERT INTO historial_acciones 
                (usuario, accion, entidad, detalles, fecha_hora)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const detallesStr = detalles ? JSON.stringify(detalles) : null;
            
            // Convertir fecha a formato MySQL
            const fechaHoraStr = formatMySQLLocal(fechaHora);
            console.log('Guardando fecha en historial:', fechaHoraStr);
            
            await db.query(query, [
                usuario, 
                accion, 
                entidad,
                detallesStr, 
                fechaHoraStr
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
            const lim = Number.isFinite(+limit) ? Math.min(10000, Math.max(1, Math.trunc(+limit))) : 50;
            const p = Number.isFinite(+page) ? Math.max(1, Math.trunc(+page)) : 1;
            const off = (p - 1) * lim;
            
            // Construir consulta base
            let query = `
                SELECT h.id, h.usuario, h.accion, h.entidad, h.detalles, h.fecha_hora,
                    b.nombre AS bien_nombre, b.codigo AS bien_codigo
                FROM historial_acciones h
                LEFT JOIN bienes b ON b.id = JSON_UNQUOTE(JSON_EXTRACT(
                    CASE WHEN JSON_VALID(h.detalles) THEN h.detalles ELSE '{}' END, '$.bien_id'))
                WHERE 1=1
            `;
            
            // Condiciones para filtros
            const condiciones = [];
            const parametros = [];
            
            if (filtros.usuario) {
                condiciones.push("h.usuario LIKE ? ESCAPE '!'");
                parametros.push(patron(filtros.usuario));
            }
            
            if (filtros.accion) {
                condiciones.push('h.accion = ?');
                parametros.push(filtros.accion);
            }
            
            if (filtros.entidad) {
                condiciones.push('h.entidad = ?');
                parametros.push(filtros.entidad);
            }
            
            if (filtros.fechaDesde) {
                condiciones.push('h.fecha_hora >= ?');
                parametros.push(filtros.fechaDesde);
            }
            
            if (filtros.fechaHasta) {
                condiciones.push('h.fecha_hora < DATE_ADD(?, INTERVAL 1 DAY)');
                parametros.push(filtros.fechaHasta);
            }
            
            if (filtros.buscar) {
                // Cada palabra debe aparecer en alguno de los datos del registro.
                for (const palabra of String(filtros.buscar).trim().split(/\s+/).filter(Boolean).slice(0, 10)) {
                    condiciones.push(`(CAST(h.id AS CHAR) LIKE ? ESCAPE '!' OR h.usuario LIKE ? ESCAPE '!'
                        OR h.accion LIKE ? ESCAPE '!' OR h.entidad LIKE ? ESCAPE '!'
                        OR h.detalles LIKE ? ESCAPE '!' OR b.nombre LIKE ? ESCAPE '!' OR b.codigo LIKE ? ESCAPE '!')`);
                    parametros.push(...Array(7).fill(patron(palabra)));
                }
            }

            // Agregar condiciones a la consulta
            let whereClause = '';
            if (condiciones.length > 0) {
                whereClause = ' AND ' + condiciones.join(' AND ');
                query += whereClause;
            }
            
            // Agregar ordenación y paginación - NO usar placeholders para LIMIT/OFFSET
            query += ` ORDER BY h.fecha_hora DESC, h.id DESC LIMIT ${lim} OFFSET ${off}`;
            
            // Debug temporal
            // console.log('[HISTORIAL] SQL:', query);
            // console.log('[HISTORIAL] params(len)=', parametros.length, parametros);
            
            const result = await db.query(query, parametros);
            
            // Consulta para contar el total con los mismos filtros
            let countQuery = `
                SELECT COUNT(*) as total FROM historial_acciones h
                LEFT JOIN bienes b ON b.id = JSON_UNQUOTE(JSON_EXTRACT(
                    CASE WHEN JSON_VALID(h.detalles) THEN h.detalles ELSE '{}' END, '$.bien_id'))
                WHERE 1=1
            `;
            
            if (condiciones.length > 0) {
                countQuery += whereClause;
            }
            
            const countResult = await db.query(countQuery, parametros);
            const total = countResult[0]?.total ?? 0;
            
            return {
                data: result.map(item => ({
                    ...item,
                    detalles: parsearDetalles(item.detalles)
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