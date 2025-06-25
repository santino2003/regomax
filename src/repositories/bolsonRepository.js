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
}
module.exports = new BolsonRepository();
