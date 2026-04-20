const ordenCompraRepository = require('../repositories/ordenCompraRepository');
const bienRepository = require('../repositories/bienRepository');
const pagosService = require('./pagosService');
const ajusteInventarioRepository = require('../repositories/ajusteInventarioRepository');
const userRepository = require('../repositories/userRepository');
const unidadMedidaRepository = require('../repositories/unidadMedidaRepository');
const centroCostoRepository = require('../repositories/centroCostoRepository');
const bienProveedorRepository = require('../repositories/bienProveedorRepository');

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

    /**
     * Calcular monto total de la orden en base a precios de proveedor por bien
     */
    async calcularMontoTotalOrden(items = [], logDetalle = false) {
        let montoTotal = 0;
        let monedasUtilizadas = new Set();
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
                        montoTotal += precio * cantidad;

                        if (logDetalle) {
                            console.log(`💰 Item ${item.bien_id}: ${cantidad} × $${precio} = $${(precio * cantidad).toFixed(2)}`);
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ No se pudo obtener precio para bien ${item.bien_id} con proveedor ${item.proveedor_sugerido_id}`);
                }
            }
        }

        return montoTotal;
    }

    /**
     * Crear una nueva orden de compra
     */
    async crearOrdenCompra(ordenData, usuario) {
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
            let montoTotalContrafactura = 0;

            // Si es contrafactura, validar los datos de pago ANTES de crear la orden
            if (ordenData.contrafactura && ordenData.cuotas && ordenData.cuotas.length > 0) {
                cuotasNormalizadas = this.normalizarCuotas(ordenData.cuotas);
                ordenData.cuotas = cuotasNormalizadas;

                montoTotalContrafactura = await this.calcularMontoTotalOrden(ordenData.items, true);
                console.log(`💰 Monto total calculado: $${montoTotalContrafactura.toFixed(2)}`);

                // Validar que el adelanto no sea mayor al monto total
                if (ordenData.monto_adelanto && parseFloat(ordenData.monto_adelanto) > 0) {
                    const montoAdelanto = parseFloat(ordenData.monto_adelanto);
                    if (montoAdelanto > montoTotalContrafactura) {
                        throw new Error(`El adelanto ($${montoAdelanto.toFixed(2)}) no puede ser mayor al monto total de la orden ($${montoTotalContrafactura.toFixed(2)})`);
                    }
                }

                // Validar que el total de cuotas no supere el monto disponible
                const totalCuotas = cuotasNormalizadas.reduce((sum, c) => sum + parseFloat(c.monto), 0);
                const adelanto = parseFloat(ordenData.monto_adelanto) || 0;
                const montoDisponible = montoTotalContrafactura - adelanto;
                
                if (totalCuotas > montoDisponible + 0.01) { // Tolerancia de 1 centavo
                    throw new Error(`El total de cuotas ($${totalCuotas.toFixed(2)}) no puede ser mayor al monto disponible ($${montoDisponible.toFixed(2)}). Monto total: $${montoTotalContrafactura.toFixed(2)}, Adelanto: $${adelanto.toFixed(2)}`);
                }

                // Validar que haya un monto total válido
                if (montoTotalContrafactura <= 0) {
                    throw new Error('No se pudo calcular el monto total de la orden. Verifica que los items tengan proveedor sugerido y precios configurados.');
                }
            }

            // Crear la orden con sus items
            const result = await ordenCompraRepository.crearOrdenCompra(datosOrden, ordenData.items);
            
            // Actualizar el código en el resultado
            result.codigo = codigoFinal;

            // Si es contrafactura, registrar los pagos correspondientes (cuotas)
            if (ordenData.contrafactura && cuotasNormalizadas.length > 0) {
                console.log('📝 Procesando cuotas de pago...');
                console.log(`💰 Monto total calculado: $${montoTotalContrafactura.toFixed(2)}`);

                // Si hay monto de adelanto, registrarlo con su fecha específica
                if (ordenData.monto_adelanto && parseFloat(ordenData.monto_adelanto) > 0) {
                    console.log('📝 Registrando adelanto de pago...');
                    await pagosService.registrarAdelanto({
                        ordenId: result.id,
                        montoAdelanto: ordenData.monto_adelanto,
                        fechaPago: ordenData.fecha_adelanto || new Date().toISOString().split('T')[0],
                        username: usuario
                    });
                }

                // Registrar cada cuota como un pago separado
                for (const cuota of cuotasNormalizadas) {
                    console.log(`📝 Registrando cuota ${cuota.numeroCuota}: $${cuota.monto} - Fecha: ${cuota.fecha}`);
                    
                    await pagosService.registrarCuotaOrdenCompra({
                        ordenId: result.id,
                        numeroCuota: cuota.numeroCuota,
                        monto: cuota.monto,
                        fechaPago: cuota.fecha,
                        observaciones: cuota.observacion || `Cuota ${cuota.numeroCuota} de ${cuotasNormalizadas.length}`,
                        username: usuario
                    });
                }

                console.log(`✅ ${cuotasNormalizadas.length} cuota(s) registradas exitosamente`);
            }

            return {
                success: true,
                message: 'Orden de compra creada exitosamente',
                data: result
            };
        } catch (error) {
            console.error('Error en OrdenCompraService.crearOrdenCompra:', error);
            throw error;
        }
    }

    /**
     * Modificar una orden de compra existente
     */
    async modificarOrdenCompra(id, ordenData, username) {
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
                fecha_adelanto: ordenData.fecha_adelanto
            });

            // Si se proporcionan items, usarlos; sino mantener los actuales
            const items = ordenData.items || ordenActual.items;

            console.log('💾 [ORDEN] Llamando a modificarOrdenCompra en repository con datos:', {
                datosActualizados,
                itemsCount: items ? items.length : 0
            });

            await ordenCompraRepository.modificarOrdenCompra(id, datosActualizados, items);

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
                    await pagosService.eliminarPagosContrafactura(id);
                    console.log('🗑️ [ORDEN] Pagos de contrafactura anteriores eliminados');

                    // Si hay monto de adelanto en la edición, registrarlo primero
                    if (ordenData.monto_adelanto && parseFloat(ordenData.monto_adelanto) > 0) {
                        console.log('💰 [ORDEN] Registrando adelanto desde modificarOrdenCompra...', {
                            ordenId: id,
                            monto_adelanto: ordenData.monto_adelanto,
                            fecha_adelanto: ordenData.fecha_adelanto
                        });

                        try {
                            const adelantoResult = await pagosService.registrarAdelanto({
                                ordenId: id,
                                montoAdelanto: parseFloat(ordenData.monto_adelanto),
                                fechaPago: ordenData.fecha_adelanto || new Date().toISOString().split('T')[0],
                                username: username || ordenActual.creado_por
                            });
                            console.log('✅ [ORDEN] Adelanto registrado correctamente desde modificación:', adelantoResult && adelantoResult.data);
                        } catch (adelantoError) {
                            console.error('❌ [ORDEN] Error al registrar adelanto en modificación de orden:', adelantoError);
                            // Re-lanzamos para ver claramente el error en frontend
                            throw adelantoError;
                        }
                    } else {
                        console.log('ℹ️ [ORDEN] No se envió monto_adelanto en la edición, se omite registro de adelanto');
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
                            username: username || ordenActual.creado_por
                        });
                    }
                    
                    console.log(`✅ ${ordenData.cuotas.length} cuota(s) registrada(s) exitosamente`);
                } catch (pagoError) {
                    console.error('❌ Error al registrar cuotas:', pagoError);
                    throw pagoError;
                }
            } else if (!datosActualizados.contrafactura) {
                // Si se desmarcó contrafactura, eliminar los pagos asociados
                try {
                    await pagosService.eliminarPagosContrafactura(id);
                    console.log('🗑️ Pagos de contrafactura eliminados (se desmarcó contrafactura)');
                } catch (error) {
                    console.warn('⚠️ Error al eliminar pagos al desmarcar contrafactura:', error.message);
                }
            }

            return {
                success: true,
                message: 'Orden de compra modificada exitosamente'
            };
        } catch (error) {
            console.error('Error en OrdenCompraService.modificarOrdenCompra:', error);
            throw error;
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
