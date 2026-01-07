const centroCostoService = require('../services/centroCostoService');

const centroCostoController = {
    async nuevo(req, res) {
        try {
            const centroCostoData = req.body;
            centroCostoData.responsable = req.user.username;
            await centroCostoService.crear(centroCostoData);
            return res.status(201).json({
                success: true,
                message: 'Centro de costo agregado exitosamente',
            });
        } catch (error) {
            console.error('Error al crear centro de costo:', error);
            return res.status(500).json({ 
                success: false,
                error: error.message || 'Error al crear centro de costo' 
            });
        }
    },

    async modificar(req, res) {
        try {
            const { id } = req.params;
            const { nombre } = req.body;

            if (!nombre || nombre.trim() === '') {
                return res.status(400).json({ error: 'El nombre del centro de costo es obligatorio' });
            }

            await centroCostoService.modificar(id, nombre.trim());
            return res.status(200).json({
                success: true,
                message: 'Centro de costo modificado exitosamente',
            });
        } catch (error) {
            console.error('Error al modificar centro de costo:', error);
            return res.status(500).json({ 
                success: false,
                error: error.message || 'Error al modificar centro de costo' 
            });
        }
    },
    
    async eliminar(req, res) {
        try {
            const { id } = req.params;
            await centroCostoService.eliminar(id);
            return res.status(200).json({
                success: true,
                message: 'Centro de costo eliminado exitosamente',
            });
        } catch (error) {
            console.error('Error al eliminar centro de costo:', error);
            return res.status(500).json({ 
                success: false,
                error: error.message || 'Error al eliminar centro de costo' 
            });
        }
    },

    async cambiarEstado(req, res) {
        try {
            const { id } = req.params;
            const { activo } = req.body;

            await centroCostoService.cambiarEstado(id, activo);
            return res.status(200).json({
                success: true,
                message: `Centro de costo ${activo ? 'activado' : 'desactivado'} exitosamente`,
            });
        } catch (error) {
            console.error('Error al cambiar estado:', error);
            return res.status(500).json({ 
                success: false,
                error: error.message || 'Error al cambiar estado' 
            });
        }
    },

    async obtenerTodos(req, res) {
        try {
            const centrosCosto = await centroCostoService.obtenerTodos();
            return res.status(200).json(centrosCosto);
        } catch (error) {
            console.error('Error al obtener centros de costo:', error);
            return res.status(500).json({ error: 'Error al obtener centros de costo' });
        }
    },

    async obtenerActivos(req, res) {
        try {
            const centrosCosto = await centroCostoService.obtenerActivos();
            return res.status(200).json(centrosCosto);
        } catch (error) {
            console.error('Error al obtener centros de costo activos:', error);
            return res.status(500).json({ error: 'Error al obtener centros de costo activos' });
        }
    },

    // Vistas
    async vistaListar(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            const resultado = await centroCostoService.obtenerTodos(page, limit);
            res.render('listarCentrosCosto', {
                username: req.user.username,
                centrosCosto: resultado.data,
                pagination: resultado.pagination
            });
        } catch (error) {
            console.error('Error al listar centros de costo:', error);
            res.status(500).render('error', {
                message: 'Error al listar centros de costo',
                error
            });
        }
    },

    async vistaNuevo(req, res) {
        try {
            res.render('centrosCostoNuevo', {
                username: req.user.username
            });
        } catch (error) {
            console.error('Error al renderizar vista de nuevo centro de costo:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista de nuevo centro de costo',
                error
            });
        }
    },

    async vistaVer(req, res) {
        try {
            const { id } = req.params;
            const centroCosto = await centroCostoService.obtenerPorId(id);
            
            if (!centroCosto) {
                return res.status(404).render('error', {
                    message: 'Centro de costo no encontrado',
                    username: req.user.username
                });
            }

            res.render('centrosCostoVer', {
                username: req.user.username,
                centroCosto
            });
        } catch (error) {
            console.error('Error al ver centro de costo:', error);
            res.status(500).render('error', {
                message: 'Error al cargar los detalles del centro de costo',
                error
            });
        }
    },

    async vistaEditar(req, res) {
        try {
            const { id } = req.params;
            const centroCosto = await centroCostoService.obtenerPorId(id);
            
            if (!centroCosto) {
                return res.status(404).render('error', {
                    message: 'Centro de costo no encontrado',
                    username: req.user.username
                });
            }

            res.render('centrosCostoEditar', {
                username: req.user.username,
                centroCosto
            });
        } catch (error) {
            console.error('Error al cargar vista de edición de centro de costo:', error);
            res.status(500).render('error', {
                message: 'Error al cargar el formulario de edición',
                error
            });
        }
    },
};

module.exports = centroCostoController;
