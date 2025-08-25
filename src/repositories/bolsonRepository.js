const db = require('../config/db');

class BolsonRepository {
    async getUltimaFecha(){
        try {
            const result = await db.query('SELECT fecha FROM metadata');
            if (!result || result.length === 0) return null;
            return result[0].fecha;
        } catch (error) {
            console.error('Error al obtener la última fecha:', error);
            throw error;
        }
    }
    async setUltimaFecha(fecha) {
        try {
            await db.query('UPDATE metadata SET fecha = ?', [fecha]);
        } catch (error) {
            console.error('Error al actualizar la última fecha:', error);
            throw error;
        }
    }

    async getUltimoNumero() {
        try {
            const result = await db.query('SELECT numero FROM metadata');
            if (!result || result.length === 0) return null;; // Si no hay registros, retornar 0
            return result[0].numero;
        } catch (error) {
            console.error('Error al obtener el último número:', error);
            throw error;
        }
    }
    async setUltimoNumero(numero) {
        try {
            await db.query('UPDATE metadata SET numero = ?', [numero]);
        } catch (error) {
            console.error('Error al actualizar el último número:', error);
            throw error;
        }
    }
    async crearBolson(codigo, producto, peso, precinto, fecha, hora, responsable) {
        try {
            await db.query(
                `INSERT INTO bolsones (codigo, producto, peso, precinto, fecha, hora, responsable) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [codigo, producto, peso, precinto, fecha, hora, responsable]
            );
            return true;
        } catch (error) {
            console.error('Error detallado al crear el bolson:', error);
            // En lugar de devolver false, propaga el error
            throw error;
        }
    }
    async obtenerTodos(page = 1, limit = 10, sortBy = 'id', sortOrder = 'DESC') {
        try {
            const offset = (page - 1) * limit;
            const query = `SELECT * FROM bolsones ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
            const result = await db.query(query, [limit, offset]);
            
            // Obtener el número total de registros para la paginación
            const countResult = await db.query('SELECT COUNT(*) as total FROM bolsones');
            const total = countResult[0].total;
            
            return {
                data: result,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error al obtener todos los bolsones:', error);
            throw error;
        }
    }
    async obtenerPorId(id) {
        try {
            const result = await db.query('SELECT * FROM bolsones WHERE id = ?', [id]);
            if (!result || result.length === 0) return null;
            return result[0];
        } catch (error) {
            console.error('Error al obtener bolson por ID:', error);
            throw error;
        }
    }
    async actualizarBolson(id ,producto, peso, precinto) {
        try {
            const result = await db.query(
                `UPDATE bolsones SET producto = ?, peso = ?, precinto = ? WHERE id = ?`,
                [producto, peso, precinto, id]
            );
            return result.affectedRows > 0; // Devuelve true si se actualizó algún registro
        } catch (error) {
            console.error('Error al actualizar el bolson:', error);
            throw error;
        }
    }
    async eliminarBolson(id) {
        try {
            const result = await db.query('DELETE FROM bolsones WHERE id = ?', [id]);
            return result.affectedRows > 0; // Devuelve true si se eliminó algún registro
        } catch (error) {
            console.error('Error al eliminar el bolson:', error);
            throw error;
        }
    }
    async obtenerPorCodigo(codigo) {
        try {
            const result = await db.query('SELECT * FROM bolsones WHERE codigo = ?', [codigo]);
            if (!result || result.length === 0) return null;
            return result[0];
        } catch (error) {
            console.error('Error al obtener bolsón por código:', error);
            throw error;
        }
   }
    // Marcar bolsón como despachado
    async marcarComoDespachadoPorCodigo(codigo) {
        try {
            await db.query('UPDATE bolsones SET despachado = 1 WHERE codigo = ?', [codigo]);
        } catch (error) {
            console.error('Error al marcar bolsón como despachado:', error);
            throw error;
        }
    }
    async obtenerNoDespachados(page = 1, limit = 10, sortBy = 'id', sortOrder = 'DESC', filtros = {}) {
        const offset = (page - 1) * limit;
        
        // Construir la consulta con filtros
        let whereConditions = ['despachado = 0'];
        const params = [];
        
        // Aplicar filtros si existen
        if (filtros.producto) {
            whereConditions.push('producto LIKE ?');
            params.push(`%${filtros.producto}%`);
        }
        if (filtros.codigo) {
            whereConditions.push('codigo LIKE ?');
            params.push(`%${filtros.codigo}%`);
        }
        if (filtros.precinto) {
            whereConditions.push('precinto LIKE ?');
            params.push(`%${filtros.precinto}%`);
        }
        
        // Construir la consulta WHERE con todas las condiciones
        const whereClause = whereConditions.join(' AND ');
        
        // Añadir los parámetros de paginación
        params.push(limit, offset);
        
        const query = `SELECT * FROM bolsones WHERE ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
        const result = await db.query(query, params);
        
        // Construir la consulta de conteo
        const countQuery = `SELECT COUNT(*) as total FROM bolsones WHERE ${whereClause}`;
        const countResult = await db.query(countQuery, params.slice(0, -2)); // Excluir los parámetros de límite y offset
        const total = countResult[0].total;
        
        return {
            data: result,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Obtiene los bolsones que han sido despachados
     * @param {number} page - Página actual
     * @param {number} limit - Cantidad de items por página
     * @param {string} sortBy - Campo por el cual ordenar
     * @param {string} sortOrder - Orden de clasificación (ASC o DESC)
     * @param {Object} filtros - Filtros a aplicar (producto, codigo, precinto)
     * @returns {Promise<Object>} Bolsones despachados con información de paginación
     */
    async obtenerDespachados(page = 1, limit = 10, sortBy = 'id', sortOrder = 'DESC', filtros = {}) {
        const offset = (page - 1) * limit;
        
        // Construir la consulta con filtros
        let whereConditions = ['despachado = 1'];
        const params = [];
        
        // Aplicar filtros si existen
        if (filtros.producto) {
            whereConditions.push('producto LIKE ?');
            params.push(`%${filtros.producto}%`);
        }
        if (filtros.codigo) {
            whereConditions.push('codigo LIKE ?');
            params.push(`%${filtros.codigo}%`);
        }
        if (filtros.precinto) {
            whereConditions.push('precinto LIKE ?');
            params.push(`%${filtros.precinto}%`);
        }
        
        // Construir la consulta WHERE con todas las condiciones
        const whereClause = whereConditions.join(' AND ');
        
        // Añadir los parámetros de paginación
        params.push(limit, offset);
        
        const query = `SELECT * FROM bolsones WHERE ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
        const result = await db.query(query, params);
        
        // Construir la consulta de conteo
        const countQuery = `SELECT COUNT(*) as total FROM bolsones WHERE ${whereClause}`;
        const countResult = await db.query(countQuery, params.slice(0, -2)); // Excluir los parámetros de límite y offset
        const total = countResult[0].total;
        
        return {
            data: result,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Obtiene todos los bolsones disponibles (que no han sido despachados)
     * @returns {Promise<Array>} Array de bolsones disponibles
     */
    async obtenerBolsonesDisponibles() {
        try {
            const result = await db.query(`
                SELECT 
                    b.id, 
                    b.codigo, 
                    b.producto, 
                    b.peso, 
                    b.precinto, 
                    b.fecha, 
                    b.hora, 
                    b.responsable,
                    p.nombre AS nombreProducto
                FROM 
                    bolsones b
                LEFT JOIN 
                    productos p ON b.producto = p.id
                WHERE 
                    b.despachado = 0
                ORDER BY 
                    b.fecha DESC, b.id DESC
            `);
            return result;
        } catch (error) {
            console.error('Error en repositorio al obtener bolsones disponibles:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los bolsones que no están asociados a ningún parte diario
     * @returns {Promise<Array>} Array de bolsones no asociados
     */
    async obtenerBolsonesNoAsociados() {
        try {
            const result = await db.query(`
                SELECT 
                    b.id, 
                    b.codigo, 
                    b.producto, 
                    b.peso, 
                    b.precinto, 
                    b.fecha, 
                    b.hora, 
                    b.responsable,
                    p.nombre AS nombreProducto
                FROM 
                    bolsones b
                LEFT JOIN 
                    productos p ON b.producto = p.id
                WHERE 
                    (b.asociado_a_parte = 0 OR b.asociado_a_parte IS NULL)
                    AND b.parte_diario_id IS NULL
                ORDER BY 
                    b.fecha ASC, b.id ASC
            `);
            return result;
        } catch (error) {
            console.error('Error en repositorio al obtener bolsones no asociados:', error);
            throw error;
        }
    }
}

module.exports = new BolsonRepository();
