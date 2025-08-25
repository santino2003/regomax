const reporteService = require('../services/reporteService');

class ReporteController {
    // Vista para planificar el mes (calendario de días hábiles)
    async vistaPlanificarMes(req, res) {
        try {
            const mes = parseInt(req.query.mes) || new Date().getMonth() + 1; // Mes actual si no se especifica
            const anio = parseInt(req.query.anio) || new Date().getFullYear(); // Año actual si no se especifica
            
            // Obtener días hábiles del mes si ya están configurados
            const diasHabiles = await reporteService.obtenerDiasHabilesMes(mes, anio);
            
            res.render('reportes/planificarMes', {
                title: 'Planificar Días Hábiles',
                username: req.user.username,
                mes,
                anio,
                diasHabiles
            });
        } catch (error) {
            console.error('Error al renderizar vista de planificación mensual:', error);
            res.status(500).render('error', { 
                message: 'Error al cargar la planificación mensual',
                error: error
            });
        }
    }
    
    // Vista para cargar NFU diarios
    async vistaCargarNFU(req, res) {
        try {
            const fecha = req.query.fecha || new Date().toISOString().split('T')[0]; // Fecha actual si no se especifica
            
            // Verificar si ya hay datos cargados para esta fecha
            const datosFecha = await reporteService.obtenerDatosNFUPorFecha(fecha);
            
            res.render('reportes/cargarNFU', {
                title: 'Cargar Ingreso de NFU',
                username: req.user.username,
                fecha,
                datosCargados: datosFecha
            });
        } catch (error) {
            console.error('Error al renderizar vista de carga de NFU:', error);
            res.status(500).render('error', { 
                message: 'Error al cargar la vista de ingreso de NFU',
                error: error
            });
        }
    }
    
    // Vista del reporte (con cálculos y proyecciones)
    async vistaReporte(req, res) {
        try {
            const fecha = req.query.fecha || new Date().toISOString().split('T')[0]; // Fecha actual si no se especifica
            const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;
            const anio = parseInt(req.query.anio) || new Date().getFullYear();
            
            // Obtener datos para el reporte
            const reporte = await reporteService.generarReporte(fecha, mes, anio);
            
            res.render('reportes/verReporte', {
                title: 'Reporte de NFU',
                username: req.user.username,
                fecha,
                reporte
            });
        } catch (error) {
            console.error('Error al generar reporte:', error);
            res.status(500).render('error', { 
                message: 'Error al generar el reporte',
                error: error
            });
        }
    }
    
    // API para guardar días hábiles del mes
    async guardarDiasHabiles(req, res) {
        try {
            const { mes, anio, diasHabiles } = req.body;
            
            if (!mes || !anio || !diasHabiles) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos requeridos'
                });
            }
            
            await reporteService.guardarDiasHabiles(mes, anio, diasHabiles);
            
            res.json({
                success: true,
                message: 'Días hábiles guardados correctamente'
            });
        } catch (error) {
            console.error('Error al guardar días hábiles:', error);
            res.status(500).json({
                success: false,
                message: 'Error al guardar los días hábiles',
                error: error.message
            });
        }
    }
    
    // API para guardar datos NFU de un día
    async guardarDatosNFU(req, res) {
        try {
            const { fecha, cantidad } = req.body;
            
            if (!fecha || cantidad === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos requeridos'
                });
            }
            
            await reporteService.guardarDatosNFU(fecha, cantidad, req.user.id);
            
            res.json({
                success: true,
                message: 'Datos de NFU guardados correctamente'
            });
        } catch (error) {
            console.error('Error al guardar datos NFU:', error);
            res.status(500).json({
                success: false,
                message: 'Error al guardar los datos de NFU',
                error: error.message
            });
        }
    }
}

module.exports = new ReporteController();