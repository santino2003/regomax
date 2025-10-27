const { ca, tr } = require('date-fns/locale');
const db = require('../config/db');

class ClienteNFURepository {
    async crearCliente(empresa, cuit, correo, telefono) {
        try {
        await db.query (
            `INSERT INTO clientes_nfu (empresa, cuit, correo, telefono)
            VALUES (?, ?, ?, ?)`,
        [empresa, cuit, correo, telefono]
        );
        return true;
        } catch (error) {
            console.error('Error en ClienteNFURepository.crearCliente:', error);
            throw error;
        }
    }

    async obtenerTodos() {
        try {
            const result = await db.query('SELECT * FROM clientes_nfu ORDER BY created_at DESC');
            return result;
        } catch (error) {
            console.error('Error al obtener clientes NFU:', error);
            throw error;
        }
    }

    async obtenerConFiltros(filtros = {}) {
        try {
            let query = 'SELECT * FROM clientes_nfu WHERE 1=1';
            const params = [];

            if (filtros.empresa && filtros.empresa.trim() !== '') {
                query += ' AND empresa LIKE ?';
                params.push(`%${filtros.empresa}%`);
            }

            if (filtros.cuit && filtros.cuit.trim() !== '') {
                query += ' AND cuit LIKE ?';
                params.push(`%${filtros.cuit}%`);
            }

            query += ' ORDER BY created_at DESC';

            const result = await db.query(query, params);
            return result;
        } catch (error) {
            console.error('Error al obtener clientes NFU con filtros:', error);
            throw error;
        }
    }

    async obtenerPorId(id) {
        try {
            const result = await db.query('SELECT * FROM clientes_nfu WHERE id = ?', [id]);
            return result[0] || null;
        } catch (error) {
            console.error('Error al obtener cliente NFU por ID:', error);
            throw error;
        }
    }

    async actualizarCliente(id, empresa, cuit, correo, telefono) {
        try {
            await db.query(
                `UPDATE clientes_nfu 
                SET empresa = ?, cuit = ?, correo = ?, telefono = ?
                WHERE id = ?`,
                [empresa, cuit, correo, telefono, id]
            );
            return true;
        } catch (error) {
            console.error('Error en ClienteNFURepository.actualizarCliente:', error);
            throw error;
        }
    }

    async eliminarCliente(id) {
        try {
            await db.query('DELETE FROM clientes_nfu WHERE id = ?', [id]);
            return true;
        } catch (error) {
            console.error('Error en ClienteNFURepository.eliminarCliente:', error);
            throw error;
        }
    }
}
module.exports = new ClienteNFURepository();