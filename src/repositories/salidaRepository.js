const db = require('../config/db');

class SalidaRepository {
    /**
     * Registrar movimiento de stock (salida rápida o ajuste de inventario)
     * @param {Object} movimientoData - Datos del movimiento
     * @returns {Object} Resultado de la inserción
     */
    async registrarMovimiento(movimientoData) {
        try {
            const result = await db.query(`
                INSERT INTO movimientos_stock (
                    tipo_movimiento,
                    tipo_item,
                    item_id,
                    codigo,
                    nombre,
                    cantidad,
                    stock_anterior,
                    stock_nuevo,
                    almacen_id,
                    precio_unitario,
                    cliente,
                    responsable,
                    usuario_sistema,
                    observaciones
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                movimientoData.tipo_movimiento || 'SALIDA',
                movimientoData.tipo_item,
                movimientoData.item_id,
                movimientoData.codigo,
                movimientoData.nombre,
                movimientoData.cantidad,
                movimientoData.stock_anterior,
                movimientoData.stock_nuevo,
                movimientoData.almacen_id || null,
                movimientoData.precio_unitario || null,
                movimientoData.cliente || null,
                movimientoData.responsable,
                movimientoData.usuario_sistema,
                movimientoData.observaciones || null
            ]);

            return { id: result.insertId };
        } catch (error) {
            console.error('Error al registrar movimiento de stock:', error);
            throw error;
        }
    }
}

module.exports = new SalidaRepository();
