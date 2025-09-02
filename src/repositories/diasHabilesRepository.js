const db = require('../config/db');

class DiasHabilesRepository {
    /**
     * Establece la cantidad de días hábiles para un mes y año específico
     * @param {number} mes - Número del mes (1-12)
     * @param {number} anio - Año
     * @param {number} cantidad - Cantidad de días hábiles
     * @returns {Promise<Object>} - Resultado de la operación
     */
    async establecerDiasHabiles(mes, anio, cantidad) {
        try {
            // Verificar si ya existe un registro para este mes y año
            const existe = await this.obtenerDiasHabiles(mes, anio);
            
            if (existe) {
                // Actualizar el registro existente
                const result = await db.query(
                    'UPDATE dias_habiles SET cantidad = ? WHERE mes = ? AND anio = ?',
                    [cantidad, mes, anio]
                );
                return { 
                    success: true, 
                    updated: true, 
                    message: 'Días hábiles actualizados correctamente' 
                };
            } else {
                // Crear un nuevo registro
                const result = await db.query(
                    'INSERT INTO dias_habiles (mes, anio, cantidad) VALUES (?, ?, ?)',
                    [mes, anio, cantidad]
                );
                return { 
                    success: true, 
                    created: true, 
                    message: 'Días hábiles establecidos correctamente' 
                };
            }
        } catch (error) {
            console.error('Error al establecer días hábiles:', error);
            throw error;
        }
    }

    /**
     * Guarda días hábiles específicos para un mes y año
     * @param {number} mes - Número del mes (1-12)
     * @param {number} anio - Año
     * @param {Array} diasSeleccionados - Array con los días seleccionados
     * @returns {Promise<Object>} - Resultado de la operación
     */
    async guardarDiasHabilesSeleccionados(mes, anio, diasSeleccionados) {
        try {
            // Eliminar días existentes para este mes/año
            await db.query(
                'DELETE FROM dias_habiles_seleccionados WHERE mes = ? AND anio = ?',
                [mes, anio]
            );
            
            // Si no hay días seleccionados, terminamos
            if (!diasSeleccionados || diasSeleccionados.length === 0) {
                return {
                    success: true,
                    message: 'No hay días hábiles seleccionados para guardar'
                };
            }

            // Preparar valores para inserción masiva
            const values = diasSeleccionados.map(dia => [mes, anio, dia]);
            
            // Insertar todos los días seleccionados
            const placeholders = values.map(() => '(?, ?, ?)').join(', ');
            const flatValues = values.flat();
            
            await db.query(
                `INSERT INTO dias_habiles_seleccionados (mes, anio, dia) VALUES ${placeholders}`,
                flatValues
            );
            
            // Actualizar también la cantidad en la tabla principal
            await this.establecerDiasHabiles(mes, anio, diasSeleccionados.length);
            
            return {
                success: true,
                message: 'Días hábiles guardados correctamente',
                cantidad: diasSeleccionados.length
            };
        } catch (error) {
            console.error('Error al guardar días hábiles seleccionados:', error);
            throw error;
        }
    }

    /**
     * Obtiene los días hábiles seleccionados para un mes y año específico
     * @param {number} mes - Número del mes (1-12)
     * @param {number} anio - Año
     * @returns {Promise<Array>} - Array con los días hábiles seleccionados
     */
    async obtenerDiasHabilesSeleccionados(mes, anio) {
        try {
            const result = await db.query(
                'SELECT dia FROM dias_habiles_seleccionados WHERE mes = ? AND anio = ? ORDER BY dia ASC',
                [mes, anio]
            );
            
            return result.map(row => row.dia);
        } catch (error) {
            console.error('Error al obtener días hábiles seleccionados:', error);
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
            const result = await db.query(
                'SELECT * FROM dias_habiles WHERE mes = ? AND anio = ?',
                [mes, anio]
            );
            
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Error al obtener días hábiles:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los registros de días hábiles
     * @returns {Promise<Array>} - Lista de registros de días hábiles
     */
    async obtenerTodos() {
        try {
            const result = await db.query(
                'SELECT * FROM dias_habiles ORDER BY anio DESC, mes ASC'
            );
            
            return result;
        } catch (error) {
            console.error('Error al obtener todos los registros de días hábiles:', error);
            throw error;
        }
    }

    /**
     * Elimina el registro de días hábiles para un mes y año específico
     * @param {number} mes - Número del mes (1-12)
     * @param {number} anio - Año
     * @returns {Promise<boolean>} - Resultado de la operación
     */
    async eliminarDiasHabiles(mes, anio) {
        try {
            // Eliminar de la tabla principal
            await db.query(
                'DELETE FROM dias_habiles WHERE mes = ? AND anio = ?',
                [mes, anio]
            );
            
            // Eliminar los días seleccionados
            await db.query(
                'DELETE FROM dias_habiles_seleccionados WHERE mes = ? AND anio = ?',
                [mes, anio]
            );
            
            return true;
        } catch (error) {
            console.error('Error al eliminar días hábiles:', error);
            throw error;
        }
    }
}

module.exports = new DiasHabilesRepository();