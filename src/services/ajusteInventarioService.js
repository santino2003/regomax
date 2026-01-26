const ajusteInventarioRepository = require('../repositories/ajusteInventarioRepository');
const bienRepository = require('../repositories/bienRepository');
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

            // Obtener información del bien
            const bien = await bienRepository.obtenerPorId(data.item_id);
            if (!bien) {
                throw new Error('Bien no encontrado');
            }

            // Calcular stock anterior y nuevo
            const stockAnterior = parseFloat(bien.cantidad_stock) || 0;
            let stockNuevo;

            // ENTRADA y AJUSTE_ENTRADA suman, SALIDA y AJUSTE_SALIDA restan
            if (data.tipo_movimiento === 'ENTRADA' || data.tipo_movimiento === 'AJUSTE_ENTRADA') {
                stockNuevo = stockAnterior + parseFloat(data.cantidad);
            } else if (data.tipo_movimiento === 'SALIDA' || data.tipo_movimiento === 'AJUSTE_SALIDA') {
                stockNuevo = stockAnterior - parseFloat(data.cantidad);
                
                // Validar que no quede stock negativo
                if (stockNuevo < 0) {
                    throw new Error('No hay suficiente stock disponible');
                }
            } else {
                throw new Error('Tipo de movimiento inválido');
            }

            // Preparar datos del ajuste
            const ajusteData = {
                tipo_movimiento: data.tipo_movimiento,
                tipo_item: data.tipo_item,
                item_id: data.item_id,
                codigo: bien.codigo,
                nombre: bien.nombre,
                cantidad: parseFloat(data.cantidad),
                stock_anterior: stockAnterior,
                stock_nuevo: stockNuevo,
                almacen_id: data.almacen_id || null,
                precio_unitario: data.precio_unitario || null,
                cliente: data.cliente || null,
                responsable: data.responsable,
                usuario_sistema: username,
                fecha: data.fecha || new Date(),
                observaciones: data.observaciones || null
            };

            console.log('📦 Datos del ajuste a insertar:', ajusteData);
            console.log('🔍 tipo_movimiento recibido:', data.tipo_movimiento, 'tipo:', typeof data.tipo_movimiento);

            // Registrar el ajuste en movimientos_stock
            const resultado = await ajusteInventarioRepository.registrarAjuste(ajusteData);

            // Actualizar el stock del bien
            // Para SALIDA/AJUSTE_SALIDA usar descontarStock que maneja alertas
            // Para ENTRADA/AJUSTE_ENTRADA actualizar directamente
            if (data.tipo_movimiento === 'SALIDA' || data.tipo_movimiento === 'AJUSTE_SALIDA') {
                await bienService.descontarStock(data.item_id, parseFloat(data.cantidad));
            } else {
                await bienRepository.actualizarStock(data.item_id, stockNuevo);
            }

            return {
                success: true,
                message: 'Ajuste de inventario procesado correctamente',
                data: {
                    movimiento_id: resultado.id,
                    stock_anterior: stockAnterior,
                    stock_nuevo: stockNuevo,
                    diferencia: (data.tipo_movimiento === 'ENTRADA' || data.tipo_movimiento === 'AJUSTE_ENTRADA')
                        ? `+${data.cantidad}` 
                        : `-${data.cantidad}`
                }
            };
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
