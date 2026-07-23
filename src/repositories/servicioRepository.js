const db = require('../config/db');

class ServicioRepository {
    async crearServicio(nombre, responsable) {
        try {
            await db.query(
                `INSERT INTO servicios (nombre, responsable) VALUES (?, ?)`,
                [nombre, responsable]
            );
            return true;
        } catch (error) {
            console.error('Error en ServicioRepository.crearServicio:', error);
            throw error;
        }
    }
    
    async modificarServicio(id, nombre) {
        try {
            await db.query(
                `UPDATE servicios SET nombre = ? WHERE id = ?`,
                [nombre, id]
            );
            return true;
        } catch (error) {
            console.error('Error en ServicioRepository.modificarServicio:', error);
            throw error;
        }
    }

    async eliminarServicio(id) {
        try {
            await db.query(
                `DELETE FROM servicios WHERE id = ?`,
                [id]
            );
            return true;
        } catch (error) {
            console.error('Error en ServicioRepository.eliminarServicio:', error);
            throw error;
        }
    }

    async obtenerTodas(page = 1, limit = 10) {
        try {
            // Contar total de registros
            const countResult = await db.query('SELECT COUNT(*) as total FROM servicios');
            const totalRegistros = countResult[0].total;
            
            // Obtener registros paginados
            const offset = (page - 1) * limit;
            const result = await db.query(
                `SELECT * FROM servicios ORDER BY nombre ASC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`
            );
            
            return {
                data: result,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalRegistros,
                    totalPages: Math.ceil(totalRegistros / limit)
                }
            };
        } catch (error) {
            console.error('Error en ServicioRepository.obtenerTodas:', error);
            throw error;
        }
    }

    async obtenerPorId(id) {
        try {
            const result = await db.query('SELECT * FROM servicios WHERE id = ?', [id]);
            return result[0] || null;
        } catch (error) {
            console.error('Error al obtener servicio por ID:', error);
            throw error;
        }
    }
}

module.exports = new ServicioRepository();