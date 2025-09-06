const planificacionRepository = require('../repositories/planificacionRepository');
const productoRepository = require('../repositories/productoRepository');

class PlanificacionController {
    /**
     * Obtiene la planificación de producción para una fecha específica
     */
    async obtenerPlanificacion(req, res) {
        try {
            const { anio, mes, dia } = req.params;
            
            // Validar parámetros
            if (!anio || !mes || !dia) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren año, mes y día para obtener la planificación'
                });
            }
            
            const planificacion = await planificacionRepository.obtenerPlanificacion(
                parseInt(anio),
                parseInt(mes),
                parseInt(dia)
            );
            
            return res.json({
                success: true,
                data: planificacion
            });
        } catch (error) {
            console.error('Error al obtener planificación:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener la planificación de producción',
                error: error.message
            });
        }
    }
    
    /**
     * Guarda o actualiza una planificación de producción
     */
    async guardarPlanificacion(req, res) {
        try {
            const { anio, mes, dia, productos } = req.body;
            
            // Validar parámetros
            if (!anio || !mes || !dia) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren año, mes y día para guardar la planificación'
                });
            }
            
            // Validar que los productos sean un objeto
            if (!productos || typeof productos !== 'object') {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere un objeto con los productos y sus kilos'
                });
            }
            
            // Obtener ID de usuario de la sesión si está disponible
            const usuarioId = req.session?.usuario?.id || null;
            
            // Guardar la planificación
            const planificacion = await planificacionRepository.guardarPlanificacion(
                parseInt(anio),
                parseInt(mes),
                parseInt(dia),
                productos,
                usuarioId
            );
            
            return res.json({
                success: true,
                data: planificacion,
                message: 'Planificación de producción guardada correctamente'
            });
        } catch (error) {
            console.error('Error al guardar planificación:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al guardar la planificación de producción',
                error: error.message
            });
        }
    }
    
    /**
     * Elimina una planificación de producción
     */
    async eliminarPlanificacion(req, res) {
        try {
            const { anio, mes, dia } = req.params;
            
            // Validar parámetros
            if (!anio || !mes || !dia) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren año, mes y día para eliminar la planificación'
                });
            }
            
            const resultado = await planificacionRepository.eliminarPlanificacion(
                parseInt(anio),
                parseInt(mes),
                parseInt(dia)
            );
            
            return res.json({
                success: true,
                data: resultado,
                message: 'Planificación de producción eliminada correctamente'
            });
        } catch (error) {
            console.error('Error al eliminar planificación:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al eliminar la planificación de producción',
                error: error.message
            });
        }
    }
}

module.exports = new PlanificacionController();