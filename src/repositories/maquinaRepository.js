const db = require('../config/db');

class MaquinaRepository {
    async crear(nombre, descripcion, responsable) {
        await db.query(
            'INSERT INTO maquinas (nombre, descripcion, responsable) VALUES (?, ?, ?)',
            [nombre, descripcion, responsable]
        );
        return true;
    }

    async modificar(id, nombre, descripcion) {
        await db.query(
            'UPDATE maquinas SET nombre = ?, descripcion = ? WHERE id = ?',
            [nombre, descripcion, id]
        );
        return true;
    }

    async eliminar(id) {
        await db.query('DELETE FROM maquinas WHERE id = ?', [id]);
        return true;
    }

    async obtenerTodas(page = 1, limit = 10, filtros = {}) {
        const nombre = String(filtros.nombre || '').trim();
        const whereClause = nombre ? 'WHERE nombre LIKE ?' : '';
        const params = nombre ? [`%${nombre}%`] : [];
        const countResult = await db.query(
            `SELECT COUNT(*) as total FROM maquinas ${whereClause}`,
            params
        );
        const totalRegistros = countResult[0].total;
        const offset = (page - 1) * limit;

        const result = await db.query(
            `SELECT * FROM maquinas ${whereClause} ORDER BY nombre ASC LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}`,
            params
        );

        return {
            data: result,
            pagination: {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                total: totalRegistros,
                totalPages: Math.ceil(totalRegistros / limit)
            }
        };
    }

    async obtenerTodasSinPaginacion() {
        return db.query('SELECT id, nombre FROM maquinas ORDER BY nombre ASC');
    }

    async obtenerPorId(id) {
        const result = await db.query('SELECT * FROM maquinas WHERE id = ?', [id]);
        return result[0] || null;
    }
}

module.exports = new MaquinaRepository();
