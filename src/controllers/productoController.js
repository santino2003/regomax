const ProductoService = require('../services/productoService');
const productoRepository = require('../repositories/productoRepository');
const bienRepository = require('../repositories/bienRepository');

const ProductoController = {
    async crearProducto(req, res) {
        try {
            const productoData = {
                nombre: req.body.nombre,
                unidad: req.body.unidad,
                enStock: req.body.enStock === true || req.body.enStock === 'true',
                creadoPor: req.user.username,
                bienes: req.body.bienes || [] // Array de {bien_id, cantidad}
            };
            
            const resultado = await ProductoService.crearProducto(productoData);
            
            return res.status(201).json({
                success: true,
                message: 'Producto creado exitosamente',
                data: resultado
            });
        } catch (error) {
            console.error('Error al crear producto:', error);
            return res.status(400).json({
                success: false,
                message: 'Error al crear producto',
                error: error.message
            });
        }
    },
    
    async listarProductos(req, res) {
        try {
            const productos = await ProductoService.obtenerTodosLosProductos();
            
            return res.status(200).json({
                success: true,
                data: productos
            });
        } catch (error) {
            console.error('Error al listar productos:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener productos',
                error: error.message
            });
        }
    },
    
    async vistaNuevoProducto(req, res) {
        try {
            // Obtener lista de bienes para el selector
            const bienesResult = await bienRepository.obtenerTodos(1, 1000, {});
            const bienes = bienesResult.data || [];
            
            return res.render('productosNuevo', {
                title: 'Nuevo Producto',
                username: req.user.username,
                bienes: bienes
            });
        } catch (error) {
            console.error('Error al renderizar la vista de nuevo producto:', error);
            return res.status(500).render('error', {
                message: 'Error al cargar la vista de nuevo producto',
                error: error
            });
        }
    },

    // Nuevo endpoint para la API de productos
    async obtenerProductosAPI(req, res) {
        try {
            const productos = await productoRepository.obtenerTodos();
            
            return res.status(200).json({
                success: true,
                data: productos
            });
        } catch (error) {
            console.error('Error al obtener productos API:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener productos',
                error: error.message
            });
        }
    },

    // Nuevo endpoint para listar productos para planificación (solo los que tienen enStock=true)
    async listarProductosParaPlanificacion(req, res) {
        try {
            const productos = await productoRepository.obtenerProductosEnStock();
            
            return res.status(200).json({
                success: true,
                data: productos
            });
        } catch (error) {
            console.error('Error al listar productos para planificación:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener productos para planificación',
                error: error.message
            });
        }
    },
    
    async vistaListarProductos(req, res) {
        try {
            const productos = await ProductoService.obtenerTodosLosProductos();
            
            return res.render('listarProductos', {
                title: 'Productos',
                username: req.user.username,
                productos: productos
            });
        } catch (error) {
            console.error('Error al renderizar vista de listar productos:', error);
            return res.status(500).render('error', {
                message: 'Error al listar productos',
                error: error
            });
        }
    },
    
    async vistaEditarProducto(req, res) {
        try {
            const { id } = req.params;
            const producto = await ProductoService.obtenerProductoPorId(id);
            
            // Obtener lista de bienes para el selector
            const bienesResult = await bienRepository.obtenerTodos(1, 1000, {});
            const bienes = bienesResult.data || [];
            
            return res.render('productosEditar', {
                title: 'Editar Producto',
                username: req.user.username,
                producto: producto,
                bienes: bienes
            });
        } catch (error) {
            console.error('Error al renderizar vista de editar producto:', error);
            return res.status(error.message.includes('no encontrado') ? 404 : 500)
                .render('error', {
                    message: error.message.includes('no encontrado') ? 
                        'El producto solicitado no existe' : 
                        'Error al cargar los datos del producto',
                    error: error
                });
        }
    },
    
    async actualizarProducto(req, res) {
        try {
            const { id } = req.params;
            const productoData = {
                nombre: req.body.nombre,
                unidad: req.body.unidad,
                enStock: req.body.enStock === true || req.body.enStock === 'true',
                bienes: req.body.bienes || [] // Array de {bien_id, cantidad}
            };
            
            await ProductoService.actualizarProducto(id, productoData);
            
            return res.status(200).json({
                success: true,
                message: 'Producto actualizado exitosamente'
            });
        } catch (error) {
            console.error('Error al actualizar producto:', error);
            return res.status(error.message.includes('no encontrado') ? 404 : 400).json({
                success: false,
                message: 'Error al actualizar producto',
                error: error.message
            });
        }
    },
    
    async eliminarProducto(req, res) {
        try {
            const { id } = req.params;
            await ProductoService.eliminarProducto(id);
            
            return res.status(200).json({
                success: true,
                message: 'Producto eliminado exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            return res.status(error.message.includes('no encontrado') ? 404 : 500).json({
                success: false,
                message: 'Error al eliminar producto',
                error: error.message
            });
        }
    }
};

module.exports = ProductoController;