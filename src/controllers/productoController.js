const ProductoService = require('../services/productoService');

const ProductoController = {
    async crearProducto(req, res) {
        try {
            const productoData = {
                nombre: req.body.nombre,
                unidad: req.body.unidad,
                enStock: req.body.enStock === true || req.body.enStock === 'true',
                creadoPor: req.user.username
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
            return res.render('productosNuevo', {
                title: 'Nuevo Producto',
                username: req.user.username
            });
        } catch (error) {
            console.error('Error al renderizar la vista de nuevo producto:', error);
            return res.status(500).render('error', {
                message: 'Error al cargar la vista de nuevo producto',
                error: error
            });
        }
    }
};

module.exports = ProductoController;