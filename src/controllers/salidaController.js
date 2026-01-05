const salidaService = require('../services/salidaService');

const salidaController = {
    /**
     * Vista: Nueva salida
     */
    async vistaNuevaSalida(req, res) {
        try {
            res.render('salidaNuevo', {
                username: req.user.username
            });
        } catch (error) {
            console.error('Error al cargar vista de salida:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista de salida',
                error
            });
        }
    },

    /**
     * API: Buscar bien/kit por código
     */
    async buscarPorCodigo(req, res) {
        try {
            const { codigo } = req.body;
            const resultado = await salidaService.buscarPorCodigo(codigo);
            return res.status(200).json(resultado);
        } catch (error) {
            console.error('Error al buscar por código:', error);
            return res.status(404).json({
                success: false,
                error: error.message || 'Error al buscar el código'
            });
        }
    },

    /**
     * API: Procesar salida
     */
    async procesarSalida(req, res) {
        try {
            const salidaData = {
                ...req.body,
                usuario_sistema: req.user.username
            };

            const resultado = await salidaService.procesarSalida(salidaData);
            return res.status(200).json(resultado);
        } catch (error) {
            console.error('Error al procesar salida:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Error al procesar la salida'
            });
        }
    }
};

module.exports = salidaController;
