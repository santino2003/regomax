const { ca, tr } = require('date-fns/locale');
const db = require('../config/db');

class ProveedorRepository {
    async crearProveedor(nombre, contacto, telefono, email, direccion, web, rubro ,responsable) {
        try {
        await db.query (
            `INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, web, rubro ,responsable)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [nombre, contacto, telefono, email, direccion, web, rubro ,responsable]
        );
        return true;
        } catch (error) {
            console.error('Error en ProveedorRepository.crearProveedor:', error);
            throw error;
        }
    }

    async obtenerTodos(filtros = {}) {
        try {
            let query = 'SELECT * FROM proveedores WHERE 1=1';
            const params = [];

            // Filtrar por nombre
            if (filtros.nombre && filtros.nombre.trim()) {
                query += ' AND nombre LIKE ?';
                params.push(`%${filtros.nombre.trim()}%`);
            }

            // Filtrar por contacto
            if (filtros.contacto && filtros.contacto.trim()) {
                query += ' AND contacto LIKE ?';
                params.push(`%${filtros.contacto.trim()}%`);
            }

            // Filtrar por rubro
            if (filtros.rubro && filtros.rubro.trim()) {
                query += ' AND rubro LIKE ?';
                params.push(`%${filtros.rubro.trim()}%`);
            }

            // Ordenar por nombre
            query += ' ORDER BY nombre ASC';

            const result = await db.query(query, params);
            return result;
        } catch (error) {
            console.error('Error al obtener proveedores:', error);
            throw error;
        }
    }

    async obtenerPorId(id) {
        try {
            const result = await db.query('SELECT * FROM proveedores WHERE id = ?', [id]);
            return result[0] || null;
        } catch (error) {
            console.error('Error al obtener proveedor por ID:', error);
            throw error;
        }
    }

    async eliminar(id) {
        try {
            await db.query('DELETE FROM proveedores WHERE id = ?', [id]);
            return true;
        } catch (error) {
            console.error('Error al eliminar proveedor:', error);
            throw error;
        }
    }

    async actualizar(id, nombre, contacto, telefono, email, direccion, web, rubro) {
        try {
            await db.query(
                `UPDATE proveedores 
                SET nombre = ?, contacto = ?, telefono = ?, email = ?, direccion = ?, web = ?, rubro = ?
                WHERE id = ?`,
                [nombre, contacto, telefono, email, direccion, web, rubro, id]
            );
            return true;
        } catch (error) {
            console.error('Error al actualizar proveedor:', error);
            throw error;
        }
    }
}
module.exports = new ProveedorRepository();