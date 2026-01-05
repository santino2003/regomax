const db = require('../config/db');

class SalidaRepository {
    /**
     * Registrar salida en tabla de movimientos
     * @param {Object} salidaData - Datos de la salida
     * @returns {Object} Resultado de la inserción
     */
    async registrarMovimiento(salidaData) {
        try {
            const result = await db.query(`
                INSERT INTO salidas_stock (
                    tipo_item,
                    item_id,
                    codigo,
                    nombre,
                    cantidad,
                    stock_anterior,
                    stock_nuevo,
                    responsable_salida,
                    usuario_sistema,
                    observaciones
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                salidaData.tipo_item,
                salidaData.item_id,
                salidaData.codigo,
                salidaData.nombre,
                salidaData.cantidad,
                salidaData.stock_anterior,
                salidaData.stock_nuevo,
                salidaData.responsable_salida,
                salidaData.usuario_sistema,
                salidaData.observaciones || null
            ]);

            return { id: result.insertId };
        } catch (error) {
            console.error('Error al registrar movimiento de salida:', error);
            throw error;
        }
    }
}

module.exports = new SalidaRepository();
