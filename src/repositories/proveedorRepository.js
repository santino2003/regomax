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

    async obtenerTodos() {
        try {
            const result = await db.query('SELECT * FROM proveedores');
            return result;
        } catch (error) {
            console.error('Error al obtener proveedores:', error);
            throw error;
        }
    }
}
module.exports = new ProveedorRepository();