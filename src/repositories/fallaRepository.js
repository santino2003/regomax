const db = require('../config/db');

class FallaRepository {
    async crear(nombre, responsable) {
        const result = await db.query(
            'INSERT INTO fallas (nombre, responsable) VALUES (?, ?)',
            [nombre, responsable]
        );
        return result.insertId;
    }

    async modificar(id, nombre) {
        await db.query('UPDATE fallas SET nombre = ? WHERE id = ?', [nombre, id]);
        return true;
    }

    async eliminar(id) {
        await db.query('DELETE FROM fallas WHERE id = ?', [id]);
        return true;
    }

    async obtenerTodas(page = 1, limit = 10) {
        const countResult = await db.query('SELECT COUNT(*) AS total FROM fallas');
        const totalRegistros = countResult[0].total;
        const offset = (page - 1) * limit;
        const safeLimit = parseInt(limit, 10);
        const safeOffset = parseInt(offset, 10);
        const result = await db.query(
            `SELECT * FROM fallas ORDER BY nombre ASC LIMIT ${safeLimit} OFFSET ${safeOffset}`
        );

        return {
            data: result,
            pagination: {
                page: parseInt(page, 10),
                limit: safeLimit,
                total: totalRegistros,
                totalPages: Math.ceil(totalRegistros / safeLimit)
            }
        };
    }

    async obtenerTodasSinPaginacion() {
        return db.query('SELECT id, nombre FROM fallas ORDER BY nombre ASC');
    }

    async obtenerPorId(id) {
        const result = await db.query('SELECT * FROM fallas WHERE id = ?', [id]);
        return result[0] || null;
    }
}

module.exports = new FallaRepository();
