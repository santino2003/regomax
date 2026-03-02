const bienProveedorRepository = require('../repositories/bienProveedorRepository');
const ordenCompraRepository = require('../repositories/ordenCompraRepository');
const pagoRepository = require('../repositories/pagoRepository');
const { calcularJuevesProximaSemana, formatMySQLLocal } = require('../utils/fecha');

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
            const fechaPagoDate = calcularJuevesProximaSemana(new Date());
            const fechaPago = formatMySQLLocal(fechaPagoDate).split(' ')[0]; // Solo la fecha, sin hora

            console.log('✅ [PAGOS] Pago calculado:', {
                bien: itemInfo.bien_nombre,
                proveedor: itemInfo.proveedor_nombre,
                cantidad: cantidadRecibida,
                precioUnitario: `$${precioUnitario.toFixed(2)}`,
                montoTotal: `$${montoTotal.toFixed(2)}`,
                fecha: fechaPago
            });

            // 5. Registrar el pago en la base de datos
            const pagoRegistrado = await pagoRepository.registrarPagoRecepcion({
                ordenCompraId: ordenId,
                bienId: itemInfo.bien_id,
                proveedorId: itemInfo.proveedor_sugerido_id,
                cantidadRecibida: cantidadRecibida,
                precioUnitario: precioUnitario,
                montoPago: montoTotal,
                fechaPago: fechaPago,
                registradoPor: username,
                observaciones: `Pago por recepción de ${cantidadRecibida} unidades de "${itemInfo.bien_nombre}"`
            });

            console.log('💾 [PAGOS] Pago registrado con ID:', pagoRegistrado.id);

            return {
                success: true,
                message: `✓ Pago informado: $${montoTotal.toFixed(2)} (${cantidadRecibida} × $${precioUnitario.toFixed(2)})`,
                data: {
                    pagoId: pagoRegistrado.id,
                    bienNombre: itemInfo.bien_nombre,
                    proveedorNombre: itemInfo.proveedor_nombre,
                    cantidadRecibida: cantidadRecibida,
                    precioUnitario: precioUnitario,
                    montoTotal: montoTotal,
                    fechaPago: fechaPago
                }
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

            // Agrupar items por proveedor para crear adelantos separados
            const itemsPorProveedor = new Map();
            
            // Si la orden tiene un proveedor principal y no hay items con proveedores específicos
            if (orden.proveedor_id && (!orden.items || orden.items.length === 0)) {
                itemsPorProveedor.set(orden.proveedor_id, {
                    proveedorId: orden.proveedor_id,
                    proveedorNombre: orden.proveedor_nombre,
                    items: [],
                    montoItems: parseFloat(montoAdelanto)
                });
            } else {
                // Agrupar items por proveedor sugerido
                if (orden.items && orden.items.length > 0) {
                    for (const item of orden.items) {
                        const provId = item.proveedor_sugerido_id || orden.proveedor_id;
                        const provNombre = item.proveedor_sugerido_nombre || orden.proveedor_nombre;
                        
                        if (!provId) {
                            console.warn(`⚠️ [PAGOS] Item ${item.bien_nombre} sin proveedor - se omitirá`);
                            continue;
                        }

                        if (!itemsPorProveedor.has(provId)) {
                            itemsPorProveedor.set(provId, {
                                proveedorId: provId,
                                proveedorNombre: provNombre,
                                items: [],
                                montoItems: 0
                            });
                        }

                        const grupoProveedor = itemsPorProveedor.get(provId);
                        grupoProveedor.items.push(item);
                        
                        // Obtener precio del proveedor para ese bien (igual que en registrarPagoPorRecepcion)
                        try {
                            const precioInfo = await bienProveedorRepository.obtenerPrecioProveedorBien(
                                item.bien_id,
                                provId
                            );
                            
                            if (precioInfo && precioInfo.precio) {
                                const precioUnitario = parseFloat(precioInfo.precio);
                                const montoItem = precioUnitario * parseFloat(item.cantidad);
                                grupoProveedor.montoItems += montoItem;
                                console.log(`💰 [PAGOS] Item "${item.bien_nombre}": ${item.cantidad} × $${precioUnitario.toFixed(2)} = $${montoItem.toFixed(2)}`);
                            } else {
                                console.warn(`⚠️ [PAGOS] Item "${item.bien_nombre}" - No hay precio configurado para el proveedor`);
                            }
                        } catch (error) {
                            console.warn(`⚠️ [PAGOS] Error al obtener precio para "${item.bien_nombre}":`, error.message);
                        }
                    }
                }
            }

            // Validar que tengamos al menos un proveedor
            if (itemsPorProveedor.size === 0) {
                throw new Error('La orden no tiene proveedores asignados. Asigne un proveedor a la orden o a sus items para registrar el adelanto.');
            }

            console.log(`✓ [PAGOS] Identificados ${itemsPorProveedor.size} proveedor(es) en la orden`);
            
            // Mostrar resumen por proveedor
            for (const [provId, grupo] of itemsPorProveedor.entries()) {
                console.log(`📊 [PAGOS] Proveedor ${grupo.proveedorNombre}: Total items = $${grupo.montoItems.toFixed(2)} (${grupo.items.length} items)`);
            }

            // Calcular el total real de la orden basado en items
            const totalRealOrden = Array.from(itemsPorProveedor.values())
                .reduce((sum, grupo) => sum + grupo.montoItems, 0);
            
            console.log(`📊 [PAGOS] Total real de la orden calculado: $${totalRealOrden.toFixed(2)}`);
            
            // Si el total calculado es 0, distribuir el adelanto equitativamente
            if (totalRealOrden === 0) {
                console.warn(`⚠️ [PAGOS] Total calculado es $0. Los items no tienen precio_unitario. Distribuyendo adelanto equitativamente`);
                
                // Distribuir el adelanto equitativamente entre proveedores para cálculo proporcional
                const montoPorProveedor = parseFloat(montoAdelanto) / itemsPorProveedor.size;
                for (const grupo of itemsPorProveedor.values()) {
                    grupo.montoItems = montoPorProveedor;
                }
            }

            const adelantosRegistrados = [];

            // Recalcular total después del ajuste
            const totalFinalOrden = Array.from(itemsPorProveedor.values())
                .reduce((sum, grupo) => sum + grupo.montoItems, 0);

            // Registrar un adelanto para cada proveedor
            for (const [proveedorId, grupo] of itemsPorProveedor.entries()) {
                // Calcular adelanto proporcional para este proveedor basado en el valor de sus items
                const montoAdelantoProveedor = totalFinalOrden > 0
                    ? (grupo.montoItems / totalFinalOrden) * parseFloat(montoAdelanto)
                    : parseFloat(montoAdelanto) / itemsPorProveedor.size;

                console.log(`📝 [PAGOS] Registrando adelanto para ${grupo.proveedorNombre}:`, {
                    montoItems: `$${grupo.montoItems.toFixed(2)}`,
                    adelanto: `$${montoAdelantoProveedor.toFixed(2)}`,
                    items: grupo.items.length
                });

                const pagoRegistrado = await pagoRepository.registrarAdelanto({
                    ordenCompraId: ordenId,
                    proveedorId: grupo.proveedorId,
                    montoAdelanto: montoAdelantoProveedor,
                    fechaPago: fechaPago,
                    registradoPor: username,
                    observaciones: `Adelanto para orden ${orden.codigo} - Proveedor: ${grupo.proveedorNombre} (${grupo.items.length} item(s), Total items: $${grupo.montoItems.toFixed(2)}) - Contrafactura`
                });

                adelantosRegistrados.push({
                    pagoId: pagoRegistrado.id,
                    proveedorNombre: grupo.proveedorNombre,
                    montoAdelanto: montoAdelantoProveedor,
                    montoItemsProveedor: grupo.montoItems,
                    cantidadItems: grupo.items.length
                });

                console.log(`💾 [PAGOS] Adelanto registrado con ID ${pagoRegistrado.id} para ${grupo.proveedorNombre}`);
            }

            console.log(`✅ [PAGOS] ${adelantosRegistrados.length} adelanto(s) registrado(s) exitosamente`);

            return {
                success: true,
                message: itemsPorProveedor.size === 1
                    ? `✓ Adelanto registrado: $${montoAdelanto} para la fecha ${fechaPago}`
                    : `✓ ${adelantosRegistrados.length} adelantos registrados para ${itemsPorProveedor.size} proveedores - Total: $${montoAdelanto}`,
                data: {
                    ordenCodigo: orden.codigo,
                    totalAdelantos: adelantosRegistrados.length,
                    montoTotal: parseFloat(montoAdelanto),
                    fechaPago: fechaPago,
                    adelantos: adelantosRegistrados
                }
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

            // Agrupar items por proveedor para crear pagos separados
            const itemsPorProveedor = new Map();
            
            // Si la orden tiene un proveedor principal y no hay items con proveedores específicos
            if (orden.proveedor_id && (!orden.items || orden.items.length === 0)) {
                itemsPorProveedor.set(orden.proveedor_id, {
                    proveedorId: orden.proveedor_id,
                    proveedorNombre: orden.proveedor_nombre,
                    items: [],
                    montoItems: parseFloat(montoTotal) // Usar el monto total del parámetro
                });
            } else {
                // Agrupar items por proveedor sugerido
                if (orden.items && orden.items.length > 0) {
                    for (const item of orden.items) {
                        const provId = item.proveedor_sugerido_id || orden.proveedor_id;
                        const provNombre = item.proveedor_sugerido_nombre || orden.proveedor_nombre;
                        
                        if (!provId) {
                            console.warn(`⚠️ [PAGOS] Item ${item.bien_nombre} sin proveedor - se omitirá`);
                            continue;
                        }

                        if (!itemsPorProveedor.has(provId)) {
                            itemsPorProveedor.set(provId, {
                                proveedorId: provId,
                                proveedorNombre: provNombre,
                                items: [],
                                montoItems: 0
                            });
                        }

                        const grupoProveedor = itemsPorProveedor.get(provId);
                        grupoProveedor.items.push(item);
                        
                        // Obtener precio del proveedor para ese bien (igual que en registrarPagoPorRecepcion)
                        try {
                            const precioInfo = await bienProveedorRepository.obtenerPrecioProveedorBien(
                                item.bien_id,
                                provId
                            );
                            
                            if (precioInfo && precioInfo.precio) {
                                const precioUnitario = parseFloat(precioInfo.precio);
                                const montoItem = precioUnitario * parseFloat(item.cantidad);
                                grupoProveedor.montoItems += montoItem;
                                console.log(`💰 [PAGOS] Item "${item.bien_nombre}": ${item.cantidad} × $${precioUnitario.toFixed(2)} = $${montoItem.toFixed(2)}`);
                            } else {
                                console.warn(`⚠️ [PAGOS] Item "${item.bien_nombre}" - No hay precio configurado para el proveedor`);
                            }
                        } catch (error) {
                            console.warn(`⚠️ [PAGOS] Error al obtener precio para "${item.bien_nombre}":`, error.message);
                        }
                    }
                }
            }

            // Validar que tengamos al menos un proveedor
            if (itemsPorProveedor.size === 0) {
                throw new Error('La orden no tiene proveedores asignados. Asigne un proveedor a la orden o a sus items para registrar el pago.');
            }

            console.log(`✓ [PAGOS] Identificados ${itemsPorProveedor.size} proveedor(es) en la orden`);
            
            // Mostrar resumen por proveedor
            for (const [provId, grupo] of itemsPorProveedor.entries()) {
                console.log(`📊 [PAGOS] Proveedor ${grupo.proveedorNombre}: Total items = $${grupo.montoItems.toFixed(2)} (${grupo.items.length} items)`);
            }

            // Calcular el total real de la orden basado en items
            const totalRealOrden = Array.from(itemsPorProveedor.values())
                .reduce((sum, grupo) => sum + grupo.montoItems, 0);
            
            console.log(`📊 [PAGOS] Total real de la orden calculado: $${totalRealOrden.toFixed(2)}`);
            
            // Si el total calculado es 0 o muy diferente al declarado, usar distribución manual
            if (totalRealOrden === 0) {
                console.warn(`⚠️ [PAGOS] Total calculado es $0. Los items no tienen precio_unitario. Usando monto total declarado ($${montoTotal})`);
                
                // Distribuir el monto total equitativamente entre proveedores
                const montoPorProveedor = parseFloat(montoTotal) / itemsPorProveedor.size;
                for (const grupo of itemsPorProveedor.values()) {
                    grupo.montoItems = montoPorProveedor;
                }
            }

            const pagosRegistrados = [];

            // Recalcular total después del ajuste
            const totalFinalOrden = Array.from(itemsPorProveedor.values())
                .reduce((sum, grupo) => sum + grupo.montoItems, 0);

            // Registrar un pago para cada proveedor
            for (const [proveedorId, grupo] of itemsPorProveedor.entries()) {
                // Calcular montos reales para este proveedor basados en sus items
                const montoTotalProveedor = grupo.montoItems;
                
                // Calcular adelanto proporcional para este proveedor
                const montoAdelantoProveedor = totalFinalOrden > 0 
                    ? (montoTotalProveedor / totalFinalOrden) * parseFloat(montoAdelanto)
                    : 0;
                
                // Calcular saldo a pagar para este proveedor
                const montoPagoProveedor = montoTotalProveedor - montoAdelantoProveedor;

                console.log(`📝 [PAGOS] Registrando pago para ${grupo.proveedorNombre}:`, {
                    montoTotal: `$${montoTotalProveedor.toFixed(2)}`,
                    montoAdelanto: `$${montoAdelantoProveedor.toFixed(2)}`,
                    saldo: `$${montoPagoProveedor.toFixed(2)}`,
                    items: grupo.items.length
                });

                const pagoRegistrado = await pagoRepository.registrarPagoSaldoCompleto({
                    ordenCompraId: ordenId,
                    proveedorId: grupo.proveedorId,
                    montoTotal: montoTotalProveedor,
                    montoAdelanto: montoAdelantoProveedor,
                    saldoAPagar: montoPagoProveedor,
                    fechaPago: fechaPago,
                    registradoPor: username,
                    observaciones: `Pago para orden ${orden.codigo} - Proveedor: ${grupo.proveedorNombre} (${grupo.items.length} item(s)) - Contrafactura`
                });

                pagosRegistrados.push({
                    pagoId: pagoRegistrado.id,
                    proveedorNombre: grupo.proveedorNombre,
                    montoTotal: montoTotalProveedor,
                    montoAdelanto: montoAdelantoProveedor,
                    saldoAPagar: montoPagoProveedor,
                    cantidadItems: grupo.items.length
                });

                console.log(`💾 [PAGOS] Pago registrado con ID ${pagoRegistrado.id} para ${grupo.proveedorNombre}`);
            }

            console.log(`✅ [PAGOS] ${pagosRegistrados.length} pago(s) registrado(s) exitosamente`);

            // Calcular totales para el mensaje
            const totalPagado = pagosRegistrados.reduce((sum, p) => sum + p.saldoAPagar, 0);
            
            return {
                success: true,
                message: itemsPorProveedor.size === 1 
                    ? `✓ Pago registrado: Total $${montoTotal} (Adelanto: $${montoAdelanto}, Saldo: $${saldoAPagar.toFixed(2)})`
                    : `✓ ${pagosRegistrados.length} pagos registrados para ${itemsPorProveedor.size} proveedores - Total saldo: $${totalPagado.toFixed(2)}`,
                data: {
                    ordenCodigo: orden.codigo,
                    totalPagos: pagosRegistrados.length,
                    montoTotal: parseFloat(montoTotal),
                    montoAdelanto: parseFloat(montoAdelanto),
                    saldoAPagar: saldoAPagar,
                    fechaPago: fechaPago,
                    pagos: pagosRegistrados
                }
            };

        } catch (error) {
            console.error('❌ [PAGOS] Error en registrarPagoSaldoCompleto:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los pagos de una orden de compra
     * @param {number} ordenId - ID de la orden de compra
     * @returns {Promise<Array>} - Lista de pagos
     */
    async obtenerPagosPorOrden(ordenId) {
        try {
            console.log('📋 [PAGOS] Consultando pagos de orden:', ordenId);
            
            const pagos = await pagoRepository.obtenerPagosPorOrden(ordenId);
            
            console.log(`✓ [PAGOS] Encontrados ${pagos.length} pagos`);
            
            return pagos;
        } catch (error) {
            console.error('❌ [PAGOS] Error en obtenerPagosPorOrden:', error);
            throw error;
        }
    }

    /**
     * Obtener resumen de pagos para una fecha específica
     * @param {string} fechaInicio - Fecha inicial
     * @param {string} fechaFin - Fecha final
     * @returns {Promise<Array>} - Resumen de pagos
     */
    async obtenerResumenPorFecha(fechaInicio, fechaFin) {
        try {
            console.log('📊 [PAGOS] Generando resumen:', { fechaInicio, fechaFin });
            
            const resumen = await pagoRepository.obtenerResumenPorFecha(fechaInicio, fechaFin);
            
            console.log(`✓ [PAGOS] Resumen generado con ${resumen.length} registros`);
            
            return resumen;
        } catch (error) {
            console.error('❌ [PAGOS] Error en obtenerResumenPorFecha:', error);
            throw error;
        }
    }

    /**
     * Obtener total de adelantos para una orden
     * @param {number} ordenId - ID de la orden de compra
     * @returns {Promise<number>} - Total de adelantos
     */
    async obtenerTotalAdelantos(ordenId) {
        try {
            const total = await pagoRepository.obtenerTotalAdelantos(ordenId);
            return total;
        } catch (error) {
            console.error('❌ [PAGOS] Error en obtenerTotalAdelantos:', error);
            throw error;
        }
    }
}

module.exports = new PagosService();