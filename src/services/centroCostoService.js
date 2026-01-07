const centroCostoRepository = require('../repositories/centroCostoRepository');

class CentroCostoService {
    async crear(centroCostoData) {
        try {
            const { nombre, responsable } = centroCostoData;
            
            if (!nombre || nombre.trim() === '') {
                throw new Error('El nombre del centro de costo es obligatorio');
            }

            await centroCostoRepository.crear(nombre.trim(), responsable);
            return {
                success: true,
                message: 'Centro de costo creado exitosamente',
            };
        } catch (error) {
            console.error('Error en CentroCostoService.crear:', error);
            throw error;
        }
    }

    async modificar(id, nombre) {
        try {
            if (!nombre || nombre.trim() === '') {
                throw new Error('El nombre del centro de costo es obligatorio');
            }

            await centroCostoRepository.modificar(id, nombre.trim());
            return {
                success: true,
                message: 'Centro de costo modificado exitosamente',
            };
        } catch (error) {
            console.error('Error en CentroCostoService.modificar:', error);
            throw error;
        }
    }

    async eliminar(id) {
        try {
            // Verificar si está en uso
            const enUso = await centroCostoRepository.existeEnOrdenes(id);
            if (enUso) {
                throw new Error('No se puede eliminar el centro de costo porque está siendo utilizado en órdenes de compra');
            }

            await centroCostoRepository.eliminar(id);
            return {
                success: true,
                message: 'Centro de costo eliminado exitosamente',
            };
        } catch (error) {
            console.error('Error en CentroCostoService.eliminar:', error);
            throw error;
        }
    }

    async cambiarEstado(id, activo) {
        try {
            await centroCostoRepository.cambiarEstado(id, activo);
            return {
                success: true,
                message: `Centro de costo ${activo ? 'activado' : 'desactivado'} exitosamente`,
            };
        } catch (error) {
            console.error('Error en CentroCostoService.cambiarEstado:', error);
            throw error;
        }
    }

    async obtenerTodos(page = 1, limit = 10) {
        try {
            const resultado = await centroCostoRepository.obtenerTodos(page, limit);
            return resultado;
        } catch (error) {
            console.error('Error en CentroCostoService.obtenerTodos:', error);
            throw error;
        }
    }

    async obtenerActivos() {
        try {
            const resultado = await centroCostoRepository.obtenerActivos();
            return resultado;
        } catch (error) {
            console.error('Error en CentroCostoService.obtenerActivos:', error);
            throw error;
        }
    }

    async obtenerPorId(id) {
        try {
            const centroCosto = await centroCostoRepository.obtenerPorId(id);
            if (!centroCosto) {
                throw new Error('Centro de costo no encontrado');
            }
            return centroCosto;
        } catch (error) {
            console.error('Error en CentroCostoService.obtenerPorId:', error);
            throw error;
        }
    }
}

module.exports = new CentroCostoService();
