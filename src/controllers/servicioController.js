const servicioService = require('../services/servicioService');

const servicioController = {
    async nuevoServicio(req, res) {
        try {
            const servicioData = req.body;
            servicioData.responsable = req.user.username;
            await servicioService.crearServicio(servicioData);
            return res.status(201).json({
                success: true,
                message: 'Servicio agregado exitosamente',
            });
        } catch (error) {
            console.error('Error al crear servicio:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al crear servicio' 
            });
        }
    },

    async modificarServicio(req, res) {
        try {
            const { id } = req.params;
            const { nombre } = req.body;

            if (!nombre || nombre.trim() === '') {
                return res.status(400).json({ error: 'El nombre del servicio es obligatorio' });
            }

            await servicioService.modificarServicio(id, nombre.trim());
            return res.status(200).json({
                success: true,
                message: 'Servicio modificado exitosamente',
            });
        } catch (error) {
            console.error('Error al modificar servicio:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al modificar servicio' 
            });
        }
    },
    
    async eliminarServicio(req, res) {
        try {
            const { id } = req.params;
            await servicioService.eliminarServicio(id);
            return res.status(200).json({
                success: true,
                message: 'Servicio eliminado exitosamente',
            });
        } catch (error) {
            console.error('Error al eliminar servicio:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al eliminar servicio' 
            });
        }
    },

    async obtenerServicios(req, res) {
        try {
            const servicios = await servicioService.obtenerTodas();
            return res.status(200).json(servicios);
        } catch (error) {
            console.error('Error al obtener servicios:', error);
            return res.status(500).json({ error: 'Error al obtener servicios' });
        }
    },

    // Vistas
    async vistaListarServicios(req, res) {
        try {
            // Obtener parámetros de paginación
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            const resultado = await servicioService.obtenerTodas(page, limit);
            res.render('listarServicios', {
                username: req.user.username,
                servicios: resultado.data,
                pagination: resultado.pagination
            });
        } catch (error) {
            console.error('Error al listar servicios:', error);
            res.status(500).render('error', {
                message: 'Error al listar servicios',
                error
            });
        }
    },

    async vistaNuevoServicio(req, res) {
        try {
            res.render('serviciosNuevo', {
                username: req.user.username
            });
        } catch (error) {
            console.error('Error al renderizar vista de nuevo servicio:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista de nuevo servicio',
                error
            });
        }
    },

    async vistaVerServicio(req, res) {
        try {
            const { id } = req.params;
            const servicio = await servicioService.obtenerPorId(id);
            
            if (!servicio) {
                return res.status(404).render('error', {
                    message: 'Servicio no encontrado',
                    username: req.user.username
                });
            }

            res.render('serviciosVer', {
                username: req.user.username,
                servicio
            });
        } catch (error) {
            console.error('Error al ver servicio:', error);
            res.status(500).render('error', {
                message: 'Error al cargar los detalles del servicio',
                error
            });
        }
    },

    async vistaEditarServicio(req, res) {
        try {
            const { id } = req.params;
            const servicio = await servicioService.obtenerPorId(id);
            
            if (!servicio) {
                return res.status(404).render('error', {
                    message: 'Servicio no encontrado',
                    username: req.user.username
                });
            }

            res.render('serviciosEditar', {
                username: req.user.username,
                servicio
            });
        } catch (error) {
            console.error('Error al cargar vista de edición de servicio:', error);
            res.status(500).render('error', {
                message: 'Error al cargar el formulario de edición',
                error
            });
        }
    },
};

module.exports = servicioController;
