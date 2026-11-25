const salidaRepository = require('../repositories/salidaRepository');
const db = require('../config/db');
const { stockQuantity } = require('../utils/stockQuantity');
const bienService = require('./bienService');
const kitService = require('./kitService');
const bienRepository = require('../repositories/bienRepository');
const kitRepository = require('../repositories/kitRepository');

class SalidaService {
    /**
     * Buscar bien o kit por código
     * @param {string} codigo - Código a buscar
     * @returns {Object} Item encontrado o error
     */
    async buscarPorCodigo(codigo) {
        try {
            if (!codigo || codigo.trim() === '') {
                throw new Error('El código es requerido');
            }

            const codigoLimpio = codigo.trim();

            // Primero buscar en bienes
            const bienes = await bienRepository.obtenerTodos(1, 9999, { busqueda: codigoLimpio });
            const bienEncontrado = bienes.data.find(b => b.codigo === codigoLimpio);

            if (bienEncontrado) {
                return {
                    success: true,
                    data: {
                        id: bienEncontrado.id,
                        codigo: bienEncontrado.codigo,
                        nombre: bienEncontrado.nombre,
                        tipo: bienEncontrado.tipo,
                        cantidad_stock: bienEncontrado.cantidad_stock,
                        cantidad_critica: bienEncontrado.cantidad_critica,
                        unidad_medida: bienEncontrado.unidad_medida_nombre,
                        tipo_item: 'bien'
                    }
                };
            }

            // Si no es un bien, buscar en kits
            try {
                const kits = await kitRepository.obtenerTodos(1, 9999, { busqueda: codigoLimpio });
                const kitEncontrado = kits.data.find(k => k.codigo === codigoLimpio);

                if (kitEncontrado) {
                    return {
                        success: true,
                        data: {
                            id: kitEncontrado.id,
                            codigo: kitEncontrado.codigo,
                            nombre: kitEncontrado.nombre,
                            tipo: kitEncontrado.tipo,
                            cantidad_stock: kitEncontrado.cantidad_stock,
                            cantidad_critica: kitEncontrado.cantidad_critica,
                            unidad_medida: kitEncontrado.unidad_medida_nombre,
                            tipo_item: 'kit'
                        }
                    };
                }
            } catch (kitError) {
                // Si la tabla kits no existe, solo continuar con bienes
                console.log('Tabla kits no disponible, solo buscando en bienes');
            }

            throw new Error(`No se encontró ningún bien o kit con el código: ${codigo}`);
        } catch (error) {
            console.error('Error al buscar por código:', error);
            throw error;
        }
    }

    /**
     * Procesar salida de bien o kit
     * @param {Object} salidaData - Datos de la salida
     * @returns {Object} Resultado del procesamiento
     */
    async procesarSalida(salidaData) {
        try {
            const { item_id, tipo_item, cantidad, responsable_salida, usuario_sistema } = salidaData;

            // Validaciones
            if (!item_id || !tipo_item || !cantidad || !responsable_salida) {
                throw new Error('Todos los campos son requeridos');
            }

            const unidades = stockQuantity(cantidad);
            if (!['bien', 'kit'].includes(tipo_item)) throw new Error('Tipo de item no válido');

            return await db.withTransaction(async connection => {
                const service = tipo_item === 'bien' ? bienService : kitService;
                const cambio = await service.descontarStock(item_id, unidades, connection);
                await salidaRepository.registrarMovimiento({
                    tipo_movimiento: 'SALIDA', tipo_item, item_id,
                    codigo: cambio.item.codigo, nombre: cambio.item.nombre, cantidad: unidades,
                    stock_anterior: cambio.stock_anterior, stock_nuevo: cambio.stock_nuevo,
                    responsable: responsable_salida, usuario_sistema
                }, connection);
                return {
                    success: true,
                    message: `Salida procesada exitosamente. Se descontaron ${unidades} unidades.`,
                    data: { stock_anterior: cambio.stock_anterior, stock_nuevo: cambio.stock_nuevo }
                };
            });
        } catch (error) {
            console.error('Error al procesar salida:', error);
            throw error;
        }
    }
}

module.exports = new SalidaService();
