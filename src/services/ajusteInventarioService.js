const ajusteInventarioRepository = require('../repositories/ajusteInventarioRepository');
const db = require('../config/db');
const { stockQuantity } = require('../utils/stockQuantity');
const bienService = require('./bienService');

class AjusteInventarioService {
    /**
     * Procesar ajuste de inventario
     * @param {Object} data - Datos del ajuste
     * @param {string} username - Usuario que realiza el ajuste
     * @returns {Object} Resultado del procesamiento
     */
    async procesarAjuste(data, username) {
        try {
            // Validar campos requeridos
            if (!data.tipo_item || !data.item_id || !data.cantidad || !data.tipo_movimiento) {
                throw new Error('Faltan campos requeridos');
            }

            const cantidad = stockQuantity(data.cantidad);
            if (data.tipo_item !== 'bien') throw new Error('El ajuste debe corresponder a un bien');
            const entrada = ['ENTRADA', 'AJUSTE_ENTRADA'].includes(data.tipo_movimiento);
            if (!entrada && !['SALIDA', 'AJUSTE_SALIDA'].includes(data.tipo_movimiento)) {
                throw new Error('Tipo de movimiento inválido');
            }
            return await db.withTransaction(async connection => {
                const cambio = entrada
                    ? await bienService.incrementarStock(data.item_id, cantidad, connection)
                    : await bienService.descontarStock(data.item_id, cantidad, connection);
                const resultado = await ajusteInventarioRepository.registrarAjuste({
                    tipo_movimiento: data.tipo_movimiento, tipo_item: data.tipo_item, item_id: data.item_id,
                    codigo: cambio.item.codigo, nombre: cambio.item.nombre, cantidad,
                    stock_anterior: cambio.stock_anterior, stock_nuevo: cambio.stock_nuevo,
                    almacen_id: data.almacen_id || null, precio_unitario: data.precio_unitario || null,
                    cliente: data.cliente || null, responsable: data.responsable, usuario_sistema: username,
                    fecha: data.fecha || new Date(), observaciones: data.observaciones || null
                }, connection);
                return {
                    success: true,
                    message: 'Ajuste de inventario procesado correctamente',
                    data: {
                        movimiento_id: resultado.id,
                        stock_anterior: cambio.stock_anterior, stock_nuevo: cambio.stock_nuevo,
                        diferencia: `${entrada ? '+' : '-'}${cantidad}`
                    }
                };
            });
        } catch (error) {
            console.error('Error al procesar ajuste:', error);
            return {
                success: false,
                message: error.message || 'Error al procesar el ajuste de inventario'
            };
        }
    }

    /**
     * Obtener historial de movimientos
     * @param {number} page - Página actual
     * @param {number} limit - Registros por página
     * @param {Object} filtros - Filtros opcionales
     * @returns {Object} Movimientos con paginación
     */
    async obtenerHistorial(page = 1, limit = 20, filtros = {}) {
        try {
            return await ajusteInventarioRepository.obtenerMovimientos(page, limit, filtros);
        } catch (error) {
            console.error('Error al obtener historial:', error);
            return {
                success: false,
                message: 'Error al obtener el historial de movimientos'
            };
        }
    }
}

module.exports = new AjusteInventarioService();
