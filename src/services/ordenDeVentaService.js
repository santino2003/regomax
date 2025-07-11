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
            if (!fecha || !cliente || !codigoDeVenta || !Array.isArray(productosYCantidades) || productosYCantidades.length === 0) {
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
                
                // Obtener la orden completa con sus productos
                return await OVRepository.obtenerPorId(ordenId);
                
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
}

module.exports = new OrdenDeVentaService();