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
            
            // Procesar bienes asociados
            let bienesAsociados = null;
            if (productoData.bienes && Array.isArray(productoData.bienes) && productoData.bienes.length > 0) {
                bienesAsociados = productoData.bienes.map(bien => ({
                    bien_id: parseInt(bien.bien_id),
                    cantidad: parseFloat(bien.cantidad) || 1
                }));
            }
            
            return await ProductoRepository.crearProducto(
                productoData.nombre, 
                productoData.unidad, 
                productoData.enStock, 
                productoData.creadoPor,
                bienesAsociados
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
    
    async obtenerProductoPorId(id) {
        try {
            const producto = await ProductoRepository.obtenerPorId(id);
            if (!producto) {
                throw new Error('Producto no encontrado');
            }
            return producto;
        } catch (error) {
            console.error('Error en ProductoService.obtenerProductoPorId:', error);
            throw new Error(`Error al obtener producto: ${error.message}`);
        }
    }
    
    async actualizarProducto(id, productoData) {
        try {
            if (!productoData.nombre || !productoData.unidad) {
                throw new Error('El nombre y la unidad son obligatorios');
            }
            
            // Verificar si el producto existe
            const productoExistente = await ProductoRepository.obtenerPorId(id);
            if (!productoExistente) {
                throw new Error('Producto no encontrado');
            }
            
            // Verificar si el nuevo nombre ya existe en otro producto
            if (productoData.nombre !== productoExistente.nombre) {
                const productoConMismoNombre = await ProductoRepository.obtenerPorNombre(productoData.nombre);
                if (productoConMismoNombre && productoConMismoNombre.id !== parseInt(id)) {
                    throw new Error('Ya existe otro producto con este nombre');
                }
            }
            
            // Procesar bienes asociados
            let bienesAsociados = null;
            if (productoData.bienes && Array.isArray(productoData.bienes) && productoData.bienes.length > 0) {
                bienesAsociados = productoData.bienes.map(bien => ({
                    bien_id: parseInt(bien.bien_id),
                    cantidad: parseFloat(bien.cantidad) || 1
                }));
            }
            
            return await ProductoRepository.actualizarProducto(
                id,
                productoData.nombre, 
                productoData.unidad, 
                productoData.enStock,
                bienesAsociados
            );
        } catch (error) {
            console.error('Error en ProductoService.actualizarProducto:', error);
            throw new Error(`Error al actualizar producto: ${error.message}`);
        }
    }
    
    async eliminarProducto(id) {
        try {
            const producto = await ProductoRepository.obtenerPorId(id);
            if (!producto) {
                throw new Error('Producto no encontrado');
            }
            
            return await ProductoRepository.eliminarProducto(id);
        } catch (error) {
            console.error('Error en ProductoService.eliminarProducto:', error);
            throw new Error(`Error al eliminar producto: ${error.message}`);
        }
    }
}

module.exports = new ProductoService();