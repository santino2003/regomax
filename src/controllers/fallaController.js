const fallaService = require('../services/fallaService');

module.exports = {
    async nuevaFalla(req, res) {
        try {
            const resultado = await fallaService.crearFalla({
                ...req.body,
                responsable: req.user.username
            });
            return res.status(201).json(resultado);
        } catch (error) {
            console.error('Error al crear falla:', error);
            return res.status(400).json({ success: false, error: error.message || 'Error al crear falla' });
        }
    },

    async modificarFalla(req, res) {
        try {
            const resultado = await fallaService.modificarFalla(req.params.id, req.body.nombre);
            return res.status(200).json(resultado);
        } catch (error) {
            console.error('Error al modificar falla:', error);
            return res.status(400).json({ success: false, error: error.message || 'Error al modificar falla' });
        }
    },

    async eliminarFalla(req, res) {
        try {
            const resultado = await fallaService.eliminarFalla(req.params.id);
            return res.status(200).json(resultado);
        } catch (error) {
            console.error('Error al eliminar falla:', error);
            return res.status(500).json({ success: false, error: error.message || 'Error al eliminar falla' });
        }
    },

    async obtenerFallas(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            return res.status(200).json(await fallaService.obtenerTodas(page, limit));
        } catch (error) {
            console.error('Error al obtener fallas:', error);
            return res.status(500).json({ success: false, error: 'Error al obtener fallas' });
        }
    },

    async vistaListarFallas(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const resultado = await fallaService.obtenerTodas(page, limit);
            res.render('listarFallas', {
                username: req.user.username,
                fallas: resultado.data,
                pagination: resultado.pagination
            });
        } catch (error) {
            console.error('Error al listar fallas:', error);
            res.status(500).render('error', { message: 'Error al listar fallas', error });
        }
    },

    vistaNuevaFalla(req, res) {
        res.render('fallasNuevo', { username: req.user.username });
    },

    async vistaVerFalla(req, res) {
        try {
            const falla = await fallaService.obtenerPorId(req.params.id);
            res.render('fallasVer', { username: req.user.username, falla });
        } catch (error) {
            res.status(404).render('error', { message: 'Falla no encontrada', error });
        }
    },

    async vistaEditarFalla(req, res) {
        try {
            const falla = await fallaService.obtenerPorId(req.params.id);
            res.render('fallasEditar', { username: req.user.username, falla });
        } catch (error) {
            res.status(404).render('error', { message: 'Falla no encontrada', error });
        }
    }
};
