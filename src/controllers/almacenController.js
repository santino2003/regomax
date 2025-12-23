const almacenService = require('../services/almacenService');

const almacenController = {
    async nuevoAlmacen(req, res) {
        try {
            const almacenData = req.body;
            almacenData.responsable = req.user.username;
            await almacenService.crearAlmacen(almacenData);
            return res.status(201).json({
                success: true,
                message: 'Almacén agregado exitosamente',
            });
        } catch (error) {
            console.error('Error al crear almacén:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al crear almacén' 
            });
        }
    },

    async modificarAlmacen(req, res) {
        try {
            const { id } = req.params;
            const { nombre } = req.body;

            if (!nombre || nombre.trim() === '') {
                return res.status(400).json({ error: 'El nombre del almacén es obligatorio' });
            }

            await almacenService.modificarAlmacen(id, nombre.trim());
            return res.status(200).json({
                success: true,
                message: 'Almacén modificado exitosamente',
            });
        } catch (error) {
            console.error('Error al modificar almacén:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al modificar almacén' 
            });
        }
    },
    
    async eliminarAlmacen(req, res) {
        try {
            const { id } = req.params;
            await almacenService.eliminarAlmacen(id);
            return res.status(200).json({
                success: true,
                message: 'Almacén eliminado exitosamente',
            });
        } catch (error) {
            console.error('Error al eliminar almacén:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al eliminar almacén' 
            });
        }
    },

    async obtenerAlmacenes(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const resultado = await almacenService.obtenerTodos(page, limit);
            return res.status(200).json(resultado);
        } catch (error) {
            console.error('Error al obtener almacenes:', error);
            return res.status(500).json({ error: 'Error al obtener almacenes' });
        }
    },

    // Vistas
    async vistaListarAlmacenes(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            const resultado = await almacenService.obtenerTodos(page, limit);
            
            res.render('listarAlmacenes', {
                username: req.user.username,
                almacenes: resultado.data,
                pagination: resultado.pagination
            });
        } catch (error) {
            console.error('Error al listar almacenes:', error);
            res.status(500).render('error', {
                message: 'Error al listar almacenes',
                error
            });
        }
    },

    async vistaNuevoAlmacen(req, res) {
        try {
            res.render('almacenesNuevo', {
                username: req.user.username
            });
        } catch (error) {
            console.error('Error al renderizar vista de nuevo almacén:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista de nuevo almacén',
                error
            });
        }
    },

    async vistaVerAlmacen(req, res) {
        try {
            const { id } = req.params;
            const almacen = await almacenService.obtenerPorId(id);
            
            if (!almacen) {
                return res.status(404).render('error', {
                    message: 'Almacén no encontrado',
                    username: req.user.username
                });
            }

            res.render('almacenesVer', {
                username: req.user.username,
                almacen
            });
        } catch (error) {
            console.error('Error al ver almacén:', error);
            res.status(500).render('error', {
                message: 'Error al cargar los detalles del almacén',
                error
            });
        }
    },

    async vistaEditarAlmacen(req, res) {
        try {
            const { id } = req.params;
            const almacen = await almacenService.obtenerPorId(id);
            
            if (!almacen) {
                return res.status(404).render('error', {
                    message: 'Almacén no encontrado',
                    username: req.user.username
                });
            }

            res.render('almacenesEditar', {
                username: req.user.username,
                almacen
            });
        } catch (error) {
            console.error('Error al cargar vista de edición de almacén:', error);
            res.status(500).render('error', {
                message: 'Error al cargar el formulario de edición',
                error
            });
        }
    },
};

module.exports = almacenController;
