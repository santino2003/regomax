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
    async obtenerTodos() {
        try {
            const result = await db.query('SELECT * FROM bolsones');
            return result;
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
}
module.exports = new BolsonRepository();
