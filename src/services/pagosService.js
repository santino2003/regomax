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

    /**
     * Registrar un adelanto de pago para una orden de compra a contrafactura
     * @param {Object} adelantoData - Datos del adelanto
     * @param {number} adelantoData.ordenId - ID de la orden de compra
     * @param {number} adelantoData.montoAdelanto - Monto del adelanto
     * @param {string} adelantoData.fechaPago - Fecha del pago del adelanto
     * @param {string} adelantoData.username - Usuario que registra
     * @returns {Promise<Object>} - Resultado del registro
     */
    async registrarAdelanto(adelantoData) {
        try {
            const { ordenId, montoAdelanto, fechaPago, username } = adelantoData;

            console.log('💰 [PAGOS] Registrando adelanto:', { 
                ordenId, 
                montoAdelanto, 
                fechaPago, 
                usuario: username 
            });

            // Validar datos
            if (!ordenId || !montoAdelanto || !fechaPago) {
                throw new Error('Faltan datos requeridos para registrar el adelanto');
            }

            if (montoAdelanto <= 0) {
                throw new Error('El monto del adelanto debe ser mayor a 0');
            }

            // Obtener información de la orden
            const orden = await ordenCompraRepository.obtenerPorId(ordenId);
            if (!orden) {
                throw new Error('Orden de compra no encontrada');
            }

            // Verificar que sea contrafactura
            if (!orden.contrafactura) {
                throw new Error('Solo se pueden registrar adelantos para órdenes a contrafactura');
            }

            // Preparar información del adelanto
            const infoAdelanto = {
                ordenId: ordenId,
                ordenCodigo: orden.codigo,
                proveedorId: orden.proveedor_id,
                proveedorNombre: orden.proveedor_nombre,
                montoAdelanto: parseFloat(montoAdelanto),
                fechaPago: fechaPago,
                tipo: 'ADELANTO',
                registradoPor: username,
                fechaRegistro: new Date()
            };

            console.log('✅ [PAGOS] Adelanto preparado:', infoAdelanto);

            // TODO: Aquí registrar el adelanto en la base de datos
            // await pagoRepository.registrarAdelanto(infoAdelanto);

            return {
                success: true,
                message: `✓ Adelanto registrado: $${montoAdelanto} para la fecha ${fechaPago}`,
                data: infoAdelanto
            };

        } catch (error) {
            console.error('❌ [PAGOS] Error en registrarAdelanto:', error);
            throw error;
        }
    }

    /**
     * Registrar el pago del saldo completo de una orden de compra a contrafactura
     * @param {Object} pagoData - Datos del pago
     * @param {number} pagoData.ordenId - ID de la orden de compra
     * @param {number} pagoData.montoTotal - Monto total de la orden
     * @param {number} pagoData.montoAdelanto - Monto ya adelantado (si existe)
     * @param {string} pagoData.fechaPago - Fecha del pago del saldo
     * @param {string} pagoData.username - Usuario que registra
     * @returns {Promise<Object>} - Resultado del registro
     */
    async registrarPagoSaldoCompleto(pagoData) {
        try {
            const { ordenId, montoTotal, montoAdelanto = 0, fechaPago, username } = pagoData;

            console.log('💰 [PAGOS] Registrando pago de saldo completo:', { 
                ordenId, 
                montoTotal,
                montoAdelanto,
                fechaPago, 
                usuario: username 
            });

            // Validar datos
            if (!ordenId || !montoTotal || !fechaPago) {
                throw new Error('Faltan datos requeridos para registrar el pago');
            }

            if (montoTotal <= 0) {
                throw new Error('El monto total debe ser mayor a 0');
            }

            // Obtener información de la orden
            const orden = await ordenCompraRepository.obtenerPorId(ordenId);
            if (!orden) {
                throw new Error('Orden de compra no encontrada');
            }

            // Verificar que sea contrafactura
            if (!orden.contrafactura) {
                throw new Error('Solo se pueden registrar pagos completos para órdenes a contrafactura');
            }

            // Calcular el saldo a pagar (total - adelanto)
            const saldoAPagar = parseFloat(montoTotal) - parseFloat(montoAdelanto);

            if (saldoAPagar < 0) {
                throw new Error('El adelanto no puede ser mayor al monto total');
            }

            // Preparar información del pago
            const infoPago = {
                ordenId: ordenId,
                ordenCodigo: orden.codigo,
                proveedorId: orden.proveedor_id,
                proveedorNombre: orden.proveedor_nombre,
                montoTotal: parseFloat(montoTotal),
                montoAdelanto: parseFloat(montoAdelanto),
                saldoAPagar: saldoAPagar,
                fechaPago: fechaPago,
                tipo: 'SALDO_COMPLETO',
                registradoPor: username,
                fechaRegistro: new Date()
            };

            console.log('✅ [PAGOS] Pago de saldo completo preparado:', {
                ...infoPago,
                montoTotal: `$${infoPago.montoTotal.toFixed(2)}`,
                montoAdelanto: `$${infoPago.montoAdelanto.toFixed(2)}`,
                saldoAPagar: `$${infoPago.saldoAPagar.toFixed(2)}`
            });

            // TODO: Aquí registrar el pago completo en la base de datos
            // await pagoRepository.registrarPagoCompleto(infoPago);

            return {
                success: true,
                message: `✓ Pago registrado: Total $${montoTotal} (Adelanto: $${montoAdelanto}, Saldo: $${saldoAPagar.toFixed(2)})`,
                data: infoPago
            };

        } catch (error) {
            console.error('❌ [PAGOS] Error en registrarPagoSaldoCompleto:', error);
            throw error;
        }
    }
}

module.exports = new PagosService();