const despachoRepository = require('../repositories/despachoRepository');
const bolsonRepository = require('../repositories/bolsonRepository');
const db = require('../config/db');

class DespachoService {
    async procesarDespacho(datosDespacho) {
        try {
            // Validar datos
            if (!datosDespacho.ordenVentaId) {
                throw new Error('El ID de la orden de venta es obligatorio');
            }
            
            if (!datosDespacho.codigos || !Array.isArray(datosDespacho.codigos) || datosDespacho.codigos.length === 0) {
                throw new Error('Se debe proporcionar al menos un código de bolsón para despachar');
            }
            
            // Iniciar transacción para asegurar que todas las operaciones se hagan o ninguna
            await despachoRepository.iniciarTransaccion();
            
            try {
                // Crear el despacho principal
                const despachoId = await despachoRepository.crearDespacho(
                    datosDespacho.ordenVentaId,
                    datosDespacho.responsable,
                    datosDespacho.observaciones
                );
                
                // Procesar cada bolsón
                const resumenProductos = new Map(); // Para acumular pesos por producto
                
                for (const codigoBolson of datosDespacho.codigos) {
                    // Verificar que el bolsón existe
                    const bolson = await bolsonRepository.obtenerPorCodigo(codigoBolson);
                    if (!bolson) {
                        throw new Error(`El bolsón con código ${codigoBolson} no existe`);
                    }
                    
                    // Verificar que no haya sido despachado previamente
                    const despachoPrevio = await despachoRepository.verificarBolsonDespachado(codigoBolson);
                    if (despachoPrevio) {
                        throw new Error(`El bolsón con código ${codigoBolson} ya fue despachado previamente`);
                    }
                    
                    // Agregar el detalle del bolsón al despacho
                    await despachoRepository.agregarDetalleBolson(
                        despachoId,
                        codigoBolson,
                        bolson.producto,
                        bolson.peso,
                        bolson.precinto
                    );
                    
                    // Acumular peso por producto
                    const pesoActual = resumenProductos.get(bolson.producto) || 0;
                    resumenProductos.set(bolson.producto, pesoActual + parseFloat(bolson.peso));
                }
                
                // Actualizar el peso despachado en la orden de venta para cada producto
                const detalleActualizaciones = [];
                
                for (const [producto, peso] of resumenProductos.entries()) {
                    const resultado = await despachoRepository.actualizarPesoProductoOrden(
                        datosDespacho.ordenVentaId,
                        producto,
                        peso
                    );
                    
                    detalleActualizaciones.push({
                        producto,
                        ...resultado
                    });
                }
                
                // Verificar si la orden está completa (todos los productos en cantidad 0)
                const ordenCompleta = await despachoRepository.verificarOrdenCompleta(datosDespacho.ordenVentaId);
                
                // Si está completa, actualizar el estado
                if (ordenCompleta) {
                    await despachoRepository.actualizarEstadoOrden(datosDespacho.ordenVentaId, 'en_logistica');
                }
                
                // Confirmar todas las operaciones
                await despachoRepository.confirmarTransaccion();
                
                // Devolver información sobre el despacho
                return {
                    despachoId,
                    bolsonesDespachados: datosDespacho.codigos.length,
                    actualizacionesProductos: detalleActualizaciones,
                    ordenCompleta
                };
            } catch (error) {
                // Si hay algún error, revertir todas las operaciones
                await despachoRepository.revertirTransaccion();
                throw error;
            }
        } catch (error) {
            console.error('Error en procesarDespacho:', error);
            throw error;
        }
    }
    
    async obtenerDespachosPorOrden(ordenId) {
        try {
            return await despachoRepository.obtenerDespachosPorOrden(ordenId);
        } catch (error) {
            console.error('Error en obtenerDespachosPorOrden:', error);
            throw error;
        }
    }
    
    async obtenerBolsonesDespachados(page = 1, limit = 10, filtros = {}) {
        try {
            return await despachoRepository.obtenerBolsonesDespachados(page, limit, filtros);
        } catch (error) {
            console.error('Error en obtenerBolsonesDespachados:', error);
            throw error;
        }
    }
    
    async obtenerBolsonesDespachadosPorOrden(ordenId) {
        try {
            // Para una orden específica, mostramos TODOS los bolsones (incluyendo los manuales)
            const query = `
                SELECT dd.id, dd.bolson_codigo, dd.producto, dd.peso, dd.precinto, dd.es_manual,
                       d.fecha, d.responsable, d.orden_venta_id
                FROM despachos_detalle dd
                JOIN despachos d ON dd.despacho_id = d.id
                WHERE d.orden_venta_id = ?
                ORDER BY d.fecha DESC, dd.id DESC
            `;
            
            const result = await db.query(query, [ordenId]);
            return result;
        } catch (error) {
            console.error('Error al obtener bolsones despachados por orden:', error);
            throw error;
        }
    }

    // Procesar un despacho manual (sin escaneo de bolsones)
    async procesarDespachoManual(datosDespacho) {
        try {
            // Validar datos
            if (!datosDespacho.ordenVentaId) {
                throw new Error('El ID de la orden de venta es obligatorio');
            }
            
            if (!datosDespacho.productosManual || !Array.isArray(datosDespacho.productosManual) || datosDespacho.productosManual.length === 0) {
                throw new Error('Se debe proporcionar al menos un producto para despachar manualmente');
            }
            
            // Iniciar transacción para asegurar que todas las operaciones se hagan o ninguna
            await despachoRepository.iniciarTransaccion();
            
            try {
                // Crear el despacho principal con marca de manual
                const observacionesCompletas = `[MANUAL] ${datosDespacho.observaciones || 'Despacho manual sin códigos'}`;
                const despachoId = await despachoRepository.crearDespacho(
                    datosDespacho.ordenVentaId,
                    datosDespacho.responsable,
                    observacionesCompletas
                );
                
                const detalleActualizaciones = [];
                
                // Actualizar el peso despachado en la orden de venta para cada producto
                for (const producto of datosDespacho.productosManual) {
                    // Actualizar cantidad despachada en la orden
                    const resultado = await despachoRepository.actualizarPesoProductoOrden(
                        datosDespacho.ordenVentaId,
                        producto.producto,
                        parseFloat(producto.cantidad)
                    );
                    
                    // Registrar en despacho_detalle con código especial para manuales
                    const codigoManual = `MANUAL-${Date.now()}-${Math.floor(Math.random()*1000)}`;
                    await despachoRepository.agregarDetalleManual(
                        despachoId,
                        codigoManual,
                        producto.producto,
                        parseFloat(producto.cantidad)
                    );
                    
                    detalleActualizaciones.push({
                        producto: producto.producto,
                        cantidad: parseFloat(producto.cantidad),
                        ...resultado
                    });
                }
                
                // Verificar si la orden está completa (todos los productos en cantidad 0)
                const ordenCompleta = await despachoRepository.verificarOrdenCompleta(datosDespacho.ordenVentaId);
                
                // Si está completa, actualizar el estado
                if (ordenCompleta) {
                    await despachoRepository.actualizarEstadoOrden(datosDespacho.ordenVentaId, 'en_logistica');
                }
                
                // Confirmar todas las operaciones
                await despachoRepository.confirmarTransaccion();
                
                // Devolver información sobre el despacho
                return {
                    despachoId,
                    productosActualizados: detalleActualizaciones.length,
                    actualizacionesProductos: detalleActualizaciones,
                    ordenCompleta
                };
                
            } catch (error) {
                // Si hay algún error, revertir todas las operaciones
                await despachoRepository.revertirTransaccion();
                throw error;
            }
        } catch (error) {
            console.error('Error en procesarDespachoManual:', error);
            throw new Error(`Error al procesar despacho manual: ${error.message}`);
        }
    }
}

module.exports = new DespachoService();