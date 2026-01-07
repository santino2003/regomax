const almacenRepository = require('../repositories/almacenRepository');

class AlmacenService {
    async crearAlmacen(almacenData) {
        try {
            const { nombre, responsable } = almacenData;
            
            if (!nombre || nombre.trim() === '') {
                throw new Error('El nombre del almacén es obligatorio');
            }

            await almacenRepository.crearAlmacen(nombre.trim(), responsable);
            return {
                success: true,
                message: 'Almacén creado exitosamente',
            };
        } catch (error) {
            console.error('Error en AlmacenService.crearAlmacen:', error);
            throw error;
        }
    }

    async modificarAlmacen(id, nombre) {
        try {
            if (!nombre || nombre.trim() === '') {
                throw new Error('El nombre del almacén es obligatorio');
            }

            await almacenRepository.modificarAlmacen(id, nombre.trim());
            return {
                success: true,
                message: 'Almacén modificado exitosamente',
            };
        } catch (error) {
            console.error('Error en AlmacenService.modificarAlmacen:', error);
            throw error;
        }
    }

    async eliminarAlmacen(id) {
        try {
            await almacenRepository.eliminarAlmacen(id);
            return {
                success: true,
                message: 'Almacén eliminado exitosamente',
            };
        } catch (error) {
            console.error('Error en AlmacenService.eliminarAlmacen:', error);
            throw error;
        }
    }   

    async obtenerTodos(page = 1, limit = 10) {
        try {
            const resultado = await almacenRepository.obtenerTodos(page, limit);
            return resultado;
        } catch (error) {
            console.error('Error en AlmacenService.obtenerTodos:', error);
            throw error;
        }
    }

    async obtenerPorId(id) {
        try {
            const almacen = await almacenRepository.obtenerPorId(id);
            if (!almacen) {
                throw new Error('Almacén no encontrado');
            }
            return almacen;
        } catch (error) {
            console.error('Error en AlmacenService.obtenerPorId:', error);
            throw error;
        }
    }
}

module.exports = new AlmacenService();
