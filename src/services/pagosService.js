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
                console.log('💱 [PAGOS] Precio proveedor recibido:', {
                    bienId: itemInfo.bien_id,
                    proveedorId: itemInfo.proveedor_sugerido_id,
                    precio: precioInfo && precioInfo.precio,
                    moneda: precioInfo && precioInfo.moneda
                });
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
            console.log('💾 [PAGOS] Registrando pago recepción con moneda:', precioInfo && precioInfo.moneda);
            const pagoRegistrado = await pagoRepository.registrarPagoRecepcion({
                ordenCompraId: ordenId,
                bienId: itemInfo.bien_id,
                proveedorId: itemInfo.proveedor_sugerido_id,
                cantidadRecibida: cantidadRecibida,
                precioUnitario: precioUnitario,
                montoPago: montoTotal,
                fechaPago: fechaPago,
                registradoPor: username,
                observaciones: `Pago por recepción de ${cantidadRecibida} unidades de "${itemInfo.bien_nombre}"`,
                moneda: precioInfo.moneda || 'ARS'
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
                    montoItems: parseFloat(montoAdelanto),
                    moneda: null
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
                                montoItems: 0,
                                moneda: null
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
                            console.log('💱 [PAGOS] Adelanto - precio proveedor:', {
                                bienId: item.bien_id,
                                proveedorId: provId,
                                precio: precioInfo && precioInfo.precio,
                                moneda: precioInfo && precioInfo.moneda
                            });
                            
                            if (precioInfo && precioInfo.precio) {
                                const precioUnitario = parseFloat(precioInfo.precio);
                                const montoItem = precioUnitario * parseFloat(item.cantidad);
                                grupoProveedor.montoItems += montoItem;
                                // guardar moneda del bien-proveedor
                                if (precioInfo.moneda && !grupoProveedor.moneda) {
                                    grupoProveedor.moneda = precioInfo.moneda;
                                }
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

                const monedaProveedor = grupo.moneda || 'ARS';
                console.log('💾 [PAGOS] Registrando adelanto por proveedor:', {
                    proveedorId: grupo.proveedorId,
                    proveedorNombre: grupo.proveedorNombre,
                    montoAdelanto: montoAdelantoProveedor,
                    moneda: monedaProveedor
                });
                const pagoRegistrado = await pagoRepository.registrarAdelanto({
                    ordenCompraId: ordenId,
                    proveedorId: grupo.proveedorId,
                    montoAdelanto: montoAdelantoProveedor,
                    fechaPago: fechaPago,
                    registradoPor: username,
                    observaciones: `Adelanto para orden ${orden.codigo} - Proveedor: ${grupo.proveedorNombre} (${grupo.items.length} item(s), Total items: $${grupo.montoItems.toFixed(2)}) - Contrafactura`,
                    moneda: monedaProveedor
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
                    montoItems: parseFloat(montoTotal),
                    moneda: null
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
                                montoItems: 0,
                                moneda: null
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
                            console.log('💱 [PAGOS] Saldo completo - precio proveedor:', {
                                bienId: item.bien_id,
                                proveedorId: provId,
                                precio: precioInfo && precioInfo.precio,
                                moneda: precioInfo && precioInfo.moneda
                            });
                            if (precioInfo && precioInfo.precio) {
                                const precioUnitario = parseFloat(precioInfo.precio);
                                const montoItem = precioUnitario * parseFloat(item.cantidad);
                                grupoProveedor.montoItems += montoItem;
                                if (precioInfo.moneda && !grupoProveedor.moneda) {
                                    grupoProveedor.moneda = precioInfo.moneda;
                                }
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

                const monedaProveedor = grupo.moneda || 'ARS';
                console.log('💾 [PAGOS] Registrando saldo completo por proveedor:', {
                    proveedorId: grupo.proveedorId,
                    proveedorNombre: grupo.proveedorNombre,
                    montoTotalProveedor,
                    montoAdelantoProveedor,
                    montoPagoProveedor,
                    moneda: monedaProveedor
                });
                const pagoRegistrado = await pagoRepository.registrarPagoSaldoCompleto({
                    ordenCompraId: ordenId,
                    proveedorId: grupo.proveedorId,
                    montoTotal: montoTotalProveedor,
                    montoAdelanto: montoAdelantoProveedor,
                    saldoAPagar: montoPagoProveedor,
                    fechaPago: fechaPago,
                    registradoPor: username,
                    observaciones: `Pago para orden ${orden.codigo} - Proveedor: ${grupo.proveedorNombre} (${grupo.items.length} item(s)) - Contrafactura`,
                    moneda: monedaProveedor
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
     * Registrar una cuota de pago para una orden de compra a contrafactura
     * @param {Object} cuotaData - Datos de la cuota
     * @param {number} cuotaData.ordenId - ID de la orden de compra
     * @param {number} cuotaData.numeroCuota - Número de la cuota
     * @param {number} cuotaData.monto - Monto de la cuota
     * @param {string} cuotaData.fechaPago - Fecha de pago de la cuota
     * @param {string} cuotaData.observaciones - Observaciones de la cuota
     * @param {string} cuotaData.username - Usuario que registra
     * @returns {Promise<Object>} - Resultado del registro
     */
    async registrarCuotaOrdenCompra(cuotaData) {
        try {
            const { ordenId, numeroCuota, monto, fechaPago, observaciones, username } = cuotaData;

            console.log('💰 [PAGOS] Registrando cuota de orden de compra:', { 
                ordenId, 
                numeroCuota,
                monto, 
                fechaPago, 
                usuario: username 
            });

            // Validar datos
            if (!ordenId || !numeroCuota || !monto || !fechaPago) {
                throw new Error('Faltan datos requeridos para registrar la cuota');
            }

            if (monto <= 0) {
                throw new Error('El monto de la cuota debe ser mayor a 0');
            }

            // Obtener información de la orden
            const orden = await ordenCompraRepository.obtenerPorId(ordenId);
            if (!orden) {
                throw new Error('Orden de compra no encontrada');
            }

            // Verificar que sea contrafactura
            if (!orden.contrafactura) {
                throw new Error('Solo se pueden registrar cuotas para órdenes a contrafactura');
            }

            // Agrupar items por proveedor para crear cuotas separadas
            const itemsPorProveedor = new Map();
            
            // Si la orden tiene un proveedor principal y no hay items con proveedores específicos
            if (orden.proveedor_id && (!orden.items || orden.items.length === 0)) {
                itemsPorProveedor.set(orden.proveedor_id, {
                    proveedorId: orden.proveedor_id,
                    proveedorNombre: orden.proveedor_nombre,
                    items: [],
                    montoItems: parseFloat(monto),
                    moneda: null
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
                                montoItems: 0,
                                moneda: null
                            });
                        }
                        const grupoProveedor = itemsPorProveedor.get(provId);
                        grupoProveedor.items.push(item);
                        try {
                            const precioInfo = await bienProveedorRepository.obtenerPrecioProveedorBien(
                                item.bien_id,
                                provId
                            );
                            console.log('💱 [PAGOS] Cuota - precio proveedor:', {
                                bienId: item.bien_id,
                                proveedorId: provId,
                                precio: precioInfo && precioInfo.precio,
                                moneda: precioInfo && precioInfo.moneda
                            });
                            if (precioInfo && precioInfo.precio) {
                                const precioUnitario = parseFloat(precioInfo.precio);
                                const montoItem = precioUnitario * parseFloat(item.cantidad);
                                grupoProveedor.montoItems += montoItem;
                                if (precioInfo.moneda && !grupoProveedor.moneda) {
                                    grupoProveedor.moneda = precioInfo.moneda;
                                }
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
                throw new Error('La orden no tiene proveedores asignados. Asigne un proveedor a la orden o a sus items para registrar la cuota.');
            }

            console.log(`✓ [PAGOS] Identificados ${itemsPorProveedor.size} proveedor(es) en la orden`);

            // Calcular el total real de la orden basado en items
            const totalRealOrden = Array.from(itemsPorProveedor.values())
                .reduce((sum, grupo) => sum + grupo.montoItems, 0);
            
            // Si el total calculado es 0, distribuir el monto equitativamente
            if (totalRealOrden === 0) {
                console.warn(`⚠️ [PAGOS] Total calculado es $0. Distribuyendo cuota equitativamente`);
                const montoPorProveedor = parseFloat(monto) / itemsPorProveedor.size;
                for (const grupo of itemsPorProveedor.values()) {
                    grupo.montoItems = montoPorProveedor;
                }
            }

            const cuotasRegistradas = [];

            // Recalcular total después del ajuste
            const totalFinalOrden = Array.from(itemsPorProveedor.values())
                .reduce((sum, grupo) => sum + grupo.montoItems, 0);

            // Registrar una cuota para cada proveedor
            for (const [proveedorId, grupo] of itemsPorProveedor.entries()) {
                // Calcular cuota proporcional para este proveedor basado en el valor de sus items
                const montoCuotaProveedor = totalFinalOrden > 0
                    ? (grupo.montoItems / totalFinalOrden) * parseFloat(monto)
                    : parseFloat(monto) / itemsPorProveedor.size;

                console.log(`📝 [PAGOS] Registrando cuota ${numeroCuota} para ${grupo.proveedorNombre}:`, {
                    montoItems: `$${grupo.montoItems.toFixed(2)}`,
                    cuota: `$${montoCuotaProveedor.toFixed(2)}`
                });

                const monedaProveedor = grupo.moneda || 'ARS';
                console.log(`💾 [PAGOS] Registrando cuota ${numeroCuota} con moneda:`, {
                    proveedorId: grupo.proveedorId,
                    proveedorNombre: grupo.proveedorNombre,
                    montoCuotaProveedor,
                    moneda: monedaProveedor
                });
                const pagoRegistrado = await pagoRepository.registrarPagoSaldoCompleto({
                    ordenCompraId: ordenId,
                    proveedorId: grupo.proveedorId,
                    montoTotal: montoCuotaProveedor,
                    montoAdelanto: 0,
                    saldoAPagar: montoCuotaProveedor,
                    fechaPago: fechaPago,
                    registradoPor: username,
                    observaciones: observaciones || `Cuota ${numeroCuota} - ${grupo.proveedorNombre}`,
                    moneda: monedaProveedor
                });

                cuotasRegistradas.push({
                    pagoId: pagoRegistrado.id,
                    proveedorNombre: grupo.proveedorNombre,
                    montoCuota: montoCuotaProveedor
                });

                console.log(`💾 [PAGOS] Cuota ${numeroCuota} registrada con ID ${pagoRegistrado.id} para ${grupo.proveedorNombre}`);
            }

            console.log(`✅ [PAGOS] ${cuotasRegistradas.length} cuota(s) registrada(s) exitosamente`);

            return {
                success: true,
                message: `✓ Cuota ${numeroCuota} registrada: $${monto} para la fecha ${fechaPago}`,
                data: {
                    ordenCodigo: orden.codigo,
                    numeroCuota: numeroCuota,
                    totalCuotas: cuotasRegistradas.length,
                    montoTotal: parseFloat(monto),
                    fechaPago: fechaPago,
                    cuotas: cuotasRegistradas
                }
            };

        } catch (error) {
            console.error('❌ [PAGOS] Error en registrarCuotaOrdenCompra:', error);
            throw error;
        }
    }

    /**
     * Eliminar pagos de contrafactura para una orden de compra
     * @param {number} ordenId - ID de la orden de compra
     * @returns {Promise<Object>} - Resultado de la eliminación
     */
    async eliminarPagosContrafactura(ordenId) {
        try {
            console.log(`🗑️ [PAGOS] Eliminando pagos de contrafactura para orden ${ordenId}`);
            
            const resultado = await pagoRepository.eliminarPagosContrafactura(ordenId);
            
            console.log(`✅ [PAGOS] Pagos de contrafactura eliminados exitosamente`);
            
            return {
                success: true,
                message: 'Pagos de contrafactura eliminados exitosamente',
                data: resultado
            };
        } catch (error) {
            console.error('❌ [PAGOS] Error en eliminarPagosContrafactura:', error);
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

    /**
     * Actualizar o crear adelanto para una orden
     * Solo actualiza si los valores realmente cambiaron
     */
    async actualizarOCrearAdelanto(adelantoData) {
        try {
            const { ordenId, montoAdelanto, fechaPago, username } = adelantoData;

            console.log('🔄 [PAGOS] Verificando adelantos existentes para orden:', ordenId);

            // Obtener todos los pagos de contrafactura en una sola consulta (optimizado)
            const pagosExistentes = await pagoRepository.obtenerPagosContrafacturaPorOrden(ordenId);
            const adelantosExistentes = pagosExistentes.adelantos;

            // Si hay adelantos existentes, verificar si necesitan actualización
            if (adelantosExistentes && adelantosExistentes.length > 0) {
                console.log(`📋 [PAGOS] Encontrados ${adelantosExistentes.length} adelanto(s) existente(s)`);

                // Verificar si cambió el monto total o la fecha
                const montoTotalExistente = adelantosExistentes.reduce((sum, a) => sum + parseFloat(a.monto_pago), 0);
                const fechaExistente = adelantosExistentes[0].fecha_pago;
                
                const cambioMonto = Math.abs(montoTotalExistente - parseFloat(montoAdelanto)) > 0.01;
                const cambioFecha = fechaExistente !== fechaPago;

                if (!cambioMonto && !cambioFecha) {
                    console.log('✓ [PAGOS] Adelantos sin cambios - No se requiere actualización');
                    return {
                        success: true,
                        message: 'Adelantos sin cambios',
                        updated: false
                    };
                }

                console.log('🔄 [PAGOS] Detectados cambios en adelantos');
            }

            // Registrar nuevo adelanto (la eliminación se hace una sola vez en actualizarPagosContrafactura)
            console.log('📝 [PAGOS] Preparando nuevo adelanto');
            const result = await this.registrarAdelanto(adelantoData);
            
            return {
                ...result,
                updated: true,
                shouldDelete: adelantosExistentes && adelantosExistentes.length > 0
            };
        } catch (error) {
            console.error('❌ [PAGOS] Error en actualizarOCrearAdelanto:', error);
            throw error;
        }
    }

    /**
     * Actualizar o crear pago de saldo completo para una orden
     * Solo actualiza si los valores realmente cambiaron
     */
    async actualizarOCrearSaldoCompleto(pagoData) {
        try {
            const { ordenId, montoTotal, montoAdelanto, fechaPago, username } = pagoData;

            console.log('🔄 [PAGOS] Verificando saldos completos existentes para orden:', ordenId);

            // Obtener todos los pagos de contrafactura en una sola consulta (optimizado)
            const pagosExistentes = await pagoRepository.obtenerPagosContrafacturaPorOrden(ordenId);
            const saldosExistentes = pagosExistentes.saldos;

            // Si hay saldos existentes, verificar si necesitan actualización
            if (saldosExistentes && saldosExistentes.length > 0) {
                console.log(`📋 [PAGOS] Encontrados ${saldosExistentes.length} saldo(s) completo(s) existente(s)`);

                // Sumar todos los montos totales y adelantos
                const montoTotalExistente = saldosExistentes.reduce((sum, s) => sum + parseFloat(s.monto_total || 0), 0);
                const montoAdelantoExistente = saldosExistentes.reduce((sum, s) => sum + parseFloat(s.monto_adelanto || 0), 0);
                const fechaExistente = saldosExistentes[0].fecha_pago;

                const cambioMontoTotal = Math.abs(montoTotalExistente - parseFloat(montoTotal)) > 0.01;
                const cambioMontoAdelanto = Math.abs(montoAdelantoExistente - parseFloat(montoAdelanto)) > 0.01;
                const cambioFecha = fechaExistente !== fechaPago;

                if (!cambioMontoTotal && !cambioMontoAdelanto && !cambioFecha) {
                    console.log('✓ [PAGOS] Saldos completos sin cambios - No se requiere actualización');
                    return {
                        success: true,
                        message: 'Saldos completos sin cambios',
                        updated: false
                    };
                }

                console.log('🔄 [PAGOS] Detectados cambios en saldos completos');
            }

            // Registrar nuevo saldo completo (la eliminación se hace una sola vez en actualizarPagosContrafactura)
            console.log('📝 [PAGOS] Preparando nuevo saldo completo');
            const result = await this.registrarPagoSaldoCompleto(pagoData);
            
            return {
                ...result,
                updated: true,
                shouldDelete: saldosExistentes && saldosExistentes.length > 0
            };
        } catch (error) {
            console.error('❌ [PAGOS] Error en actualizarOCrearSaldoCompleto:', error);
            throw error;
        }
    }

    /**
     * Actualizar pagos de contrafactura (adelanto + saldo completo) de forma optimizada
     * Hace una sola consulta de verificación y una sola eliminación si es necesario
     */
    async actualizarPagosContrafactura(ordenId, montoTotal, montoAdelanto, fechaPago, fechaAdelanto, username) {
        try {
            console.log('🔄 [PAGOS] Verificando pagos de contrafactura para orden:', ordenId);

            // Una sola consulta para obtener todos los pagos de contrafactura
            const pagosExistentes = await pagoRepository.obtenerPagosContrafacturaPorOrden(ordenId);
            
            let necesitaActualizacion = false;

            // Normalizar la fecha para comparación (convertir Date a string YYYY-MM-DD)
            const normalizarFecha = (fecha) => {
                if (!fecha) return null;
                if (typeof fecha === 'string') return fecha.split(' ')[0]; // Por si viene con hora
                if (fecha instanceof Date) {
                    return fecha.toISOString().split('T')[0];
                }
                return null;
            };

            const fechaPagoNormalizada = normalizarFecha(fechaPago);
            const fechaAdelantoNormalizada = normalizarFecha(fechaAdelanto || fechaPago);
            console.log('📅 [PAGOS] Fechas a usar:', {
                fechaSaldo: fechaPagoNormalizada,
                fechaAdelanto: fechaAdelantoNormalizada
            });

            // Verificar adelantos
            let cambioEnAdelantos = false;
            if (montoAdelanto && parseFloat(montoAdelanto) > 0) {
                if (pagosExistentes.adelantos.length > 0) {
                    const montoAdelantoExistente = pagosExistentes.adelantos.reduce((sum, a) => sum + parseFloat(a.monto_pago), 0);
                    const fechaAdelantoExistente = normalizarFecha(pagosExistentes.adelantos[0].fecha_pago);
                    
                    console.log('💰 [PAGOS] Adelanto existente:', {
                        monto: montoAdelantoExistente,
                        fecha: fechaAdelantoExistente,
                        registros: pagosExistentes.adelantos.length
                    });
                    console.log('💰 [PAGOS] Adelanto nuevo:', {
                        monto: parseFloat(montoAdelanto),
                        fecha: fechaAdelantoNormalizada
                    });

                    const diferenciaMonto = Math.abs(montoAdelantoExistente - parseFloat(montoAdelanto));
                    const cambioFecha = fechaAdelantoExistente !== fechaAdelantoNormalizada;
                    
                    console.log('🔍 [PAGOS] Comparación adelantos:', {
                        diferenciaMonto: diferenciaMonto.toFixed(2),
                        cambioFecha: cambioFecha,
                        tolerancia: 0.01
                    });

                    if (diferenciaMonto > 0.01 || cambioFecha) {
                        console.log('⚠️ [PAGOS] Detectado cambio en adelantos');
                        cambioEnAdelantos = true;
                        necesitaActualizacion = true;
                    } else {
                        console.log('✓ [PAGOS] Adelantos sin cambios');
                    }
                } else {
                    console.log('📝 [PAGOS] No hay adelantos existentes - se crearán nuevos');
                    cambioEnAdelantos = true;
                    necesitaActualizacion = true;
                }
            } else {
                // Si no hay monto de adelanto pero existen adelantos, hay que eliminarlos
                if (pagosExistentes.adelantos.length > 0) {
                    console.log('🗑️ [PAGOS] Monto de adelanto es 0 pero existen adelantos - se eliminarán');
                    necesitaActualizacion = true;
                }
            }

            // Verificar saldos completos
            let cambioEnSaldos = false;
            if (pagosExistentes.saldos.length > 0) {
                const montoTotalExistente = pagosExistentes.saldos.reduce((sum, s) => sum + parseFloat(s.monto_total || 0), 0);
                const montoAdelantoExistenteEnSaldo = pagosExistentes.saldos.reduce((sum, s) => sum + parseFloat(s.monto_adelanto || 0), 0);
                const fechaSaldoExistente = normalizarFecha(pagosExistentes.saldos[0].fecha_pago);

                console.log('💰 [PAGOS] Saldo existente:', {
                    montoTotal: montoTotalExistente,
                    montoAdelanto: montoAdelantoExistenteEnSaldo,
                    fecha: fechaSaldoExistente,
                    registros: pagosExistentes.saldos.length
                });
                console.log('💰 [PAGOS] Saldo nuevo:', {
                    montoTotal: parseFloat(montoTotal),
                    montoAdelanto: parseFloat(montoAdelanto || 0),
                    fecha: fechaPagoNormalizada
                });

                const diferenciaMontoTotal = Math.abs(montoTotalExistente - parseFloat(montoTotal));
                const diferenciaMontoAdelanto = Math.abs(montoAdelantoExistenteEnSaldo - parseFloat(montoAdelanto || 0));
                const cambioFecha = fechaSaldoExistente !== fechaPagoNormalizada;

                console.log('🔍 [PAGOS] Comparación saldos:', {
                    diferenciaMontoTotal: diferenciaMontoTotal.toFixed(2),
                    diferenciaMontoAdelanto: diferenciaMontoAdelanto.toFixed(2),
                    cambioFecha: cambioFecha,
                    tolerancia: 0.01
                });

                if (diferenciaMontoTotal > 0.01 || diferenciaMontoAdelanto > 0.01 || cambioFecha) {
                    console.log('⚠️ [PAGOS] Detectado cambio en saldos completos');
                    cambioEnSaldos = true;
                    necesitaActualizacion = true;
                } else {
                    console.log('✓ [PAGOS] Saldos completos sin cambios');
                }
            } else {
                console.log('📝 [PAGOS] No hay saldos completos existentes - se crearán nuevos');
                cambioEnSaldos = true;
                necesitaActualizacion = true;
            }

            // Si no necesita actualización, retornar sin hacer nada
            if (!necesitaActualizacion) {
                console.log('✅ [PAGOS] Pagos de contrafactura sin cambios - No se requiere actualización');
                return {
                    success: true,
                    message: 'Pagos sin cambios',
                    updated: false
                };
            }

            // Si necesita actualización, eliminar todos los pagos de contrafactura una sola vez
            if (pagosExistentes.todos.length > 0) {
                console.log(`🗑️ [PAGOS] Eliminando ${pagosExistentes.todos.length} pago(s) antiguo(s) de contrafactura...`);
                await pagoRepository.eliminarPagosContrafactura(ordenId);
            }

            const results = [];

            // Registrar adelanto si corresponde, usando su fecha específica
            if (montoAdelanto && parseFloat(montoAdelanto) > 0) {
                console.log('📝 [PAGOS] Registrando adelanto...');
                const adelantoResult = await this.registrarAdelanto({
                    ordenId,
                    montoAdelanto,
                    fechaPago: fechaAdelantoNormalizada, // Usar fecha específica del adelanto
                    username
                });
                results.push(adelantoResult);
            }

            // Registrar saldo completo, usando su fecha específica
            console.log('📝 [PAGOS] Registrando saldo completo...');
            const saldoResult = await this.registrarPagoSaldoCompleto({
                ordenId,
                montoTotal,
                montoAdelanto: montoAdelanto || 0,
                fechaPago: fechaPagoNormalizada, // Usar fecha específica del saldo
                username
            });
            results.push(saldoResult);

            console.log('✅ [PAGOS] Pagos de contrafactura actualizados exitosamente');

            return {
                success: true,
                message: 'Pagos actualizados exitosamente',
                updated: true,
                results
            };
        } catch (error) {
            console.error('❌ [PAGOS] Error en actualizarPagosContrafactura:', error);
            throw error;
        }
    }

    /**
     * Refinanciar un pago existente
     * Crea nuevas cuotas con montos y fechas personalizadas y elimina el pago original
     */
    async refinanciarPago(pagoId, cuotas, username, observacionesGenerales = null) {
        try {
            console.log('🔄 [PAGOS] Iniciando refinanciación:', { 
                pagoId, 
                cantidadCuotas: cuotas.length, 
                usuario: username 
            });

            // 1. Obtener el pago original
            const pagoOriginal = await pagoRepository.obtenerPorId(pagoId);
            
            if (!pagoOriginal) {
                console.error('❌ [PAGOS] Pago no encontrado:', pagoId);
                return {
                    success: false,
                    message: 'Pago no encontrado'
                };
            }

            // 2. Validar que el pago no esté marcado como pagado
            if (pagoOriginal.pagado) {
                console.warn('⚠️ [PAGOS] Intento de refinanciar pago ya pagado:', pagoId);
                return {
                    success: false,
                    message: 'No se puede refinanciar un pago que ya fue marcado como pagado'
                };
            }

            // 3. Validar cantidad de cuotas
            if (!cuotas || cuotas.length < 1 || cuotas.length > 60) {
                console.error('❌ [PAGOS] Cantidad de cuotas inválida:', cuotas?.length);
                return {
                    success: false,
                    message: 'La cantidad de cuotas debe estar entre 1 y 60'
                };
            }

            // 4. Validar cada cuota
            for (let i = 0; i < cuotas.length; i++) {
                const cuota = cuotas[i];
                
                if (!cuota.fecha) {
                    console.error('❌ [PAGOS] Cuota sin fecha:', i + 1);
                    return {
                        success: false,
                        message: `La cuota ${i + 1} debe tener una fecha`
                    };
                }

                if (!cuota.monto || cuota.monto <= 0) {
                    console.error('❌ [PAGOS] Cuota con monto inválido:', i + 1);
                    return {
                        success: false,
                        message: `La cuota ${i + 1} debe tener un monto mayor a 0`
                    };
                }
            }

            // 5. Calcular totales
            const montoOriginal = parseFloat(pagoOriginal.monto_pago);
            const totalRefinanciado = cuotas.reduce((sum, c) => sum + parseFloat(c.monto), 0);
            const diferencia = totalRefinanciado - montoOriginal;

            // 6. Validar que el total no sea mayor al monto original
            if (diferencia > 0.01) {
                console.warn('⚠️ [PAGOS] Total refinanciado mayor al original:', {
                    original: montoOriginal,
                    refinanciado: totalRefinanciado,
                    diferencia
                });
                return {
                    success: false,
                    message: `El total refinanciado ($${totalRefinanciado.toFixed(2)}) no puede ser mayor al monto original ($${montoOriginal.toFixed(2)})`
                };
            }

            console.log('✓ [PAGOS] Validaciones exitosas:', {
                montoOriginal: `$${montoOriginal.toFixed(2)}`,
                totalRefinanciado: `$${totalRefinanciado.toFixed(2)}`,
                diferencia: `$${diferencia.toFixed(2)}`
            });

            // 7. Realizar la refinanciación en el repositorio (transacción)
            const resultado = await pagoRepository.refinanciarPagoVariable(
                pagoId,
                pagoOriginal,
                cuotas,
                username,
                observacionesGenerales
            );

            console.log('✅ [PAGOS] Refinanciación completada:', {
                pagoOriginalEliminado: resultado.pagoOriginalEliminado,
                cuotasCreadas: resultado.cuotasCreadas.length,
                totalRefinanciado: `$${resultado.totalRefinanciado.toFixed(2)}`
            });

            return {
                success: true,
                message: `Pago refinanciado exitosamente en ${cuotas.length} cuotas`,
                data: resultado
            };

        } catch (error) {
            console.error('❌ [PAGOS] Error en refinanciarPago:', error);
            throw error;
        }
    }
}

module.exports = new PagosService();