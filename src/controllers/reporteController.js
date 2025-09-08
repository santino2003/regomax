const reporteService = require('../services/reporteService');
const { fechaActual, formatMySQLLocal } = require('../utils/fecha');

/**
 * Genera un reporte completo de producción y despacho para una fecha específica
 * @param {Object} req - Request HTTP
 * @param {Object} res - Response HTTP
 */
const generarReporteCompleto = async (req, res) => {
    try {
        const { fecha } = req.query;
        
        // Validar que fecha sea un parámetro válido
        if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Formato de fecha inválido. Use YYYY-MM-DD' 
            });
        }
        
        const reporte = await reporteService.obtenerReporteCompleto(fecha);
        
        return res.status(200).json({
            success: true,
            data: reporte
        });
    } catch (error) {
        console.error('Error al generar reporte completo:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al generar el reporte completo',
            error: error.message
        });
    }
};

/**
 * Renderiza la vista del reporte productivo (antes reporte general consolidado)
 * @param {Object} req - Request HTTP
 * @param {Object} res - Response HTTP
 */
const mostrarReporteGeneral = async (req, res) => {
    try {
        // Obtener fecha actual o la seleccionada por el usuario
        const fechaObj = fechaActual();
        const fechaSeleccionada = req.query.fecha || formatMySQLLocal(fechaObj).split(' ')[0];
        
        res.render('reporteGeneral', { 
            titulo: 'Reporte Productivo',
            username: req.user.username,
            user: req.user,
            fechaSeleccionada: fechaSeleccionada
        });
    } catch (error) {
        console.error('Error al mostrar el reporte productivo:', error);
        res.status(500).render('error', {
            message: 'Error al cargar el reporte productivo',
            error: { status: 500, stack: error.stack }
        });
    }
};

module.exports = {
    generarReporteCompleto,
    mostrarReporteGeneral
};