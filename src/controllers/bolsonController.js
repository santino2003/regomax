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
                data: result.codigo
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
}

module.exports = bolsonController;