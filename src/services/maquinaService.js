const maquinaRepository = require('../repositories/maquinaRepository');

class MaquinaService {
    validarNombre(nombre) {
        if (!nombre || nombre.trim() === '') {
            throw new Error('El nombre de la máquina es obligatorio');
        }
        return nombre.trim();
    }

    async crearMaquina(maquinaData) {
        const nombre = this.validarNombre(maquinaData.nombre);
        await maquinaRepository.crear(nombre, maquinaData.responsable || null);
        return {
            success: true,
            message: 'Máquina creada exitosamente'
        };
    }

    async modificarMaquina(id, nombre) {
        await maquinaRepository.modificar(id, this.validarNombre(nombre));
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
