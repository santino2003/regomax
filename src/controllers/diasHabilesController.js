const diasHabilesService = require('../services/diasHabilesService');
const { fechaActual } = require('../utils/fecha');

const diasHabilesController = {
    /**
     * Muestra la vista del calendario para seleccionar días hábiles
     */
    async mostrarCalendario(req, res) {
        try {
            // Obtener fecha actual o la proporcionada en la consulta
            const fechaObj = fechaActual();
            const mesActual = parseInt(req.query.mes) || fechaObj.getMonth() + 1;
            const anioActual = parseInt(req.query.anio) || fechaObj.getFullYear();
            
            // Obtener datos del calendario
            const calendario = await diasHabilesService.obtenerCalendarioMensual(mesActual, anioActual);
            
            // Obtener todos los registros para mostrar historial
            const registros = await diasHabilesService.obtenerTodos();
            
            // Nombre del mes en español
            const nombresMeses = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];
            
            // Renderizar vista
            res.render('diasHabiles', {
                title: 'Calendario de Días Hábiles',
                calendario,
                registros,
                mesActual,
                anioActual,
                nombreMes: nombresMeses[mesActual - 1],
                nombresMeses,
                username: req.user ? req.user.username : 'Usuario',
                user: req.user
            });
        } catch (error) {
            console.error('Error al mostrar calendario:', error);
            res.status(500).render('error', {
                message: 'Error al cargar el calendario de días hábiles',
                error: { status: 500, stack: error.stack }
            });
        }
    },
    
    /**
     * Guarda los días hábiles seleccionados por el usuario
     */
    async guardarDiasHabiles(req, res) {
        try {
            const { mes, anio, dias } = req.body;
            
            // Convertir los días a números enteros
            const diasSeleccionados = dias ? dias.map(Number) : [];
            
            // Guardar días hábiles
            const resultado = await diasHabilesService.guardarDiasHabilesSeleccionados(
                parseInt(mes),
                parseInt(anio),
                diasSeleccionados
            );
            
            res.status(200).json({
                success: true,
                message: 'Días hábiles guardados correctamente',
                data: resultado
            });
        } catch (error) {
            console.error('Error al guardar días hábiles:', error);
            res.status(500).json({
                success: false,
                message: 'Error al guardar días hábiles',
                error: error.message
            });
        }
    },
    
    /**
     * Obtiene los días hábiles seleccionados para un mes y año específico
     */
    async obtenerDiasHabiles(req, res) {
        try {
            const { mes, anio } = req.query;
            
            // Obtener datos del calendario
            const calendario = await diasHabilesService.obtenerCalendarioMensual(
                parseInt(mes),
                parseInt(anio)
            );
            
            res.status(200).json({
                success: true,
                data: calendario
            });
        } catch (error) {
            console.error('Error al obtener días hábiles:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener días hábiles',
                error: error.message
            });
        }
    },
    
    /**
     * Elimina los días hábiles para un mes y año específico
     */
    async eliminarDiasHabiles(req, res) {
        try {
            const { mes, anio } = req.params;
            
            // Eliminar días hábiles
            await diasHabilesService.eliminarDiasHabiles(parseInt(mes), parseInt(anio));
            
            res.status(200).json({
                success: true,
                message: 'Días hábiles eliminados correctamente'
            });
        } catch (error) {
            console.error('Error al eliminar días hábiles:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar días hábiles',
                error: error.message
            });
        }
    }
};

module.exports = diasHabilesController;