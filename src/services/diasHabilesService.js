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
        try {
            // Validar datos de entrada
            mes = parseInt(mes);
            anio = parseInt(anio);
            cantidad = parseInt(cantidad);
            
            // Validaciones
            if (isNaN(mes) || mes < 1 || mes > 12) {
                throw new Error('El mes debe ser un número entre 1 y 12');
            }
            
            if (isNaN(anio) || anio < 2000 || anio > 2100) {
                throw new Error('El año debe ser un número entre 2000 y 2100');
            }
            
            if (isNaN(cantidad) || cantidad < 0 || cantidad > 31) {
                throw new Error('La cantidad de días hábiles debe ser un número entre 0 y 31');
            }
            
            // Establecer días hábiles en el repositorio
            return await diasHabilesRepository.establecerDiasHabiles(mes, anio, cantidad);
        } catch (error) {
            console.error('Error en el servicio al establecer días hábiles:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene la cantidad de días hábiles para un mes y año específico
     * @param {number} mes - Número del mes (1-12)
     * @param {number} anio - Año
     * @returns {Promise<Object|null>} - Información de días hábiles o null si no existe
     */
    async obtenerDiasHabiles(mes, anio) {
        try {
            mes = parseInt(mes);
            anio = parseInt(anio);
            
            // Validaciones
            if (isNaN(mes) || mes < 1 || mes > 12) {
                throw new Error('El mes debe ser un número entre 1 y 12');
            }
            
            if (isNaN(anio) || anio < 2000 || anio > 2100) {
                throw new Error('El año debe ser un número entre 2000 y 2100');
            }
            
            return await diasHabilesRepository.obtenerDiasHabiles(mes, anio);
        } catch (error) {
            console.error('Error en el servicio al obtener días hábiles:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene todos los registros de días hábiles
     * @returns {Promise<Array>} - Lista de registros de días hábiles
     */
    async obtenerTodos() {
        try {
            return await diasHabilesRepository.obtenerTodos();
        } catch (error) {
            console.error('Error en el servicio al obtener todos los registros de días hábiles:', error);
            throw error;
        }
    }
    
    /**
     * Elimina el registro de días hábiles para un mes y año específico
     * @param {number} mes - Número del mes (1-12)
     * @param {number} anio - Año
     * @returns {Promise<Object>} - Resultado de la operación
     */
    async eliminarDiasHabiles(mes, anio) {
        try {
            mes = parseInt(mes);
            anio = parseInt(anio);
            
            // Validaciones
            if (isNaN(mes) || mes < 1 || mes > 12) {
                throw new Error('El mes debe ser un número entre 1 y 12');
            }
            
            if (isNaN(anio) || anio < 2000 || anio > 2100) {
                throw new Error('El año debe ser un número entre 2000 y 2100');
            }
            
            const resultado = await diasHabilesRepository.eliminarDiasHabiles(mes, anio);
            
            return {
                success: resultado,
                message: resultado 
                    ? 'Registro de días hábiles eliminado correctamente' 
                    : 'No se encontró el registro de días hábiles'
            };
        } catch (error) {
            console.error('Error en el servicio al eliminar días hábiles:', error);
            throw error;
        }
    }

    /**
     * Obtiene la cantidad de días hábiles para el mes y año actual
     * @returns {Promise<number>} - Cantidad de días hábiles o 22 (valor por defecto)
     */
    async obtenerDiasHabilesActual() {
        try {
            const fecha = new Date();
            const mes = fecha.getMonth() + 1; // getMonth() devuelve 0-11
            const anio = fecha.getFullYear();
            
            const diasHabiles = await this.obtenerDiasHabiles(mes, anio);
            
            // Si no hay registro, devolver valor por defecto (22 días)
            return diasHabiles ? diasHabiles.cantidad : 22;
        } catch (error) {
            console.error('Error al obtener días hábiles del mes actual:', error);
            // En caso de error, devolver el valor por defecto
            return 22;
        }
    }
}

module.exports = new DiasHabilesService();