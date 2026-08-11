const fallaParadaRepository = require('../repositories/fallaParadaRepository');
const fallaService = require('./fallaService');

const TIPOS_PARADA = [
    'Parada',
    'Fallas',
    'Parada Programada',
    'Prueba',
    'Respuesto en planta'
];

class FallaParadaService {
    async validar(data) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data.fecha || '')) throw new Error('La fecha es obligatoria');
        if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(data.hora || '')) throw new Error('La hora debe tener formato de 24 horas HH:mm');

        const minutosAfectados = Number(data.minutos_afectados);
        if (!Number.isInteger(minutosAfectados) || minutosAfectados < 0) {
            throw new Error('Los minutos afectados deben ser un número entero mayor o igual a cero');
        }
        if (!data.maquina || !data.maquina.trim()) throw new Error('La máquina es obligatoria');

        const fallaId = Number(data.falla_id || data.falla);
        if (!Number.isInteger(fallaId) || fallaId <= 0) throw new Error('La falla es obligatoria');
        await fallaService.obtenerPorId(fallaId);

        if (!data.descripcion || !data.descripcion.trim()) throw new Error('La descripción es obligatoria');
        if (!TIPOS_PARADA.includes(data.tipo_parada)) throw new Error('El tipo de parada no es válido');

        return {
            fecha: data.fecha,
            hora: data.hora,
            minutos_afectados: minutosAfectados,
            maquina: data.maquina.trim(),
            falla_id: fallaId,
            descripcion: data.descripcion.trim(),
            tipo_parada: data.tipo_parada,
            observaciones: data.observaciones && data.observaciones.trim() ? data.observaciones.trim() : null,
            responsable: data.responsable || null
        };
    }

    async crear(data) {
        const datosValidos = await this.validar(data);
        const id = await fallaParadaRepository.crear(datosValidos);
        return { success: true, id, message: 'Falla / Parada registrada exitosamente' };
    }

    async modificar(id, data) {
        await this.obtenerPorId(id);
        const datosValidos = await this.validar(data);
        await fallaParadaRepository.modificar(id, datosValidos);
        return { success: true, id: Number(id), message: 'Falla / Parada modificada exitosamente' };
    }

    async obtenerTodos(page, limit, filtros) {
        return fallaParadaRepository.obtenerTodos(page, limit, filtros);
    }

    async obtenerPorId(id) {
        const registro = await fallaParadaRepository.obtenerPorId(id);
        if (!registro) throw new Error('Falla / Parada no encontrada');
        return registro;
    }
}

module.exports = { fallaParadaService: new FallaParadaService(), TIPOS_PARADA };
