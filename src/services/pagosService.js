const bienProveedorRepository = require('../repositories/bienProveedorRepository');
const ordenCompraRepository = require('../repositories/ordenCompraRepository');
const { calcularJuevesProximaSemana } = require('../utils/fecha');

class PagosService {
    async registrarPagoPorRecepcion(ordenId, itemId, cantidadRecibida, username) {
        try {
            console.log('💰 [PAGOS] Procesando recepción:', { ordenId, itemId, cantidadRecibida, usuario: username });

            // 1. Obtener el item con su proveedor sugerido directamente del repository
            const itemInfo = await ordenCompraRepository.obtenerProveedorDeItem(ordenId, itemId);

            // Validar que se encontró el item
            if (!itemInfo) {
                console.error('❌ [PAGOS] Item no encontrado');
                return {
                    success: false,
                    message: `No se encontró el item en la orden de compra`
                };
            }

            // 2. Verificar que tenga proveedor sugerido
            if (!itemInfo.proveedor_sugerido_id) {
                console.warn(`⚠️ [PAGOS] Item "${itemInfo.bien_nombre}" sin proveedor sugerido - No se informará a pagos`);
                return {
                    success: false,
                    warning: true,
                    message: `⚠️ El item "${itemInfo.bien_nombre}" no tiene proveedor sugerido asignado. No se informará a pagos automáticamente.`,
                    requiresManualPayment: true
                };
            }

            console.log('✓ [PAGOS] Item con proveedor:', { 
                bien: itemInfo.bien_nombre, 
                proveedor: itemInfo.proveedor_nombre 
            });

            // 3. Obtener el precio del proveedor para ese bien
            let precioInfo;
            try {
                precioInfo = await bienProveedorRepository.obtenerPrecioProveedorBien(
                    itemInfo.bien_id,
                    itemInfo.proveedor_sugerido_id
                );
            } catch (error) {
                console.warn(`⚠️ [PAGOS] Error al consultar precio:`, error.message);
                return {
                    success: false,
                    warning: true,
                    message: `⚠️ Error al consultar precio del proveedor "${itemInfo.proveedor_nombre}". No se informará a pagos.`,
                    requiresManualPayment: true
                };
            }
            
            if (!precioInfo || !precioInfo.precio) {
                console.warn(`⚠️ [PAGOS] Sin precio para proveedor "${itemInfo.proveedor_nombre}"`);
                return {
                    success: false,
                    warning: true,
                    message: `⚠️ El proveedor "${itemInfo.proveedor_nombre}" no tiene precio configurado para el bien "${itemInfo.bien_nombre}". No se informará a pagos.`,
                    requiresManualPayment: true
                };
            }

            // 4. Calcular el monto total a pagar
            const precioUnitario = parseFloat(precioInfo.precio);
            const montoTotal = precioUnitario * cantidadRecibida;

            // 5. Preparar información del pago
            const infoPago = {
                ordenId: ordenId,
                itemId: itemId,
                bienId: itemInfo.bien_id,
                bienNombre: itemInfo.bien_nombre,
                bienCodigo: itemInfo.bien_codigo,
                proveedorId: itemInfo.proveedor_sugerido_id,
                proveedorNombre: itemInfo.proveedor_nombre,
                cantidadRecibida: cantidadRecibida,
                precioUnitario: precioUnitario,
                montoTotal: montoTotal,
                registradoPor: username,
                fecha: calcularJuevesProximaSemana(new Date())
            };

            console.log('✅ [PAGOS] Pago calculado:', {
                bien: infoPago.bienNombre,
                proveedor: infoPago.proveedorNombre,
                cantidad: infoPago.cantidadRecibida,
                precioUnitario: `$${infoPago.precioUnitario.toFixed(2)}`,
                montoTotal: `$${infoPago.montoTotal.toFixed(2)}`,
                fecha: infoPago.fecha
            });

            // TODO: Aquí registrar el pago en la base de datos
            // await pagoRepository.crear(infoPago);

            return {
                success: true,
                message: `✓ Pago informado: $${montoTotal.toFixed(2)} (${cantidadRecibida} × $${precioUnitario.toFixed(2)})`,
                data: infoPago
            };

        } catch (error) {
            console.error('❌ [PAGOS] Error en registrarPagoPorRecepcion:', error);
            throw error;
        }
    }
}

module.exports = new PagosService();