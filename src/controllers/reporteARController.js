const reporteARService = require('../services/reporteARService');
const { fechaActual, formatMySQLLocal } = require('../utils/fecha');

const generarReporteAR = async (req, res) => {
    try {
        const { fecha } = req.query;

        // Validar que fecha sea un parámetro válido
        if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Formato de fecha inválido. Use YYYY-MM-DD' 
            });
        }

        const reporte = await reporteARService.obtenerReporteAR(fecha);

        return res.status(200).json({
            success: true,
            fechaConsulta: fecha,
            data: reporte
        });
    } catch (error) {
        console.error('Error al generar reporte AR:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al generar el reporte AR',
            error: error.message
        });
    }
}

module.exports = {
    generarReporteAR
};