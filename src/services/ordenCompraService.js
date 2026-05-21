const ordenCompraRepository = require('../repositories/ordenCompraRepository');
const bienRepository = require('../repositories/bienRepository');
const pagosService = require('./pagosService');
const ajusteInventarioRepository = require('../repositories/ajusteInventarioRepository');
const userRepository = require('../repositories/userRepository');
const unidadMedidaRepository = require('../repositories/unidadMedidaRepository');
const centroCostoRepository = require('../repositories/centroCostoRepository');
const bienProveedorRepository = require('../repositories/bienProveedorRepository');
const db = require('../config/db');

class OrdenCompraService {
    /**
     * Generar código único para la orden de compra
     * Obtiene el siguiente número disponible de la BD
     * Formato: OC-XXX (mínimo 3 dígitos con ceros a la izquierda)
     */
    async generarSiguienteCodigo() {
        const siguienteNumero = await ordenCompraRepository.obtenerSiguienteNumeroOrden();
        return `OC-${siguienteNumero.toString().padStart(3, '0')}`;
    }

    /**
     * Validar estados permitidos
     */
    validarEstado(estado) {
        const estadosPermitidos = ['Abierta', 'Revision', 'Aprobada', 'En Proceso', 'Entregado', 'Cerrada'];
        return estadosPermitidos.includes(estado);
    }

    /**
     * Validar condiciones permitidas
     */
    validarCondicion(condicion) {
        const condicionesPermitidas = ['No Critica', 'Semi Critica', 'Muy Critica'];
        return condicionesPermitidas.includes(condicion);
    }

    /**
     * Normalizar cuotas recibidas (array o JSON string)
     */
    normalizarCuotas(cuotas) {
        if (!cuotas) return [];
        if (typeof cuotas === 'string') {
            return JSON.parse(cuotas);
        }
        return Array.isArray(cuotas) ? cuotas : [];
    }

    normalizarAdelantosPorMoneda(adelantos) {
        if (!adelantos) return [];

        let lista = adelantos;
        if (typeof lista === 'string') {
            lista = JSON.parse(lista);
        }

        if (!Array.isArray(lista)) return [];

        return lista
            .map((a) => ({
                moneda: String(a.moneda || '').trim().toUpperCase(),
                monto: parseFloat(a.monto),
                fecha: a.fecha || null
            }))
            .filter((a) => a.moneda && !Number.isNaN(a.monto) && a.monto > 0);
    }

    agruparMontosPorMoneda(registros = []) {
        return registros.reduce((acc, r) => {
            const moneda = String(r.moneda || '').trim().toUpperCase();
            const monto = parseFloat(r.monto) || 0;
            if (!moneda || monto <= 0) return acc;
            acc[moneda] = (acc[moneda] || 0) + monto;
            return acc;
        }, {});
    }

    async calcularMontosOrdenPorMoneda(items = [], logDetalle = false) {
        let montoTotal = 0;
        const monedasUtilizadas = new Set();
        const totalesPorMoneda = {};

        for (const item of items) {
            if (item.bien_id && item.proveedor_sugerido_id && item.cantidad) {
                try {
                    const precioInfo = await bienProveedorRepository.obtenerPrecioProveedorBien(
                        item.bien_id,
                        item.proveedor_sugerido_id
                    );

                    if (precioInfo && precioInfo.precio) {
                        const precio = parseFloat(precioInfo.precio);
                        const cantidad = parseFloat(item.cantidad);
                        const moneda = String(precioInfo.moneda || 'ARS').toUpperCase();
                        const subtotal = precio * cantidad;

                        montoTotal += subtotal;
                        monedasUtilizadas.add(moneda);
                        totalesPorMoneda[moneda] = (totalesPorMoneda[moneda] || 0) + subtotal;

                        if (logDetalle) {
                            console.log(`💰 Item ${item.bien_id}: ${cantidad} × ${moneda} ${precio} = ${moneda} ${subtotal.toFixed(2)}`);
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ No se pudo obtener precio para bien ${item.bien_id} con proveedor ${item.proveedor_sugerido_id}`);
                }
            }
        }

        return {
            montoTotal,
            monedasUtilizadas: Array.from(monedasUtilizadas),
            totalesPorMoneda
        };
    }

    /**
     * Calcular monto total de la orden en base a precios de proveedor por bien
     */
    async calcularMontoTotalOrden(items = [], logDetalle = false) {
        const resumen = await this.calcularMontosOrdenPorMoneda(items, logDetalle);
        return resumen.montoTotal;
    }

    /**
     * Crear una nueva orden de compra
     */
    async crearOrdenCompra(ordenData, usuario) {
        let connection;
        try {
            // Validaciones
            if (!ordenData.condicion || !this.validarCondicion(ordenData.condicion)) {
                throw new Error('La condición debe ser: No Critica, Semi Critica o Muy Critica');
            }

            // Validar items
            if (!ordenData.items || ordenData.items.length === 0) {
                throw new Error('La orden debe tener al menos un item');
            }

            // Validar que los bienes existan
            for (const item of ordenData.items) {
                if (!item.bien_id) {
                    throw new Error('Cada item debe tener un bien asociado');
                }
                
                const bien = await bienRepository.obtenerPorId(item.bien_id);
                if (!bien) {
                    throw new Error(`El bien con ID ${item.bien_id} no existe`);
                }

                if (!item.cantidad || item.cantidad <= 0) {
                    throw new Error('La cantidad debe ser mayor a 0');
                }
            }

            // Preparar datos de la orden
            // Generar código antes de crear la orden
            const codigoFinal = await this.generarSiguienteCodigo();
            
            const datosOrden = {
                codigo: codigoFinal, // Código ya generado con el siguiente número disponible
                estado: 'Abierta', // Siempre inicia en Abierta
                fecha_entrega_solicitada: ordenData.fecha_entrega_solicitada || null,
                fecha_entrega_proveedor: ordenData.fecha_entrega_proveedor || null,
                condicion: ordenData.condicion,
                asunto: ordenData.asunto || null,
                archivo_adjunto: ordenData.archivo_adjunto || null, // Legacy - un solo archivo
                archivos_adjuntos: ordenData.archivos_adjuntos || [], // Múltiples archivos
                proveedor_id: ordenData.proveedor_id || null,
                contrafactura: ordenData.contrafactura || false, // Campo contrafactura
                fecha_pago: ordenData.fecha_pago || null, // Fecha de pago (cuando es contrafactura)
                monto_adelanto: ordenData.monto_adelanto || null, // Monto de adelanto (cuando es contrafactura)
                moneda_adelanto: ordenData.moneda_adelanto || 'ARS', // Moneda del adelanto
                fecha_adelanto: ordenData.fecha_adelanto || null, // Fecha de la seña/adelanto
                creado_por: usuario
            };

            console.log('Crear Orden - Contrafactura recibida:', ordenData.contrafactura);
            console.log('Crear Orden - Contrafactura en datosOrden:', datosOrden.contrafactura);
            console.log('Crear Orden - Cuotas:', ordenData.cuotas);

            let cuotasNormalizadas = [];
            let adelantosPorMoneda = [];
            let montoTotalContrafactura = 0;

            // Si es contrafactura, validar los datos de pago ANTES de crear la orden
            if (ordenData.contrafactura && ordenData.cuotas && ordenData.cuotas.length > 0) {
                cuotasNormalizadas = this.normalizarCuotas(ordenData.cuotas);
                ordenData.cuotas = cuotasNormalizadas;

                adelantosPorMoneda = this.normalizarAdelantosPorMoneda(ordenData.adelantos_por_moneda);
                if (adelantosPorMoneda.length === 0 && ordenData.monto_adelanto && parseFloat(ordenData.monto_adelanto) > 0) {
                    adelantosPorMoneda = [{
                        moneda: String(ordenData.moneda_adelanto || 'ARS').toUpperCase(),
                        monto: parseFloat(ordenData.monto_adelanto),
                        fecha: ordenData.fecha_adelanto || null
                    }];
                }

                const resumenMonedas = await this.calcularMontosOrdenPorMoneda(ordenData.items, true);
                montoTotalContrafactura = resumenMonedas.montoTotal;
                const { totalesPorMoneda, monedasUtilizadas } = resumenMonedas;

                console.log(`💰 Monto total calculado: $${montoTotalContrafactura.toFixed(2)} | Monedas: ${monedasUtilizadas.join(', ')}`);

                if (montoTotalContrafactura <= 0) {
                    throw new Error('No se pudo calcular el monto total de la orden. Verifica que los items tengan proveedor sugerido y precios configurados.');
                }

                // Normalizar moneda en cuotas
                if (monedasUtilizadas.length === 1) {
                    const unica = monedasUtilizadas[0];
                    cuotasNormalizadas = cuotasNormalizadas.map(c => ({ ...c, moneda: String(c.moneda || unica).toUpperCase() }));
                } else {
                    cuotasNormalizadas = cuotasNormalizadas.map(c => ({ ...c, moneda: String(c.moneda || '').toUpperCase() }));
                    const sinMoneda = cuotasNormalizadas.find(c => !c.moneda);
                    if (sinMoneda) {
                        throw new Error('Cuando la orden tiene múltiples monedas, cada cuota debe indicar su moneda.');
                    }
                }

                const adelantoPorMoneda = this.agruparMontosPorMoneda(adelantosPorMoneda);
                const cuotasPorMoneda = this.agruparMontosPorMoneda(cuotasNormalizadas);

                // Validar adelantos por moneda
                for (const adelanto of adelantosPorMoneda) {
                    const totalMoneda = parseFloat(totalesPorMoneda[adelanto.moneda] || 0);
                    if (totalMoneda <= 0) {
                        throw new Error(`No hay items con moneda ${adelanto.moneda} para aplicar adelanto.`);
                    }
                    if (adelanto.monto > totalMoneda + 0.01) {
                        throw new Error(`El adelanto en ${adelanto.moneda} (${adelanto.monto.toFixed(2)}) no puede ser mayor al total de la moneda (${totalMoneda.toFixed(2)}).`);
                    }
                }

                // Validar cuotas por moneda vs disponible
                for (const [moneda, totalCuotasMoneda] of Object.entries(cuotasPorMoneda)) {
                    const totalMoneda = parseFloat(totalesPorMoneda[moneda] || 0);
                    const adelantoMoneda = parseFloat(adelantoPorMoneda[moneda] || 0);
                    const disponibleMoneda = totalMoneda - adelantoMoneda;

                    if (totalCuotasMoneda > disponibleMoneda + 0.01) {
                        throw new Error(
                            `El total de cuotas en ${moneda} (${totalCuotasMoneda.toFixed(2)}) no puede ser mayor al disponible (${disponibleMoneda.toFixed(2)}).`
                        );
                    }
                }

                const adelantoLegacy = adelantosPorMoneda[0] || null;
                datosOrden.monto_adelanto = adelantoLegacy ? adelantoLegacy.monto : null;
                datosOrden.moneda_adelanto = adelantoLegacy ? adelantoLegacy.moneda : 'ARS';
                datosOrden.fecha_adelanto = adelantoLegacy ? (adelantoLegacy.fecha || null) : null;
            }

            connection = await db.pool.getConnection();
            await connection.beginTransaction();

            // Crear la orden con sus items dentro de la transacción compartida
            const result = await ordenCompraRepository.crearOrdenCompra(datosOrden, ordenData.items, connection);
            
            // Actualizar el código en el resultado
            result.codigo = codigoFinal;

            // Si es contrafactura, registrar los pagos correspondientes (cuotas)
            if (ordenData.contrafactura && cuotasNormalizadas.length > 0) {
                console.log('📝 Procesando cuotas de pago...');
                console.log(`💰 Monto total calculado: $${montoTotalContrafactura.toFixed(2)}`);

                const ordenContext = {
                    id: result.id,
                    codigo: result.codigo,
                    contrafactura: true,
                    proveedor_id: datosOrden.proveedor_id || null,
                    proveedor_nombre: null,
                    items: ordenData.items || []
                };

                // Registrar adelantos por moneda
                for (const adelanto of adelantosPorMoneda) {
                    console.log(`📝 Registrando adelanto en ${adelanto.moneda}: ${adelanto.monto}`);
                    await pagosService.registrarAdelanto({
                        ordenId: result.id,
                        montoAdelanto: adelanto.monto,
                        fechaPago: adelanto.fecha || new Date().toISOString().split('T')[0],
                        username: usuario,
                        monedaObjetivo: adelanto.moneda,
                        ordenContext,
                        transactionConnection: connection
                    });
                }

                // Registrar cada cuota como un pago separado
                for (const cuota of cuotasNormalizadas) {
                    console.log(`📝 Registrando cuota ${cuota.numeroCuota}: ${cuota.moneda || 'ARS'} ${cuota.monto} - Fecha: ${cuota.fecha}`);
                    
                    await pagosService.registrarCuotaOrdenCompra({
                        ordenId: result.id,
                        numeroCuota: cuota.numeroCuota,
                        monto: cuota.monto,
                        fechaPago: cuota.fecha,
                        observaciones: cuota.observacion || `Cuota ${cuota.numeroCuota} de ${cuotasNormalizadas.length}`,
                        username: usuario,
                        monedaObjetivo: cuota.moneda,
                        ordenContext,
                        transactionConnection: connection
                    });
                }

                console.log(`✅ ${cuotasNormalizadas.length} cuota(s) registradas exitosamente`);
            }

            await connection.commit();

            return {
                success: true,
                message: 'Orden de compra creada exitosamente',
                data: result
            };
        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error('Error al hacer rollback en crearOrdenCompra:', rollbackError);
                }
            }
            console.error('Error en OrdenCompraService.crearOrdenCompra:', error);
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    /**
     * Modificar una orden de compra existente
     */
    async modificarOrdenCompra(id, ordenData, username) {
        let connection;
        try {
            console.log('🛠️ [ORDEN] Iniciando modificarOrdenCompra', { id, username });
            console.log('📥 [ORDEN] Datos recibidos para modificar (raw):', {
                contrafactura: ordenData && ordenData.contrafactura,
                monto_adelanto: ordenData && ordenData.monto_adelanto,
                fecha_adelanto: ordenData && ordenData.fecha_adelanto,
                cuotasType: ordenData && typeof ordenData.cuotas,
                cuotasLength: ordenData && ordenData.cuotas && ordenData.cuotas.length,
                cuotas: ordenData && ordenData.cuotas
            });

            // Obtener la orden actual
            const ordenActual = await ordenCompraRepository.obtenerPorId(id);
            if (!ordenActual) {
                throw new Error('La orden de compra no existe');
            }

            console.log('📦 [ORDEN] Orden actual obtenida:', {
                id: ordenActual.id,
                codigo: ordenActual.codigo,
                contrafactura: ordenActual.contrafactura,
                proveedor_id: ordenActual.proveedor_id
            });

            // Validaciones
            if (ordenData.estado && !this.validarEstado(ordenData.estado)) {
                throw new Error('Estado inválido');
            }

            if (ordenData.condicion && !this.validarCondicion(ordenData.condicion)) {
                throw new Error('La condición debe ser: No Critica, Semi Critica o Muy Critica');
            }

            // Normalizar cuotas si vienen como string JSON
            let cuotasNormalizadas = ordenData.cuotas;
            if (typeof cuotasNormalizadas === 'string') {
                try {
                    console.log('🔄 [ORDEN] Parseando cuotas desde string JSON');
                    cuotasNormalizadas = JSON.parse(cuotasNormalizadas);
                } catch (e) {
                    console.error('❌ [ORDEN] Error al parsear cuotas desde string:', e.message, 'valor:', ordenData.cuotas);
                    throw new Error('Formato de cuotas inválido (no es un JSON válido)');
                }
            }

            // Asegurar que siempre usemos la versión normalizada
            ordenData.cuotas = cuotasNormalizadas;
            const adelantosPorMoneda = this.normalizarAdelantosPorMoneda(ordenData.adelantos_por_moneda);

            // Validar cuotas si es contrafactura
            if (ordenData.contrafactura && ordenData.cuotas && ordenData.cuotas.length > 0) {
                console.log('🔍 [ORDEN] Validando cuotas para contrafactura. Cantidad de cuotas:', ordenData.cuotas.length);
                for (let i = 0; i < ordenData.cuotas.length; i++) {
                    const cuota = ordenData.cuotas[i];
                    console.log(`   ➤ Cuota index ${i}:`, cuota);
                    if (!cuota.fecha || !cuota.monto) {
                        console.warn(`⚠️ [ORDEN] Cuota inválida en posición ${i}`, cuota);
                        throw new Error(`La cuota ${i + 1} debe tener fecha y monto`);
                    }
                    const montoNum = parseFloat(cuota.monto);
                    if (isNaN(montoNum) || montoNum <= 0) {
                        console.warn(`⚠️ [ORDEN] Monto inválido en cuota ${i + 1}:`, cuota.monto);
                        throw new Error(`El monto de la cuota ${i + 1} debe ser mayor a 0`);
                    }

                    if (cuota.moneda) {
                        cuota.moneda = String(cuota.moneda).toUpperCase();
                    }
                }
            } else if (ordenData.contrafactura) {
                console.warn('⚠️ [ORDEN] Orden a contrafactura sin cuotas válidas. cuotas:', ordenData.cuotas);
                throw new Error('Las órdenes a contrafactura deben tener al menos una cuota');
            }

            // Si se están modificando items, validar
            if (ordenData.items && ordenData.items.length > 0) {
                for (const item of ordenData.items) {
                    if (!item.bien_id) {
                        throw new Error('Cada item debe tener un bien asociado');
                    }

                    if (!item.cantidad || item.cantidad <= 0) {
                        throw new Error('La cantidad debe ser mayor a 0');
                    }

                    // Validar que cantidad recibida no sea mayor que cantidad solicitada
                    if (item.cantidad_recibida !== undefined && item.cantidad_recibida !== null) {
                        const cantidadRecibida = parseFloat(item.cantidad_recibida);
                        const cantidadSolicitada = parseFloat(item.cantidad);
                        
                        if (cantidadRecibida > cantidadSolicitada) {
                            throw new Error(`La cantidad recibida (${cantidadRecibida}) no puede ser mayor que la cantidad solicitada (${cantidadSolicitada})`);
                        }
                    }

                    // Validar que solo se puede modificar cantidad_recibida en estado "En Proceso"
                    // Solo validar si el item tiene ID (ya existe) y la cantidad recibida cambió
                    if (item.id) {
                        const itemActual = ordenActual.items.find(i => i.id === item.id);
                        if (itemActual && item.cantidad_recibida !== undefined) {
                            const cantidadRecibidaActual = parseFloat(itemActual.cantidad_recibida || 0);
                            const cantidadRecibidaNueva = parseFloat(item.cantidad_recibida || 0);
                            
                            // Solo validar si cambió la cantidad recibida
                            if (cantidadRecibidaNueva !== cantidadRecibidaActual) {
                                if (ordenData.estado !== 'En Proceso' && ordenActual.estado !== 'En Proceso') {
                                    throw new Error('Solo se puede modificar la cantidad recibida cuando la orden está en estado "En Proceso"');
                                }
                            }
                        }
                    }
                }
            }

            // Preparar datos para actualizar
            const datosActualizados = {
                estado: ordenData.estado || ordenActual.estado,
                fecha_entrega_solicitada: ordenData.fecha_entrega_solicitada !== undefined 
                    ? ordenData.fecha_entrega_solicitada 
                    : ordenActual.fecha_entrega_solicitada,
                fecha_entrega_proveedor: ordenData.fecha_entrega_proveedor !== undefined
                    ? ordenData.fecha_entrega_proveedor
                    : ordenActual.fecha_entrega_proveedor,
                condicion: ordenData.condicion || ordenActual.condicion,
                asunto: ordenData.asunto !== undefined ? ordenData.asunto : ordenActual.asunto,
                proveedor_id: ordenData.proveedor_id !== undefined 
                    ? ordenData.proveedor_id 
                    : ordenActual.proveedor_id,
                contrafactura: ordenData.contrafactura !== undefined 
                    ? ordenData.contrafactura 
                    : ordenActual.contrafactura,
                archivos_adjuntos: ordenData.archivos_adjuntos, // Agregar archivos nuevos
                archivos_eliminar: ordenData.archivos_eliminar // Archivos a eliminar
            };

            console.log('Contrafactura en Service - recibida:', ordenData.contrafactura);
            console.log('Contrafactura en Service - actual:', ordenActual.contrafactura);
            console.log('Contrafactura en Service - final:', datosActualizados.contrafactura);
            console.log('Cuotas en Service - recibidas (normalizadas):', ordenData.cuotas);
            console.log('Adelanto en Service - recibido:', {
                monto_adelanto: ordenData.monto_adelanto,
                fecha_adelanto: ordenData.fecha_adelanto,
                adelantos_por_moneda: adelantosPorMoneda
            });

            // Si se proporcionan items, usarlos; sino mantener los actuales
            const items = ordenData.items || ordenActual.items;
            const ordenContext = {
                id: parseInt(id, 10) || id,
                codigo: ordenActual.codigo,
                contrafactura: !!datosActualizados.contrafactura,
                proveedor_id: datosActualizados.proveedor_id || ordenActual.proveedor_id || null,
                proveedor_nombre: ordenActual.proveedor_nombre || null,
                items: items || []
            };

            connection = await db.pool.getConnection();
            await connection.beginTransaction();

            console.log('💾 [ORDEN] Llamando a modificarOrdenCompra en repository con datos:', {
                datosActualizados,
                itemsCount: items ? items.length : 0
            });

            await ordenCompraRepository.modificarOrdenCompra(id, datosActualizados, items, connection);

            // Si es contrafactura y se proporcionaron cuotas, registrar adelanto + cuotas
            if (datosActualizados.contrafactura && ordenData.cuotas && ordenData.cuotas.length > 0) {
                try {
                    console.log(`📋 [ORDEN] Procesando pagos de contrafactura para la orden ${id}`);
                    console.log(`   ➤ Cantidad de cuotas: ${ordenData.cuotas.length}`);
                    console.log('   ➤ Datos de adelanto recibidos:', {
                        monto_adelanto: ordenData.monto_adelanto,
                        fecha_adelanto: ordenData.fecha_adelanto
                    });

                    // Eliminar pagos existentes de tipo "contrafactura" para esta orden
                    await pagosService.eliminarPagosContrafactura(id, connection);
                    console.log('🗑️ [ORDEN] Pagos de contrafactura anteriores eliminados');

                    // Registrar adelantos por moneda (o fallback legacy)
                    const adelantosEdicion = adelantosPorMoneda.length > 0
                        ? adelantosPorMoneda
                        : ((ordenData.monto_adelanto && parseFloat(ordenData.monto_adelanto) > 0)
                            ? [{
                                moneda: String(ordenData.moneda_adelanto || 'ARS').toUpperCase(),
                                monto: parseFloat(ordenData.monto_adelanto),
                                fecha: ordenData.fecha_adelanto || null
                            }]
                            : []);

                    for (const adelanto of adelantosEdicion) {
                        console.log('💰 [ORDEN] Registrando adelanto desde modificarOrdenCompra...', {
                            ordenId: id,
                            moneda: adelanto.moneda,
                            monto: adelanto.monto,
                            fecha: adelanto.fecha
                        });

                        try {
                            const adelantoResult = await pagosService.registrarAdelanto({
                                ordenId: id,
                                montoAdelanto: parseFloat(adelanto.monto),
                                fechaPago: adelanto.fecha || new Date().toISOString().split('T')[0],
                                username: username || ordenActual.creado_por,
                                monedaObjetivo: adelanto.moneda,
                                ordenContext,
                                transactionConnection: connection
                            });
                            console.log('✅ [ORDEN] Adelanto registrado correctamente desde modificación:', adelantoResult && adelantoResult.data);
                        } catch (adelantoError) {
                            console.error('❌ [ORDEN] Error al registrar adelanto en modificación de orden:', adelantoError);
                            throw adelantoError;
                        }
                    }
                    
                    // Registrar cada cuota como un pago
                    for (let i = 0; i < ordenData.cuotas.length; i++) {
                        const cuota = ordenData.cuotas[i];
                        console.log(`💳 Registrando cuota ${i + 1}/${ordenData.cuotas.length}: ${cuota.moneda} ${cuota.monto} - Fecha: ${cuota.fecha}`);
                        console.log('   ➤ Payload para registrarCuotaOrdenCompra:', {
                            ordenId: id,
                            numeroCuota: i + 1,
                            monto: cuota.monto,
                            fechaPago: cuota.fecha,
                            observaciones: `Cuota ${i + 1} de ${ordenData.cuotas.length} (${cuota.moneda})`,
                            username: username || ordenActual.creado_por
                        });
                        
                        await pagosService.registrarCuotaOrdenCompra({
                            ordenId: id,
                            numeroCuota: i + 1,
                            monto: parseFloat(cuota.monto),
                            fechaPago: cuota.fecha,
                            observaciones: `Cuota ${i + 1} de ${ordenData.cuotas.length} (${cuota.moneda})`,
                            username: username || ordenActual.creado_por,
                            monedaObjetivo: cuota.moneda,
                            ordenContext,
                            transactionConnection: connection
                        });
                    }
                    
                    console.log(`✅ ${ordenData.cuotas.length} cuota(s) registrada(s) exitosamente`);
                } catch (pagoError) {
                    console.error('❌ Error al registrar cuotas:', pagoError);
                    throw pagoError;
                }
            } else if (!datosActualizados.contrafactura) {
                // Si se desmarcó contrafactura, eliminar los pagos asociados
                await pagosService.eliminarPagosContrafactura(id, connection);
                console.log('🗑️ Pagos de contrafactura eliminados (se desmarcó contrafactura)');
            }

            await connection.commit();

            return {
                success: true,
                message: 'Orden de compra modificada exitosamente'
            };
        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error('Error al hacer rollback en modificarOrdenCompra:', rollbackError);
                }
            }
            console.error('Error en OrdenCompraService.modificarOrdenCompra:', error);
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    /**
     * Cambiar el estado de una orden
     * Valida que el usuario tenga permiso para realizar la transición
     */
    async cambiarEstado(id, nuevoEstado, username) {
        try {
            if (!this.validarEstado(nuevoEstado)) {
                throw new Error('Estado inválido');
            }

            const orden = await ordenCompraRepository.obtenerPorId(id);
            if (!orden) {
                throw new Error('La orden de compra no existe');
            }

            const estadoActual = orden.estado;

            // Si el estado no cambia, no hay nada que hacer
            if (estadoActual === nuevoEstado) {
                return {
                    success: true,
                    message: 'El estado ya es el solicitado'
                };
            }

            // Verificar permisos de transición (solo si no es admin)
            const usuario = await userRepository.findByUsername(username);
            
            if (usuario && usuario.role !== 'admin') {
                let permisos = [];
                if (usuario.permisos_transiciones_oc) {
                    // Si ya es un objeto, usarlo directamente; si es string, parsearlo
                    permisos = typeof usuario.permisos_transiciones_oc === 'string' 
                        ? JSON.parse(usuario.permisos_transiciones_oc) 
                        : usuario.permisos_transiciones_oc;
                }
                
                const tienePermiso = permisos.some(p => p.desde === estadoActual && p.hacia === nuevoEstado);
                
                if (!tienePermiso) {
                    throw new Error(`No tienes permiso para cambiar de "${estadoActual}" a "${nuevoEstado}"`);
                }
            }

            await ordenCompraRepository.actualizarEstado(id, nuevoEstado);

            return {
                success: true,
                message: `Estado actualizado a: ${nuevoEstado}`
            };
        } catch (error) {
            console.error('Error en OrdenCompraService.cambiarEstado:', error);
            throw error;
        }
    }

    /**
     * Cambiar estado de múltiples órdenes de compra
     * Valida que todas estén en el mismo estado actual
     */
    async cambiarEstadoMultiple(ordenIds, nuevoEstado, username) {
        try {
            if (!this.validarEstado(nuevoEstado)) {
                throw new Error('Estado inválido');
            }

            if (!Array.isArray(ordenIds) || ordenIds.length === 0) {
                throw new Error('Se requiere un array de órdenes válido');
            }

            // Obtener todas las órdenes
            const ordenes = await Promise.all(
                ordenIds.map(id => ordenCompraRepository.obtenerPorId(id))
            );

            // Validar que todas las órdenes existan
            const ordenesInvalidas = ordenes.filter(o => !o);
            if (ordenesInvalidas.length > 0) {
                throw new Error(`Algunas órdenes no existen`);
            }

            // Verificar que todas estén en el mismo estado
            const estadosUnicos = new Set(ordenes.map(o => o.estado));
            if (estadosUnicos.size !== 1) {
                throw new Error('Todas las órdenes deben estar en el mismo estado');
            }

            const estadoActual = ordenes[0].estado;

            // Si el estado es el mismo, no hay nada que cambiar
            if (estadoActual === nuevoEstado) {
                return {
                    exitosas: 0,
                    fallidas: [],
                    message: 'El estado ya es el solicitado para todas las órdenes'
                };
            }

            // Verificar permisos de transición (solo si no es admin)
            const usuario = await userRepository.findByUsername(username);
            
            if (usuario && usuario.role !== 'admin') {
                let permisos = [];
                if (usuario.permisos_transiciones_oc) {
                    permisos = typeof usuario.permisos_transiciones_oc === 'string' 
                        ? JSON.parse(usuario.permisos_transiciones_oc) 
                        : usuario.permisos_transiciones_oc;
                }
                
                const tienePermiso = permisos.some(p => p.desde === estadoActual && p.hacia === nuevoEstado);
                
                if (!tienePermiso) {
                    throw new Error(`No tienes permiso para cambiar de "${estadoActual}" a "${nuevoEstado}"`);
                }
            }

            // Actualizar todas las órdenes
            const resultados = {
                exitosas: 0,
                fallidas: []
            };

            for (const ordenId of ordenIds) {
                try {
                    await ordenCompraRepository.actualizarEstado(ordenId, nuevoEstado);
                    resultados.exitosas++;
                } catch (error) {
                    resultados.fallidas.push({
                        orden_id: ordenId,
                        error: error.message || 'Error desconocido'
                    });
                }
            }

            return resultados;
        } catch (error) {
            console.error('Error en OrdenCompraService.cambiarEstadoMultiple:', error);
            throw error;
        }
    }

    /**
     * Actualizar cantidad recibida de un item
     * Solo permitido cuando la orden está en estado "En Proceso"
     */
    async actualizarCantidadRecibida(ordenId, itemId, cantidadRecibida, username = 'sistema') {
        try {
            const orden = await ordenCompraRepository.obtenerPorId(ordenId);
            if (!orden) {
                throw new Error('La orden de compra no existe');
            }

            if (orden.estado !== 'En Proceso') {
                throw new Error('Solo se puede actualizar la cantidad recibida cuando la orden está en estado "En Proceso"');
            }

            // Verificar que el item pertenece a la orden
            const item = orden.items.find(i => i.id === itemId);
            if (!item) {
                throw new Error('El item no pertenece a esta orden');
            }

            if (cantidadRecibida < 0) {
                throw new Error('La cantidad recibida no puede ser negativa');
            }

            // Calcular la diferencia de cantidad recibida
            const cantidadAnterior = item.cantidad_recibida || 0;
            const diferencia = cantidadRecibida - cantidadAnterior;

            // Validar que la cantidad recibida no pueda disminuir
            if (diferencia < 0) {
                throw new Error('La cantidad recibida no puede ser menor a la cantidad ya registrada');
            }

            // Variable para guardar advertencias de pago
            let warningMessage = '';

            if (diferencia !== 0) {
                // Actualizar cantidad recibida
                await ordenCompraRepository.actualizarCantidadRecibida(itemId, cantidadRecibida);
                
                // Registrar pago por la cantidad recibida
                const esContrafactura = await ordenCompraRepository.esContraFactura(ordenId); // Verificar si es contrafactura para el registro de pago
                if (!esContrafactura) {
                    const pagoResult = await pagosService.registrarPagoPorRecepcion(ordenId, itemId, diferencia, username);
                    if (pagoResult && pagoResult.warning) {
                        warningMessage = pagoResult.message;
                    }                
                }
                // Si hay un incremento, actualizar el stock del bien
                if (diferencia > 0) {
                    // Obtener el bien para actualizar su stock
                    const bien = await bienRepository.obtenerPorId(item.bien_id);
                    if (!bien) {
                        throw new Error('El bien no existe');
                    }

                    const stockAnterior = parseFloat(bien.cantidad_stock) || 0;
                    const nuevoStock = stockAnterior + diferencia;
                    
                    // Actualizar stock del bien
                    await bienRepository.actualizarStock(item.bien_id, nuevoStock);

                    // Registrar en movimientos_stock como Entrada
                    await ajusteInventarioRepository.registrarAjuste({
                        tipo_movimiento: 'ENTRADA',
                        tipo_item: 'bien',
                        item_id: item.bien_id,
                        codigo: bien.codigo,
                        nombre: bien.nombre,
                        cantidad: diferencia,
                        stock_anterior: stockAnterior,
                        stock_nuevo: nuevoStock,
                        almacen_id: bien.almacen_defecto_id || null,
                        precio_unitario: item.precio_unitario || null,
                        cliente: null,
                        responsable: username,
                        usuario_sistema: username,
                        fecha: new Date(),
                        observaciones: `Recepción de Orden de Compra ${orden.codigo}`
                    });
                }
            }

            return {
                success: true,
                message: 'Cantidad recibida actualizada exitosamente',
                warning: warningMessage || undefined
            };
        } catch (error) {
            console.error('Error en OrdenCompraService.actualizarCantidadRecibida:', error);
            throw error;
        }
    }

    /**
     * Eliminar una orden de compra
     */
    async eliminarOrdenCompra(id) {
        try {
            const orden = await ordenCompraRepository.obtenerPorId(id);
            if (!orden) {
                throw new Error('La orden de compra no existe');
            }

            // Permitir eliminar órdenes cerradas, pero no las que están en estado "Entregado"
            // Las órdenes "Entregado" tienen movimientos de inventario asociados
            if (orden.estado === 'Entregado') {
                throw new Error('No se puede eliminar una orden en estado Entregado porque tiene movimientos de inventario asociados');
            }

            await ordenCompraRepository.eliminarOrdenCompra(id);

            return {
                success: true,
                message: 'Orden de compra eliminada exitosamente'
            };
        } catch (error) {
            console.error('Error en OrdenCompraService.eliminarOrdenCompra:', error);
            throw error;
        }
    }

    /**
     * Obtener todas las ordenes con filtros
     */
    async obtenerOrdenesCompra(filtros = {}, pagina = 1, limite = 50) {
        try {
            const resultado = await ordenCompraRepository.obtenerTodas(filtros, pagina, limite);
            return resultado;
        } catch (error) {
            console.error('Error en OrdenCompraService.obtenerOrdenesCompra:', error);
            throw error;
        }
    }

    /**
     * Obtener una orden por ID
     */
    async obtenerOrdenPorId(id) {
        try {
            const orden = await ordenCompraRepository.obtenerPorId(id);
            if (!orden) {
                throw new Error('La orden de compra no existe');
            }
            return orden;
        } catch (error) {
            console.error('Error en OrdenCompraService.obtenerOrdenPorId:', error);
            throw error;
        }
    }

    /**
     * Obtener cuotas de una orden de compra desde los pagos
     */
    async obtenerCuotasOrden(ordenId) {
        try {
            const pagosRepository = require('../repositories/pagoRepository');
            
            console.log(`📋 [SERVICIO] Obteniendo cuotas para orden: ${ordenId}`);
            
            // Obtener todos los pagos de tipo "contrafactura" para esta orden
            const pagosData = await pagosRepository.obtenerPagosContrafacturaPorOrden(ordenId);
            
            console.log(`📊 [SERVICIO] Datos obtenidos del repositorio:`, pagosData);
            
            // Obtener solo los saldos (cuotas), ya que adelanto es separado
            const pagos = pagosData && pagosData.saldos ? pagosData.saldos : [];
            
            console.log(`💳 [SERVICIO] Saldos/cuotas encontrados: ${pagos.length}`);
            
            if (!pagos || pagos.length === 0) {
                console.log(`⚠️ [SERVICIO] Sin cuotas para la orden ${ordenId}`);
                return [];
            }

            // Transformar pagos a formato de cuotas
            const cuotas = pagos.map((pago, index) => {
                // Convertir fecha a formato YYYY-MM-DD
                let fechaFormato = '';
                if (pago.fecha_pago) {
                    const fecha = new Date(pago.fecha_pago);
                    const año = fecha.getFullYear();
                    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                    const día = String(fecha.getDate()).padStart(2, '0');
                    fechaFormato = `${año}-${mes}-${día}`;
                }

                // Tomar el monto real de la cuota: primero monto_total, si no, monto_pago
                const montoRaw =
                    pago.monto_total != null
                        ? pago.monto_total
                        : (pago.monto_pago != null ? pago.monto_pago : null);

                const montoCuota =
                    montoRaw != null && montoRaw !== ''
                        ? parseFloat(montoRaw)
                        : 0; // Evitar NaN en la vista
                
                return {
                    id: index + 1,
                    fecha: fechaFormato,
                    monto: montoCuota,
                    moneda: pago.moneda || 'ARS',
                    observaciones: pago.observaciones || '',
                    estado: pago.pagado ? 'Pagado' : 'Pendiente'
                };
            });

            console.log(`✅ [SERVICIO] Se transformaron ${cuotas.length} cuota(s):`);
            cuotas.forEach((c, i) => {
                console.log(`   Cuota ${i+1}: ${c.fecha} - $${c.monto}`);
            });
            
            return cuotas;
        } catch (error) {
            console.error('❌ [SERVICIO] Error en OrdenCompraService.obtenerCuotasOrden:', error);
            // No lanzar error, solo retornar array vacío
            return [];
        }
    }

    /**
     * Actualizar archivo adjunto (método legacy - mantener por compatibilidad)
     */
    async actualizarArchivo(id, rutaArchivo) {
        try {
            const orden = await ordenCompraRepository.obtenerPorId(id);
            if (!orden) {
                throw new Error('La orden de compra no existe');
            }

            await ordenCompraRepository.actualizarArchivo(id, rutaArchivo);

            return {
                success: true,
                message: 'Archivo actualizado exitosamente'
            };
        } catch (error) {
            console.error('Error en OrdenCompraService.actualizarArchivo:', error);
            throw error;
        }
    }

    /**
     * Agregar múltiples archivos adjuntos a una orden de compra
     */
    async agregarArchivos(id, archivos) {
        try {
            const orden = await ordenCompraRepository.obtenerPorId(id);
            if (!orden) {
                throw new Error('La orden de compra no existe');
            }

            // Si la tabla de archivos múltiples existe, usarla
            // Si no, agregar a la columna archivo_adjunto como JSON
            await ordenCompraRepository.agregarArchivos(id, archivos);

            return {
                success: true,
                message: 'Archivos agregados exitosamente',
                archivos: archivos
            };
        } catch (error) {
            console.error('Error en OrdenCompraService.agregarArchivos:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas
     */
    async obtenerEstadisticas() {
        try {
            return await ordenCompraRepository.obtenerEstadisticas();
        } catch (error) {
            console.error('Error en OrdenCompraService.obtenerEstadisticas:', error);
            throw error;
        }
    }

    /**
     * Obtener datos necesarios para el formulario de orden de compra
     */
    async obtenerDatosFormulario() {
        try {
            const bienesResult = await bienRepository.obtenerTodos(1, 10000, {});
            const unidadesMedidaResult = await unidadMedidaRepository.obtenerTodas(1, 10000);
            const centrosCosto = await centroCostoRepository.obtenerActivos();

            return {
                bienes: bienesResult.data || [],
                unidadesMedida: unidadesMedidaResult.data || [],
                centrosCosto: centrosCosto || []
            };
        } catch (error) {
            console.error('Error en OrdenCompraService.obtenerDatosFormulario:', error);
            throw error;
        }
    }

    /**
     * Obtener proveedores asociados a un bien específico
     */
    async obtenerProveedoresPorBien(bienId) {
        try {
            if (!bienId) {
                throw new Error('El ID del bien es requerido');
            }

            const proveedores = await bienProveedorRepository.obtenerProveedoresPorBien(bienId);
            return proveedores;
        } catch (error) {
            console.error('Error en OrdenCompraService.obtenerProveedoresPorBien:', error);
            throw error;
        }
    }

    /**
     * Obtener información del proveedor de un item específico de una orden
     * Valida que el item pertenezca a la orden especificada
     */
    async obtenerProveedorDeItem(ordenId, itemId) {
        try {
            if (!ordenId || !itemId) {
                throw new Error('El ID de la orden y del item son requeridos');
            }

            const itemInfo = await ordenCompraRepository.obtenerProveedorDeItem(ordenId, itemId);
            
            if (!itemInfo) {
                throw new Error('Item no encontrado en esta orden de compra');
            }

            return itemInfo;
        } catch (error) {
            console.error('Error en OrdenCompraService.obtenerProveedorDeItem:', error);
            throw error;
        }
    }
}

module.exports = new OrdenCompraService();
