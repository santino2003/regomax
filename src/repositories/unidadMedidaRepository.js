const db = require('../config/db');

class UnidadMedidaRepository {
    async crearUnidadMedida(nombre, nombreLindo, responsable) {
        try {
            await db.query(
                `INSERT INTO unidades_medida (nombre, nombre_lindo, responsable) VALUES (?, ?, ?)`,
                [nombre, nombreLindo, responsable]
            );
            return true;
        } catch (error) {
            console.error('Error en UnidadMedidaRepository.crearUnidadMedida:', error);
            throw error;
        }
    }
    
    async modificarUnidadMedida(id, nombre, nombreLindo) {
        try {
            await db.query(
                `UPDATE unidades_medida SET nombre = ?, nombre_lindo = ? WHERE id = ?`,
                [nombre, nombreLindo, id]
            );
            return true;
        } catch (error) {
            console.error('Error en UnidadMedidaRepository.modificarUnidadMedida:', error);
            throw error;
        }
    }

    async eliminarUnidadMedida(id) {
        try {
            await db.query(
                `DELETE FROM unidades_medida WHERE id = ?`,
                [id]
            );
            return true;
        } catch (error) {
            console.error('Error en UnidadMedidaRepository.eliminarUnidadMedida:', error);
            throw error;
        }
    }

    async obtenerTodas(page = 1, limit = 10) {
        try {
            // Contar total de registros
            const countResult = await db.query('SELECT COUNT(*) as total FROM unidades_medida');
            const totalRegistros = countResult[0].total;
            
            // Obtener registros paginados
            const offset = (page - 1) * limit;
            const result = await db.query(
                `SELECT * FROM unidades_medida ORDER BY nombre ASC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`
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
            console.error('Error en UnidadMedidaRepository.obtenerTodas:', error);
            throw error;
        }
    }

    async obtenerPorId(id) {
        try {
            const result = await db.query('SELECT * FROM unidades_medida WHERE id = ?', [id]);
            return result[0] || null;
        } catch (error) {
            console.error('Error al obtener unidad de medida por ID:', error);
            throw error;
        }
    }
}

module.exports = new UnidadMedidaRepository();
