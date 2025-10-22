const reporteARService = require('../services/reporteARService');
const { fechaActual, formatMySQLLocal } = require('../utils/fecha');

/**
 * Genera el reporte AR en formato JSON para la API
 */
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

/**
 * Muestra la vista del reporte AR
 */
const mostrarReporteAR = async (req, res) => {
    try {
        // Obtener fecha actual o la seleccionada por el usuario
        const fechaObj = fechaActual();
        const fechaSeleccionada = req.query.fecha || formatMySQLLocal(fechaObj).split(' ')[0];
        
        res.render('reporteAR', { 
            titulo: 'Reporte A.R',
            username: req.user.username,
            user: req.user,
            fechaSeleccionada: fechaSeleccionada
        });
    } catch (error) {
        console.error('Error al mostrar el reporte AR:', error);
        res.status(500).render('error', {
            message: 'Error al cargar el reporte AR',
            error: { status: 500, stack: error.stack },
            user: req.user
        });
    }
}

module.exports = {
    generarReporteAR,
    mostrarReporteAR
};