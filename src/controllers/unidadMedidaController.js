const unidadMedidaService = require('../services/unidadMedidaService');

const unidadMedidaController = {
    async nuevaUnidadMedida(req, res) {
        try {
            const unidadData = req.body;
            unidadData.responsable = req.user.username;
            await unidadMedidaService.crearUnidadMedida(unidadData);
            return res.status(201).json({
                success: true,
                message: 'Unidad de medida agregada exitosamente',
            });
        } catch (error) {
            console.error('Error al crear unidad de medida:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al crear unidad de medida' 
            });
        }
    },

    async modificarUnidadMedida(req, res) {
        try {
            const { id } = req.params;
            const { nombre, nombreLindo } = req.body;

            if (!nombre || nombre.trim() === '') {
                return res.status(400).json({ error: 'El nombre de la unidad de medida es obligatorio' });
            }

            if (!nombreLindo || nombreLindo.trim() === '') {
                return res.status(400).json({ error: 'El nombre lindo de la unidad de medida es obligatorio' });
            }

            await unidadMedidaService.modificarUnidadMedida(id, nombre.trim(), nombreLindo.trim());
            return res.status(200).json({
                success: true,
                message: 'Unidad de medida modificada exitosamente',
            });
        } catch (error) {
            console.error('Error al modificar unidad de medida:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al modificar unidad de medida' 
            });
        }
    },
    
    async eliminarUnidadMedida(req, res) {
        try {
            const { id } = req.params;
            await unidadMedidaService.eliminarUnidadMedida(id);
            return res.status(200).json({
                success: true,
                message: 'Unidad de medida eliminada exitosamente',
            });
        } catch (error) {
            console.error('Error al eliminar unidad de medida:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al eliminar unidad de medida' 
            });
        }
    },

    async obtenerUnidadesMedida(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const resultado = await unidadMedidaService.obtenerTodas(page, limit);
            return res.status(200).json(resultado);
        } catch (error) {
            console.error('Error al obtener unidades de medida:', error);
            return res.status(500).json({ error: 'Error al obtener unidades de medida' });
        }
    },

    // Vistas
    async vistaListarUnidadesMedida(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            const resultado = await unidadMedidaService.obtenerTodas(page, limit);
            
            res.render('listarUnidadesMedida', {
                username: req.user.username,
                unidadesMedida: resultado.data,
                pagination: resultado.pagination
            });
        } catch (error) {
            console.error('Error al listar unidades de medida:', error);
            res.status(500).render('error', {
                message: 'Error al listar unidades de medida',
                error
            });
        }
    },

    async vistaNuevaUnidadMedida(req, res) {
        try {
            res.render('unidadesMedidaNuevo', {
                username: req.user.username
            });
        } catch (error) {
            console.error('Error al renderizar vista de nueva unidad de medida:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista de nueva unidad de medida',
                error
            });
        }
    },

    async vistaVerUnidadMedida(req, res) {
        try {
            const { id } = req.params;
            const unidadMedida = await unidadMedidaService.obtenerPorId(id);
            
            if (!unidadMedida) {
                return res.status(404).render('error', {
                    message: 'Unidad de medida no encontrada',
                    username: req.user.username
                });
            }

            res.render('unidadesMedidaVer', {
                username: req.user.username,
                unidadMedida
            });
        } catch (error) {
            console.error('Error al ver unidad de medida:', error);
            res.status(500).render('error', {
                message: 'Error al cargar los detalles de la unidad de medida',
                error
            });
        }
    },

    async vistaEditarUnidadMedida(req, res) {
        try {
            const { id } = req.params;
            const unidadMedida = await unidadMedidaService.obtenerPorId(id);
            
            if (!unidadMedida) {
                return res.status(404).render('error', {
                    message: 'Unidad de medida no encontrada',
                    username: req.user.username
                });
            }

            res.render('unidadesMedidaEditar', {
                username: req.user.username,
                unidadMedida
            });
        } catch (error) {
            console.error('Error al cargar vista de edición de unidad de medida:', error);
            res.status(500).render('error', {
                message: 'Error al cargar el formulario de edición',
                error
            });
        }
    },
};

module.exports = unidadMedidaController;
