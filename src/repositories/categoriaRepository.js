const db = require('../config/db');

class CategoriaRepository {
    async crearCategoria(nombre, responsable) {
        try {
            await db.query(
                `INSERT INTO categorias (nombre, responsable) VALUES (?, ?)`,
                [nombre, responsable]
            );
            return true;
        } catch (error) {
            console.error('Error en CategoriaRepository.crearCategoria:', error);
            throw error;
        }
    }
    
    async modificarCategoria(id, nombre) {
        try {
            await db.query(
                `UPDATE categorias SET nombre = ? WHERE id = ?`,
                [nombre, id]
            );
            return true;
        } catch (error) {
            console.error('Error en CategoriaRepository.modificarCategoria:', error);
            throw error;
        }
    }

    async eliminarCategoria(id) {
        try {
            await db.query(
                `DELETE FROM categorias WHERE id = ?`,
                [id]
            );
            return true;
        } catch (error) {
            console.error('Error en CategoriaRepository.eliminarCategoria:', error);
            throw error;
        }
    }

    async obtenerTodas(page = 1, limit = 10) {
        try {
            // Contar total de registros
            const countResult = await db.query('SELECT COUNT(*) as total FROM categorias');
            const totalRegistros = countResult[0].total;
            
            // Obtener registros paginados
            const offset = (page - 1) * limit;
            const result = await db.query(
                `SELECT * FROM categorias ORDER BY nombre ASC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`
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
            console.error('Error en CategoriaRepository.obtenerTodas:', error);
            throw error;
        }
    }

    async obtenerPorId(id) {
        try {
            const result = await db.query('SELECT * FROM categorias WHERE id = ?', [id]);
            return result[0] || null;
        } catch (error) {
            console.error('Error al obtener categoria por ID:', error);
            throw error;
        }
    }
}

module.exports = new CategoriaRepository();
