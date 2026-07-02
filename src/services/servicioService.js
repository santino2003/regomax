const servicioRepository = require('../repositories/servicioRepository');

class ServicioService {
    async crearServicio(servicioData) {
        try {
            const { nombre, responsable } = servicioData;
            
            if (!nombre || nombre.trim() === '') {
                throw new Error('El nombre del servicio es obligatorio');
            }

            await servicioRepository.crearServicio(nombre.trim(), responsable);
            return {
                success: true,
                message: 'Servicio creado exitosamente',
            };
        } catch (error) {
            console.error('Error en ServicioService.crearServicio:', error);
            throw error;
        }
    }

    async modificarServicio(id, nombre) {
        try {
            if (!nombre || nombre.trim() === '') {
                throw new Error('El nombre del servicio es obligatorio');
            }

            await servicioRepository.modificarServicio(id, nombre.trim());
            return {
                success: true,
                message: 'Servicio modificado exitosamente',
            };
        } catch (error) {
            console.error('Error en ServicioService.modificarServicio:', error);
            throw error;
        }
    }

    async eliminarServicio(id) {
        try {
            await servicioRepository.eliminarServicio(id);
            return {
                success: true,
                message: 'Servicio eliminado exitosamente',
            };
        } catch (error) {
            console.error('Error en ServicioService.eliminarServicio:', error);
            throw error;
        }
    }   

    async obtenerTodas(page = 1, limit = 10) {
        try {
            const resultado = await servicioRepository.obtenerTodas(page, limit);
            return resultado;
        } catch (error) {
            console.error('Error en ServicioService.obtenerTodas:', error);
            throw error;
        }
    }

    async obtenerPorId(id) {
        try {
            const servicio = await servicioRepository.obtenerPorId(id);
            if (!servicio) {
                throw new Error('Servicio no encontrado');
            }
            return servicio;
        } catch (error) {
            console.error('Error en ServicioService.obtenerPorId:', error);
            throw error;
        }
    }
}

module.exports = new ServicioService();