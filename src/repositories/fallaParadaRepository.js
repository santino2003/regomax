const db = require('../config/db');

class FallaParadaRepository {
    async crear(data) {
        const result = await db.query(
            `INSERT INTO fallas_paradas
                (fecha, hora, minutos_afectados, maquina, falla_id, descripcion, tipo_parada, observaciones, responsable)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.fecha,
                data.hora,
                data.minutos_afectados,
                data.maquina,
                data.falla_id,
                data.descripcion,
                data.tipo_parada,
                data.observaciones,
                data.responsable
            ]
        );
        return result.insertId;
    }

    async modificar(id, data) {
        await db.query(
            `UPDATE fallas_paradas
             SET fecha = ?, hora = ?, minutos_afectados = ?, maquina = ?, falla_id = ?,
                 descripcion = ?, tipo_parada = ?, observaciones = ?
             WHERE id = ?`,
            [
                data.fecha,
                data.hora,
                data.minutos_afectados,
                data.maquina,
                data.falla_id,
                data.descripcion,
                data.tipo_parada,
                data.observaciones,
                id
            ]
        );
        return true;
    }

    construirFiltros(filtros = {}) {
        const condiciones = [];
        const parametros = [];

        if (filtros.fecha_desde) {
            condiciones.push('fp.fecha >= ?');
            parametros.push(filtros.fecha_desde);
        }
        if (filtros.fecha_hasta) {
            condiciones.push('fp.fecha <= ?');
            parametros.push(filtros.fecha_hasta);
        }
        if (filtros.maquina) {
            condiciones.push('fp.maquina = ?');
            parametros.push(filtros.maquina);
        }
        if (filtros.falla_id) {
            condiciones.push('fp.falla_id = ?');
            parametros.push(filtros.falla_id);
        }
        if (filtros.tipo_parada) {
            condiciones.push('fp.tipo_parada = ?');
            parametros.push(filtros.tipo_parada);
        }

        return {
            where: condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '',
            parametros
        };
    }

    async obtenerTodos(page = 1, limit = 50, filtros = {}) {
        const { where, parametros } = this.construirFiltros(filtros);
        const safeLimit = Math.max(1, parseInt(limit, 10) || 50);
        const safePage = Math.max(1, parseInt(page, 10) || 1);
        const offset = (safePage - 1) * safeLimit;

        const countResult = await db.query(
            `SELECT COUNT(*) AS total FROM fallas_paradas fp ${where}`,
            parametros
        );
        const data = await db.query(
            `SELECT fp.*, f.nombre AS falla_nombre
             FROM fallas_paradas fp
             INNER JOIN fallas f ON f.id = fp.falla_id
             ${where}
             ORDER BY fp.fecha DESC, fp.hora DESC, fp.id DESC
             LIMIT ${safeLimit} OFFSET ${offset}`,
            parametros
        );

        const total = countResult[0].total;
        return {
            data,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit)
            }
        };
    }

    async obtenerPorId(id) {
        const result = await db.query(
            `SELECT fp.*, f.nombre AS falla_nombre
             FROM fallas_paradas fp
             INNER JOIN fallas f ON f.id = fp.falla_id
             WHERE fp.id = ?`,
            [id]
        );
        return result[0] || null;
    }

    async obtenerPorIds(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return [];
        const placeholders = ids.map(() => '?').join(', ');
        return db.query(
            `SELECT fp.*, f.nombre AS falla_nombre
             FROM fallas_paradas fp
             INNER JOIN fallas f ON f.id = fp.falla_id
             WHERE fp.id IN (${placeholders})
             ORDER BY fp.fecha DESC, fp.hora DESC, fp.id DESC`,
            ids
        );
    }
}

module.exports = new FallaParadaRepository();
