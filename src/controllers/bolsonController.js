const bolsonService = require('../services/bolsonService');

const bolsonController = {
    async nuevoBolson(req, res) {
        try {
            const bolsonData = req.body;
            // bolsonData.responsable = req.user.username; // Descomenta esta línea si tienes autenticación y quieres usar el usuario autenticado
            bolsonData.responsable = 'admin'; // Cambia esto por el usuario real si tienes autenticación
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
            const bolsones = await bolsonService.obtenerTodos();
            return res.status(200).json({
                success: true,
                data: bolsones
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
            const bolsones = await bolsonService.obtenerTodos();
            res.render('listarBolsones', { 
                username: req.user.username,
                bolsones: bolsones
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
            res.render('bolsonesNuevo', { 
                username: req.user.username
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
            const bolson = await bolsonService.obtenerPorId(id);
            
            if (!bolson) {
                return res.status(404).render('error', { 
                    message: 'Bolsón no encontrado'
                });
            }
            
            res.render('bolsonesEditar', { 
                username: req.user.username,
                bolson: bolson
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
    }
};

module.exports = bolsonController;