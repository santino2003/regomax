const familiaRepository = require('../repositories/familiaRepository');

class FamiliaService {
    async crearFamilia(familiaData) {
        try {
            const { nombre, responsable } = familiaData;
            
            if (!nombre || nombre.trim() === '') {
                throw new Error('El nombre de la familia es obligatorio');
            }

            await familiaRepository.crearFamilia(nombre.trim(), responsable);
            return {
                success: true,
                message: 'Familia creada exitosamente',
            };
        } catch (error) {
            console.error('Error en FamiliaService.crearFamilia:', error);
            throw error;
        }
    }

    async modificarFamilia(id, nombre) {
        try {
            if (!nombre || nombre.trim() === '') {
                throw new Error('El nombre de la familia es obligatorio');
            }

            await familiaRepository.modificarFamilia(id, nombre.trim());
            return {
                success: true,
                message: 'Familia modificada exitosamente',
            };
        } catch (error) {
            console.error('Error en FamiliaService.modificarFamilia:', error);
            throw error;
        }
    }

    async eliminarFamilia(id) {
        try {
            await familiaRepository.eliminarFamilia(id);
            return {
                success: true,
                message: 'Familia eliminada exitosamente',
            };
        } catch (error) {
            console.error('Error en FamiliaService.eliminarFamilia:', error);
            throw error;
        }
    }   

    async obtenerTodas(page = 1, limit = 10) {
        try {
            const resultado = await familiaRepository.obtenerTodas(page, limit);
            return resultado;
        } catch (error) {
            console.error('Error en FamiliaService.obtenerTodas:', error);
            throw error;
        }
    }

    async obtenerPorId(id) {
        try {
            const familia = await familiaRepository.obtenerPorId(id);
            if (!familia) {
                throw new Error('Familia no encontrada');
            }
            return familia;
        } catch (error) {
            console.error('Error en FamiliaService.obtenerPorId:', error);
            throw error;
        }
    }
}

module.exports = new FamiliaService();