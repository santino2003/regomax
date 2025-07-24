const bolsonService = require('../services/bolsonService');
const productoService = require('../services/productoService'); // Añadimos esta importación
const generarBarcodeBase64 = require('../utils/imageBarcode');

const bolsonController = {
    async nuevoBolson(req, res) {
        try {
            const bolsonData = req.body;
            bolsonData.responsable = req.user.username; // Descomenta esta línea si tienes autenticación y quieres usar el usuario autenticado
            const result = await bolsonService.crearBolson(bolsonData);
            return res.status(201).json({
                success: true,
                message: 'Bolson creado exitosamente',
                data: {codigo: result.codigo
                    , barcodeBase64: result.barcodeBase64   
                }
            });
        } catch (error) {
            console.error('Error al crear bolson:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al crear bolson',
                error: error.message
            });
        }
    },
    async listarBolsones(req, res) {
        try {
            // Obtener parámetros de paginación y ordenación de la solicitud
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const sortBy = req.query.sortBy || 'id';
            const sortOrder = req.query.sortOrder || 'DESC';
            // Solo mostrar bolsones no despachados
            const resultado = await bolsonService.obtenerNoDespachados(page, limit, sortBy, sortOrder);
            return res.status(200).json({
                success: true,
                data: resultado.data,
                pagination: resultado.pagination
            });
        } catch (error) {
            console.error('Error al listar bolsones:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener bolsones',
                error: error.message
            });
        }
    },
    async obtenerBolson(req, res) {
        try {
            const { id } = req.params;
            const bolson = await bolsonService.obtenerPorId(id);
            
            if (!bolson) {
                return res.status(404).json({
                    success: false,
                    message: 'Bolsón no encontrado'
                });
            }
            
            return res.status(200).json({
                success: true,
                data: bolson
            });
        } catch (error) {
            console.error('Error al obtener bolson:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener bolsón',
                error: error.message
            });
        }
    },
    async actualizarBolson(req, res) {
        try {
            const { id } = req.params;
            const datosActualizados = req.body; // Aquí están los datos del formulario
            
            const bolson = await bolsonService.actualizar(id, datosActualizados);
            
            if (!bolson) {
                return res.status(404).json({
                    success: false,
                    message: 'Bolsón no encontrado'
                });
            }
            
            return res.status(200).json({
                success: true,
                message: 'Bolsón actualizado correctamente',
                data: bolson
            });
        } catch (error) {
            console.error('Error al actualizar bolson:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al actualizar bolsón',
                error: error.message
            });
        }
    },
    
    // Nuevo método para renderizar la vista de listar bolsones
    async vistaListarBolsones(req, res) {
        try {
            // Parámetros de paginación para la vista
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            // Solo mostrar bolsones no despachados
            const resultado = await bolsonService.obtenerNoDespachados(page, limit, 'id', 'DESC');
            res.render('listarBolsones', { 
                username: req.user.username,
                bolsones: resultado.data,
                pagination: resultado.pagination
            });
        } catch (error) {
            console.error('Error al renderizar vista de bolsones:', error);
            res.status(500).render('error', { 
                message: 'Error al cargar la lista de bolsones',
                error: error
            });
        }
    },
    
    async vistaNuevoBolson(req, res) {
        try {
            // Obtener solo productos que están en stock para el desplegable
            const productos = await productoService.obtenerProductosEnStock();
            
            res.render('bolsonesNuevo', { 
                username: req.user.username,
                productos: productos // Pasamos los productos a la vista
            });
        } catch (error) {
            console.error('Error al renderizar vista de nuevo bolson:', error);
            res.status(500).render('error', { 
                message: 'Error al cargar formulario de nuevo bolsón',
                error: error
            });
        }
    },
    
    async vistaEditarBolson(req, res) {
        try {
            const { id } = req.params;
            
            // Verificar si el ID es válido antes de buscar
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).render('error', { 
                    message: 'ID de bolsón inválido',
                    error: { status: 400, stack: 'El ID proporcionado no es válido' }
                });
            }
            
            // Intentar obtener el bolsón
            let bolson;
            try {
                bolson = await bolsonService.obtenerPorId(id);
            } catch (error) {
                // Si el error es específicamente "Bolsón no encontrado"
                if (error.message.includes('Bolsón no encontrado')) {
                    return res.status(404).render('error', { 
                        message: `El bolsón con ID ${id} no existe o ha sido eliminado`,
                        error: { status: 404, stack: error.message }
                    });
                }
                // Para otros errores, propagarlos
                throw error;
            }
            
            // Generar el código de barras en base64 si no existe
            if (!bolson.barcodeBase64 && bolson.codigo) {
                try {
                    bolson.barcodeBase64 = await generarBarcodeBase64(bolson.codigo);
                } catch (e) {
                    console.error('Error al generar código de barras:', e);
                }
            }
            
            // Obtener solo productos que están en stock para el desplegable
            const productos = await productoService.obtenerProductosEnStock();
            
            res.render('bolsonesEditar', { 
                username: req.user.username,
                bolson: bolson,
                productos: productos // Pasamos los productos a la vista
            });
        } catch (error) {
            console.error('Error al renderizar vista de editar bolson:', error);
            res.status(500).render('error', { 
                message: 'Error al cargar formulario de edición',
                error: error
            });
        }
    },
    async eliminarBolson(req, res) {
        try {
            const { id } = req.params;
            const resultado = await bolsonService.eliminar(id);
            
            if (!resultado) {
                return res.status(404).json({
                    success: false,
                    message: 'Bolsón no encontrado'
                });
            }
            
            return res.status(200).json({
                success: true,
                message: 'Bolsón eliminado correctamente'
            });
        } catch (error) {
            console.error('Error al eliminar bolson:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al eliminar bolsón',
                error: error.message
            });
        }
    },

    /**
     * Renderiza la vista de bolsones despachados
     */
    async vistaBolsonesDespachados(req, res) {
        try {
            // Parámetros de paginación para la vista
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            // Obtener bolsones despachados (si existe este método en el servicio)
            const resultado = await bolsonService.obtenerDespachados(page, limit, 'id', 'DESC');
            
            res.render('bolsonesDespachados', { 
                username: req.user.username,
                bolsones: resultado.data,
                pagination: resultado.pagination
            });
        } catch (error) {
            console.error('Error al renderizar vista de bolsones despachados:', error);
            res.status(500).render('error', { 
                message: 'Error al cargar la lista de bolsones despachados',
                error: error
            });
        }
    },

    /**
     * Obtiene todos los bolsones disponibles (no despachados)
     * @param {Object} req - Objeto de solicitud
     * @param {Object} res - Objeto de respuesta
     */
    async obtenerTodosLosBolsones(req, res) {
        try {
            const bolsones = await bolsonService.obtenerBolsonesDisponibles();
            res.status(200).json({ success: true, bolsones });
        } catch (error) {
            console.error('Error al obtener bolsones:', error);
            res.status(500).json({ success: false, message: 'Error al obtener bolsones', error: error.message });
        }
    }
};

module.exports = bolsonController;