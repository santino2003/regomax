const unidadMedidaRepository = require('../repositories/unidadMedidaRepository');

class UnidadMedidaService {
    async crearUnidadMedida(unidadData) {
        try {
            const { nombre, nombreLindo, responsable } = unidadData;
            
            if (!nombre || nombre.trim() === '') {
                throw new Error('El nombre de la unidad de medida es obligatorio');
            }

            if (!nombreLindo || nombreLindo.trim() === '') {
                throw new Error('El nombre lindo de la unidad de medida es obligatorio');
            }

            await unidadMedidaRepository.crearUnidadMedida(nombre.trim(), nombreLindo.trim(), responsable);
            return {
                success: true,
                message: 'Unidad de medida creada exitosamente',
            };
        } catch (error) {
            console.error('Error en UnidadMedidaService.crearUnidadMedida:', error);
            throw error;
        }
    }

    async modificarUnidadMedida(id, nombre, nombreLindo) {
        try {
            if (!nombre || nombre.trim() === '') {
                throw new Error('El nombre de la unidad de medida es obligatorio');
            }

            if (!nombreLindo || nombreLindo.trim() === '') {
                throw new Error('El nombre lindo de la unidad de medida es obligatorio');
            }

            await unidadMedidaRepository.modificarUnidadMedida(id, nombre.trim(), nombreLindo.trim());
            return {
                success: true,
                message: 'Unidad de medida modificada exitosamente',
            };
        } catch (error) {
            console.error('Error en UnidadMedidaService.modificarUnidadMedida:', error);
            throw error;
        }
    }

    async eliminarUnidadMedida(id) {
        try {
            await unidadMedidaRepository.eliminarUnidadMedida(id);
            return {
                success: true,
                message: 'Unidad de medida eliminada exitosamente',
            };
        } catch (error) {
            console.error('Error en UnidadMedidaService.eliminarUnidadMedida:', error);
            throw error;
        }
    }   

    async obtenerTodas(page = 1, limit = 10) {
        try {
            const resultado = await unidadMedidaRepository.obtenerTodas(page, limit);
            return resultado;
        } catch (error) {
            console.error('Error en UnidadMedidaService.obtenerTodas:', error);
            throw error;
        }
    }

    async obtenerPorId(id) {
        try {
            const unidadMedida = await unidadMedidaRepository.obtenerPorId(id);
            if (!unidadMedida) {
                throw new Error('Unidad de medida no encontrada');
            }
            return unidadMedida;
        } catch (error) {
            console.error('Error en UnidadMedidaService.obtenerPorId:', error);
            throw error;
        }
    }
}

module.exports = new UnidadMedidaService();
