const db = require('../config/db');

class AlmacenRepository {
    async crearAlmacen(nombre, responsable) {
        try {
            await db.query(
                `INSERT INTO almacenes (nombre, responsable) VALUES (?, ?)`,
                [nombre, responsable]
            );
            return true;
        } catch (error) {
            console.error('Error en AlmacenRepository.crearAlmacen:', error);
            throw error;
        }
    }
    
    async modificarAlmacen(id, nombre) {
        try {
            await db.query(
                `UPDATE almacenes SET nombre = ? WHERE id = ?`,
                [nombre, id]
            );
            return true;
        } catch (error) {
            console.error('Error en AlmacenRepository.modificarAlmacen:', error);
            throw error;
        }
    }

    async eliminarAlmacen(id) {
        try {
            await db.query(
                `DELETE FROM almacenes WHERE id = ?`,
                [id]
            );
            return true;
        } catch (error) {
            console.error('Error en AlmacenRepository.eliminarAlmacen:', error);
            throw error;
        }
    }

    async obtenerTodos(page = 1, limit = 10) {
        try {
            // Contar total de registros
            const countResult = await db.query('SELECT COUNT(*) as total FROM almacenes');
            const totalRegistros = countResult[0].total;
            
            // Obtener registros paginados
            const offset = (page - 1) * limit;
            const result = await db.query(
                `SELECT * FROM almacenes ORDER BY nombre ASC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`
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
            console.error('Error en AlmacenRepository.obtenerTodos:', error);
            throw error;
        }
    }

    async obtenerPorId(id) {
        try {
            const result = await db.query('SELECT * FROM almacenes WHERE id = ?', [id]);
            return result[0] || null;
        } catch (error) {
            console.error('Error al obtener almacen por ID:', error);
            throw error;
        }
    }
}

module.exports = new AlmacenRepository();
