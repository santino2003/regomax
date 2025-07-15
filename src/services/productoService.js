const ProductoRepository = require('../repositories/productoRepository');

class ProductoService {
    async crearProducto(productoData) {
        try {
            if (!productoData.nombre || !productoData.unidad) {
                throw new Error('El nombre y la unidad son obligatorios');
            }
            
            // Verificar si ya existe un producto con el mismo nombre
            const productoExistente = await ProductoRepository.obtenerPorNombre(productoData.nombre);
            if (productoExistente) {
                throw new Error('Ya existe un producto con este nombre');
            }
            
            return await ProductoRepository.crearProducto(
                productoData.nombre, 
                productoData.unidad, 
                productoData.enStock, 
                productoData.creadoPor
            );
        } catch (error) {
            console.error('Error en ProductoService.crearProducto:', error);
            throw new Error(`Error al crear producto: ${error.message}`);
        }
    }
    
    async obtenerTodosLosProductos() {
        try {
            return await ProductoRepository.obtenerTodos();
        } catch (error) {
            console.error('Error en ProductoService.obtenerTodosLosProductos:', error);
            throw new Error(`Error al obtener productos: ${error.message}`);
        }
    }
    
    // Método para obtener solo productos con en_stock = true
    async obtenerProductosEnStock() {
        try {
            return await ProductoRepository.obtenerProductosEnStock();
        } catch (error) {
            console.error('Error en ProductoService.obtenerProductosEnStock:', error);
            throw new Error(`Error al obtener productos en stock: ${error.message}`);
        }
    }
}

module.exports = new ProductoService();