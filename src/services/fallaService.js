const fallaRepository = require('../repositories/fallaRepository');

class FallaService {
    validarNombre(nombre) {
        if (!nombre || nombre.trim() === '') {
            throw new Error('El nombre de la falla es obligatorio');
        }
        return nombre.trim();
    }

    async crearFalla(fallaData) {
        const nombre = this.validarNombre(fallaData.nombre);
        const id = await fallaRepository.crear(nombre, fallaData.responsable || null);
        return { success: true, id, message: 'Falla creada exitosamente' };
    }

    async modificarFalla(id, nombre) {
        await fallaRepository.modificar(id, this.validarNombre(nombre));
        return { success: true, message: 'Falla modificada exitosamente' };
    }

    async eliminarFalla(id) {
        await fallaRepository.eliminar(id);
        return { success: true, message: 'Falla eliminada exitosamente' };
    }

    async obtenerTodas(page = 1, limit = 10) {
        return fallaRepository.obtenerTodas(page, limit);
    }

    async obtenerTodasSinPaginacion() {
        return fallaRepository.obtenerTodasSinPaginacion();
    }

    async obtenerPorId(id) {
        const falla = await fallaRepository.obtenerPorId(id);
        if (!falla) throw new Error('Falla no encontrada');
        return falla;
    }
}

module.exports = new FallaService();
