const OVRepository = require('../repositories/ordenDeVentaRepository');

class OrdenDeVentaService {
    async crearOrdenDeVenta(ordenData) {
        try {
            const {
                fecha, 
                cliente, 
                clienteFinal, 
                codigoDeVenta, 
                observaciones, 
                productosYCantidades, // Array de objetos [{producto: "X", cantidad: Y}, ...]
                responsable
            } = ordenData;
            
            // Validaciones básicas
            if (!fecha || !cliente ||  !Array.isArray(productosYCantidades) || productosYCantidades.length === 0) {
                throw new Error('Datos incompletos para crear la orden de venta');
            }
            
            // INICIO DE TRANSACCIÓN
            await OVRepository.iniciarTransaccion();
            
            try {
                // Crear la orden principal
                const ordenId = await OVRepository.crearOrdenVenta(
                    fecha, cliente, clienteFinal, codigoDeVenta, observaciones, responsable
                );
                
                // Crear cada línea de producto
                for (const item of productosYCantidades) {
                    await OVRepository.agregarDetalleOrden(ordenId, item.producto, item.cantidad);
                }
                
                // CONFIRMAR TRANSACCIÓN
                await OVRepository.confirmarTransaccion();
                
                // Retornar el ID para que el frontend pueda mostrar OV-X
                return {
                    success: true,
                    codigo: ordenId
                };
                
            } catch (error) {
                // REVERTIR TRANSACCIÓN si algo falla
                await OVRepository.revertirTransaccion();
                throw error;
            }
        } catch (error) {
            console.error('Error al crear orden de venta:', error);
            throw new Error('Error al crear orden de venta: ' + error.message);
        }
    }
    
    // Obtener todas las órdenes con sus productos
    async obtenerTodasLasOrdenes(page = 1, limit = 10, sortBy = 'id', sortOrder = 'DESC') {
        try {
            return await OVRepository.obtenerTodas(page, limit, sortBy, sortOrder);
        } catch (error) {
            console.error('Error al obtener órdenes:', error);
            throw new Error('Error al obtener órdenes: ' + error.message);
        }
    }
    
    // Obtener una orden específica con sus productos
    async obtenerOrdenPorId(id) {
        try {
            const orden = await OVRepository.obtenerPorId(id);
            if (!orden) {
                throw new Error('Orden de venta no encontrada');
            }
            return orden;
        } catch (error) {
            console.error('Error al obtener orden:', error);
            throw new Error('Error al obtener orden: ' + error.message);
        }
    }
    
    // Actualizar una orden existente
    async actualizarOrden(id, ordenData) {
        try {
            // Verificar si la orden existe
            const ordenExistente = await OVRepository.obtenerPorId(id);
            if (!ordenExistente) {
                throw new Error('Orden de venta no encontrada');
            }
            
            // INICIO DE TRANSACCIÓN
            await OVRepository.iniciarTransaccion();
            
            try {
                // Actualizar datos básicos de la orden
                await OVRepository.actualizarDatosOrden(id, {
                    fecha: ordenData.fecha || ordenExistente.fecha,
                    cliente: ordenData.cliente || ordenExistente.cliente,
                    cliente_final: ordenData.clienteFinal || ordenExistente.cliente_final,
                    codigo_venta: ordenData.codigoVenta || ordenExistente.codigo_venta,
                    observaciones: ordenData.observaciones !== undefined ? ordenData.observaciones : ordenExistente.observaciones,
                    estado: ordenData.estado || ordenExistente.estado
                });
                
                // Si hay nuevos productos, actualizar los productos
                if (ordenData.productos && ordenData.productos.length > 0) {
                    // Eliminar todos los productos existentes
                    await OVRepository.eliminarDetallesOrden(id);
                    
                    // Agregar los nuevos productos
                    for (const producto of ordenData.productos) {
                        await OVRepository.agregarDetalleOrden(id, producto.producto, producto.cantidad);
                    }
                }
                
                // CONFIRMAR TRANSACCIÓN
                await OVRepository.confirmarTransaccion();
                
                // Obtener la orden actualizada con sus productos
                return await OVRepository.obtenerPorId(id);
                
            } catch (error) {
                // REVERTIR TRANSACCIÓN si algo falla
                await OVRepository.revertirTransaccion();
                throw error;
            }
        } catch (error) {
            console.error('Error al actualizar orden de venta:', error);
            throw new Error(`Error al actualizar orden de venta: ${error.message}`);
        }
    }
    
    // Obtener órdenes filtradas por estado
    async obtenerOrdenesPorEstado(estado) {
        try {
            return await OVRepository.obtenerPorEstado(estado);
        } catch (error) {
            console.error('Error al obtener órdenes por estado:', error);
            throw new Error('Error al obtener órdenes por estado: ' + error.message);
        }
    }
}

module.exports = new OrdenDeVentaService();