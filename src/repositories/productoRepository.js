const db = require('../config/db');

class ProductoRepository {
    async crearProducto(nombre, unidad, enStock, creadoPor) {
        try {
            const query = `
                INSERT INTO productos (nombre, unidad, en_stock, creado_por) 
                VALUES (?, ?, ?, ?)
            `;
            const result = await db.query(query, [nombre, unidad, enStock ? 1 : 0, creadoPor]);
            return result.insertId;
        } catch (error) {
            console.error('Error al crear producto:', error);
            throw error;
        }
    }
    
    async obtenerPorNombre(nombre) {
        try {
            const result = await db.query('SELECT * FROM productos WHERE nombre = ?', [nombre]);
            if (result.length === 0) return null;
            return result[0];
        } catch (error) {
            console.error('Error al obtener producto por nombre:', error);
            throw error;
        }
    }
    
    async obtenerTodos() {
        try {
            const result = await db.query('SELECT * FROM productos ORDER BY nombre ASC');
            return result;
        } catch (error) {
            console.error('Error al obtener todos los productos:', error);
            throw error;
        }
    }
    
    // Nuevo método para obtener solo productos en stock
    async obtenerProductosEnStock() {
        try {
            const result = await db.query('SELECT * FROM productos WHERE en_stock = TRUE ORDER BY nombre ASC');
            return result;
        } catch (error) {
            console.error('Error al obtener productos en stock:', error);
            throw error;
        }
    }
    
    async obtenerPorId(id) {
        try {
            const result = await db.query('SELECT * FROM productos WHERE id = ?', [id]);
            return result[0] || null;
        } catch (error) {
            console.error('Error al obtener producto por ID:', error);
            throw error;
        }
    }
    
    async actualizarProducto(id, nombre, unidad, enStock) {
        try {
            const query = `
                UPDATE productos 
                SET nombre = ?, unidad = ?, en_stock = ?
                WHERE id = ?
            `;
            await db.query(query, [nombre, unidad, enStock ? 1 : 0, id]);
            return true;
        } catch (error) {
            console.error('Error al actualizar producto:', error);
            throw error;
        }
    }
    
    async eliminarProducto(id) {
        try {
            await db.query('DELETE FROM productos WHERE id = ?', [id]);
            return true;
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            throw error;
        }
    }
}

module.exports = new ProductoRepository();