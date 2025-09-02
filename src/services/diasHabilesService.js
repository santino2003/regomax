const diasHabilesRepository = require('../repositories/diasHabilesRepository');

/**
 * Servicio para la gestión de días hábiles
 */
class DiasHabilesService {
    /**
     * Establece la cantidad de días hábiles para un mes y año específico
     * @param {number} mes - Número del mes (1-12)
     * @param {number} anio - Año
     * @param {number} cantidad - Cantidad de días hábiles
     * @returns {Promise<Object>} - Resultado de la operación
     */
    async establecerDiasHabiles(mes, anio, cantidad) {
        return await diasHabilesRepository.establecerDiasHabiles(mes, anio, cantidad);
    }
    
    /**
     * Guarda los días hábiles seleccionados para un mes y año específico
     * @param {number} mes - Número del mes (1-12)
     * @param {number} anio - Año
     * @param {Array<number>} diasSeleccionados - Días seleccionados como hábiles
     * @returns {Promise<Object>} - Resultado de la operación
     */
    async guardarDiasHabilesSeleccionados(mes, anio, diasSeleccionados) {
        return await diasHabilesRepository.guardarDiasHabilesSeleccionados(mes, anio, diasSeleccionados);
    }
    
    /**
     * Obtiene los días hábiles seleccionados para un mes y año específico
     * @param {number} mes - Número del mes (1-12)
     * @param {number} anio - Año
     * @returns {Promise<Array<number>>} - Lista de días seleccionados como hábiles
     */
    async obtenerDiasHabilesSeleccionados(mes, anio) {
        return await diasHabilesRepository.obtenerDiasHabilesSeleccionados(mes, anio);
    }
    
    /**
     * Obtiene la cantidad de días hábiles para un mes y año específico
     * @param {number} mes - Número del mes (1-12)
     * @param {number} anio - Año
     * @returns {Promise<Object|null>} - Información de días hábiles o null si no existe
     */
    async obtenerDiasHabiles(mes, anio) {
        return await diasHabilesRepository.obtenerDiasHabiles(mes, anio);
    }
    
    /**
     * Obtiene todos los registros de días hábiles
     * @returns {Promise<Array>} - Lista de registros de días hábiles
     */
    async obtenerTodos() {
        return await diasHabilesRepository.obtenerTodos();
    }
    
    /**
     * Elimina el registro de días hábiles para un mes y año específico
     * @param {number} mes - Número del mes (1-12)
     * @param {number} anio - Año
     * @returns {Promise<Object>} - Resultado de la operación
     */
    async eliminarDiasHabiles(mes, anio) {
        return await diasHabilesRepository.eliminarDiasHabiles(mes, anio);
    }
    
    /**
     * Obtiene el calendario completo de un mes con los días hábiles marcados
     * @param {number} mes - Número del mes (1-12)
     * @param {number} anio - Año
     * @returns {Promise<Object>} - Información del calendario con días hábiles
     */
    async obtenerCalendarioMensual(mes, anio) {
        // Obtener días hábiles seleccionados
        const diasHabiles = await this.obtenerDiasHabilesSeleccionados(mes, anio);
        
        // Calcular días en el mes
        const diasEnMes = new Date(anio, mes, 0).getDate();
        
        // Crear array de días del mes
        const diasDelMes = [];
        for (let dia = 1; dia <= diasEnMes; dia++) {
            const fecha = new Date(anio, mes - 1, dia);
            const esHabil = diasHabiles.includes(dia);
            const diaSemana = fecha.getDay(); // 0 = Domingo, 6 = Sábado
            
            diasDelMes.push({
                dia,
                fecha: fecha.toISOString().split('T')[0], // Formato YYYY-MM-DD
                esHabil,
                esFinDeSemana: diaSemana === 0 || diaSemana === 6
            });
        }
        
        // Determinar el primer día del mes (0 = Domingo, 6 = Sábado)
        const primerDia = new Date(anio, mes - 1, 1).getDay();
        
        return {
            mes,
            anio,
            diasEnMes,
            primerDia,
            diasDelMes,
            diasHabiles
        };
    }
}

module.exports = new DiasHabilesService();