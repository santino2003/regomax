const ordenCompraRepository = require('../repositories/ordenCompraRepository');
const bienRepository = require('../repositories/bienRepository');
const proveedorRepository = require('../repositories/proveedorRepository');
const ajusteInventarioRepository = require('../repositories/ajusteInventarioRepository');
const userRepository = require('../repositories/userRepository');

class OrdenCompraService {
    /**
     * Generar código único para la orden de compra basado en el ID
     * Formato: OC-XXX (se genera después de insertar en BD)
     */
    generarCodigoPorId(id) {
        // Formato: OC-XXX (mínimo 3 dígitos con ceros a la izquierda)
        return `OC-${id.toString().padStart(3, '0')}`;
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

            // Preparar datos de la orden (sin código, se generará después con el ID)
            const datosOrden = {
                codigo: 'TEMP', // Código temporal, se actualizará después
                estado: 'Abierta', // Siempre inicia en Abierta
                fecha_entrega_solicitada: ordenData.fecha_entrega_solicitada || null,
                fecha_entrega_proveedor: ordenData.fecha_entrega_proveedor || null,
                condicion: ordenData.condicion,
                asunto: ordenData.asunto || null,
                archivo_adjunto: ordenData.archivo_adjunto || null,
                proveedor_id: ordenData.proveedor_id || null,
                creado_por: usuario
            };

            // Crear la orden con sus items
            const result = await ordenCompraRepository.crearOrdenCompra(datosOrden, ordenData.items);
            
            // Generar código basado en el ID y actualizar
            const codigoFinal = this.generarCodigoPorId(result.id);
            await ordenCompraRepository.actualizarCodigo(result.id, codigoFinal);
            
            // Actualizar el código en el resultado
            result.codigo = codigoFinal;

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
    async modificarOrdenCompra(id, ordenData) {
        try {
            // Obtener la orden actual
            const ordenActual = await ordenCompraRepository.obtenerPorId(id);
            if (!ordenActual) {
                throw new Error('La orden de compra no existe');
            }

            // Validaciones
            if (ordenData.estado && !this.validarEstado(ordenData.estado)) {
                throw new Error('Estado inválido');
            }

            if (ordenData.condicion && !this.validarCondicion(ordenData.condicion)) {
                throw new Error('La condición debe ser: No Critica, Semi Critica o Muy Critica');
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

                    // Validar que solo se puede editar cantidad_recibida en estado "En Proceso"
                    if (item.cantidad_recibida !== undefined && item.cantidad_recibida !== null) {
                        if (ordenData.estado !== 'En Proceso' && ordenActual.estado !== 'En Proceso') {
                            throw new Error('Solo se puede ingresar cantidad recibida cuando la orden está en estado "En Proceso"');
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
                    : ordenActual.proveedor_id
            };

            // Si se proporcionan items, usarlos; sino mantener los actuales
            const items = ordenData.items || ordenActual.items;

            await ordenCompraRepository.modificarOrdenCompra(id, datosActualizados, items);

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
                const permisos = usuario.permisos_transiciones_oc ? JSON.parse(usuario.permisos_transiciones_oc) : [];
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

            if (diferencia !== 0) {
                // Actualizar cantidad recibida
                await ordenCompraRepository.actualizarCantidadRecibida(itemId, cantidadRecibida);

                // Si hay un incremento, actualizar el stock del bien
                if (diferencia > 0) {
                    // Obtener el bien para actualizar su stock
                    const bien = await bienRepository.obtenerPorId(item.bien_id);
                    if (!bien) {
                        throw new Error('El bien no existe');
                    }

                    const stockAnterior = bien.cantidad_stock || 0;
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
                message: 'Cantidad recibida actualizada exitosamente'
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

            // Opcional: validar que no se pueda eliminar en ciertos estados
            if (['Entregado', 'Cerrada'].includes(orden.estado)) {
                throw new Error('No se puede eliminar una orden en estado Entregado o Cerrada');
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
     * Actualizar archivo adjunto
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
}

module.exports = new OrdenCompraService();
