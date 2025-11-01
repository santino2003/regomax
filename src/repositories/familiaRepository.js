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

    async obtenerTodas() {
        try {
            const result = await db.query('SELECT * FROM familias ORDER BY nombre ASC');
            return result;
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