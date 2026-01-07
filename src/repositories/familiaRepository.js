const db = require('../config/db');

class FamiliaRepository {
    async crearFamilia(nombre, responsable) {
        try {
            await db.query(
                `INSERT INTO familias (nombre, responsable) VALUES (?, ?)`,
                [nombre, responsable]
            );
            return true;
        } catch (error) {
            console.error('Error en FamiliaRepository.crearFamilia:', error);
            throw error;
        }
    }
    
    async modificarFamilia(id, nombre) {
        try {
            await db.query(
                `UPDATE familias SET nombre = ? WHERE id = ?`,
                [nombre, id]
            );
            return true;
        } catch (error) {
            console.error('Error en FamiliaRepository.modificarFamilia:', error);
            throw error;
        }
    }

    async eliminarFamilia(id) {
        try {
            await db.query(
                `DELETE FROM familias WHERE id = ?`,
                [id]
            );
            return true;
        } catch (error) {
            console.error('Error en FamiliaRepository.eliminarFamilia:', error);
            throw error;
        }
    }

    async obtenerTodas(page = 1, limit = 10) {
        try {
            // Contar total de registros
            const countResult = await db.query('SELECT COUNT(*) as total FROM familias');
            const totalRegistros = countResult[0].total;
            
            // Obtener registros paginados
            const offset = (page - 1) * limit;
            const result = await db.query(
                `SELECT * FROM familias ORDER BY nombre ASC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`
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
            console.error('Error en FamiliaRepository.obtenerTodas:', error);
            throw error;
        }
    }

    async obtenerPorId(id) {
        try {
            const result = await db.query('SELECT * FROM familias WHERE id = ?', [id]);
            return result[0] || null;
        } catch (error) {
            console.error('Error al obtener familia por ID:', error);
            throw error;
        }
    }
}

module.exports = new FamiliaRepository();