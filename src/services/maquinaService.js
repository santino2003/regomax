const maquinaRepository = require('../repositories/maquinaRepository');

class MaquinaService {
    validarNombre(nombre) {
        if (!nombre || nombre.trim() === '') {
            throw new Error('El nombre de la máquina es obligatorio');
        }
        return nombre.trim();
    }

    normalizarDescripcion(descripcion) {
        if (descripcion == null || String(descripcion).trim() === '') {
            return null;
        }
        return String(descripcion).trim();
    }

    async crearMaquina(maquinaData) {
        const nombre = this.validarNombre(maquinaData.nombre);
        const descripcion = this.normalizarDescripcion(maquinaData.descripcion);
        await maquinaRepository.crear(nombre, descripcion, maquinaData.responsable || null);
        return {
            success: true,
            message: 'Máquina creada exitosamente'
        };
    }

    async modificarMaquina(id, maquinaData) {
        const nombre = this.validarNombre(maquinaData.nombre);
        const descripcion = this.normalizarDescripcion(maquinaData.descripcion);
        await maquinaRepository.modificar(id, nombre, descripcion);
        return {
            success: true,
            message: 'Máquina modificada exitosamente'
        };
    }

    async eliminarMaquina(id) {
        await maquinaRepository.eliminar(id);
        return {
            success: true,
            message: 'Máquina eliminada exitosamente'
        };
    }

    async obtenerTodas(page = 1, limit = 10) {
        return maquinaRepository.obtenerTodas(page, limit);
    }

    async obtenerTodasSinPaginacion() {
        return maquinaRepository.obtenerTodasSinPaginacion();
    }

    async obtenerPorId(id) {
        const maquina = await maquinaRepository.obtenerPorId(id);
        if (!maquina) {
            throw new Error('Máquina no encontrada');
        }
        return maquina;
    }
}

module.exports = new MaquinaService();
