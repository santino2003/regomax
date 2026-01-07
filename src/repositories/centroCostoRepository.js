const db = require('../config/db');

class CentroCostoRepository {
    async crear(nombre, responsable) {
        try {
            await db.query(
                `INSERT INTO centro_de_costo (nombre, responsable) VALUES (?, ?)`,
                [nombre, responsable]
            );
            return true;
        } catch (error) {
            console.error('Error en CentroCostoRepository.crear:', error);
            throw error;
        }
    }
    
    async modificar(id, nombre) {
        try {
            await db.query(
                `UPDATE centro_de_costo SET nombre = ? WHERE id = ?`,
                [nombre, id]
            );
            return true;
        } catch (error) {
            console.error('Error en CentroCostoRepository.modificar:', error);
            throw error;
        }
    }

    async eliminar(id) {
        try {
            await db.query(
                `DELETE FROM centro_de_costo WHERE id = ?`,
                [id]
            );
            return true;
        } catch (error) {
            console.error('Error en CentroCostoRepository.eliminar:', error);
            throw error;
        }
    }

    async cambiarEstado(id, activo) {
        try {
            await db.query(
                `UPDATE centro_de_costo SET activo = ? WHERE id = ?`,
                [activo, id]
            );
            return true;
        } catch (error) {
            console.error('Error en CentroCostoRepository.cambiarEstado:', error);
            throw error;
        }
    }

    async obtenerTodos(page = 1, limit = 10) {
        try {
            // Contar total de registros
            const countResult = await db.query('SELECT COUNT(*) as total FROM centro_de_costo');
            const totalRegistros = countResult[0].total;
            
            // Obtener registros paginados
            const offset = (page - 1) * limit;
            const result = await db.query(
                `SELECT * FROM centro_de_costo ORDER BY nombre ASC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`
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
            console.error('Error en CentroCostoRepository.obtenerTodos:', error);
            throw error;
        }
    }

    async obtenerActivos() {
        try {
            const result = await db.query(
                'SELECT id, nombre FROM centro_de_costo WHERE activo = 1 ORDER BY nombre ASC'
            );
            return result;
        } catch (error) {
            console.error('Error en CentroCostoRepository.obtenerActivos:', error);
            throw error;
        }
    }

    async obtenerPorId(id) {
        try {
            const result = await db.query('SELECT * FROM centro_de_costo WHERE id = ?', [id]);
            return result[0] || null;
        } catch (error) {
            console.error('Error al obtener centro de costo por ID:', error);
            throw error;
        }
    }

    async existeEnOrdenes(id) {
        try {
            const result = await db.query(
                'SELECT COUNT(*) as count FROM ordenes_compra WHERE centro_costo_id = ?',
                [id]
            );
            return result[0].count > 0;
        } catch (error) {
            console.error('Error al verificar uso en órdenes:', error);
            throw error;
        }
    }
}

module.exports = new CentroCostoRepository();
