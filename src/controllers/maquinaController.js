const maquinaService = require('../services/maquinaService');

const maquinaController = {
    async nuevaMaquina(req, res) {
        try {
            const maquinaData = req.body;
            maquinaData.responsable = req.user.username;
            await maquinaService.crearMaquina(maquinaData);
            return res.status(201).json({
                success: true,
                message: 'Máquina agregada exitosamente'
            });
        } catch (error) {
            console.error('Error al crear máquina:', error);
            return res.status(400).json({
                success: false,
                error: error.message || 'Error al crear máquina'
            });
        }
    },

    async modificarMaquina(req, res) {
        try {
            const { id } = req.params;
            await maquinaService.modificarMaquina(id, req.body);
            return res.status(200).json({
                success: true,
                message: 'Máquina modificada exitosamente'
            });
        } catch (error) {
            console.error('Error al modificar máquina:', error);
            return res.status(400).json({
                success: false,
                error: error.message || 'Error al modificar máquina'
            });
        }
    },

    async eliminarMaquina(req, res) {
        try {
            await maquinaService.eliminarMaquina(req.params.id);
            return res.status(200).json({
                success: true,
                message: 'Máquina eliminada exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar máquina:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al eliminar máquina'
            });
        }
    },

    async obtenerMaquinas(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const resultado = await maquinaService.obtenerTodas(page, limit);
            return res.status(200).json(resultado);
        } catch (error) {
            console.error('Error al obtener máquinas:', error);
            return res.status(500).json({ error: 'Error al obtener máquinas' });
        }
    },

    async vistaListarMaquinas(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const resultado = await maquinaService.obtenerTodas(page, limit);

            res.render('listarMaquinas', {
                username: req.user.username,
                maquinas: resultado.data,
                pagination: resultado.pagination
            });
        } catch (error) {
            console.error('Error al listar máquinas:', error);
            res.status(500).render('error', {
                message: 'Error al listar máquinas',
                error
            });
        }
    },

    async vistaNuevaMaquina(req, res) {
        res.render('maquinasNuevo', {
            username: req.user.username
        });
    },

    async vistaVerMaquina(req, res) {
        try {
            const maquina = await maquinaService.obtenerPorId(req.params.id);
            res.render('maquinasVer', {
                username: req.user.username,
                maquina
            });
        } catch (error) {
            res.status(404).render('error', {
                message: 'Máquina no encontrada',
                error
            });
        }
    },

    async vistaEditarMaquina(req, res) {
        try {
            const maquina = await maquinaService.obtenerPorId(req.params.id);
            res.render('maquinasEditar', {
                username: req.user.username,
                maquina
            });
        } catch (error) {
            res.status(404).render('error', {
                message: 'Máquina no encontrada',
                error
            });
        }
    }
};

module.exports = maquinaController;
