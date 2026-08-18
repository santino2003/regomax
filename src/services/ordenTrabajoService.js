const ordenTrabajoRepository = require('../repositories/ordenTrabajoRepository');

const ESTADOS_VALIDOS = ['Pendiente', 'En Proceso', 'Cerrada'];
const MANTENIMIENTOS_VALIDOS = ['Correctivo', 'Preventivo', 'Predictivo', 'Otro'];
const TIPOS_VALIDOS = ['Electrico', 'Mecanico', 'Hidraulico', 'Otro'];

class OrdenTrabajoService {
    async crear(ordenTrabajoData) {
        const data = this.validar(ordenTrabajoData);
        const id = await ordenTrabajoRepository.crear(data);

        return {
            success: true,
            id,
            message: 'Orden de trabajo creada exitosamente'
        };
    }

    async obtenerTodos(page = 1, limit = 10, filtros = {}) {
        return ordenTrabajoRepository.obtenerTodos(page, limit, this.normalizarFiltros(filtros));
    }

    async obtenerPorId(id) {
        const ordenTrabajo = await ordenTrabajoRepository.obtenerPorId(id);
        if (!ordenTrabajo) {
            throw new Error('Orden de trabajo no encontrada');
        }
        return ordenTrabajo;
    }

    async modificar(id, ordenTrabajoData) {
        const ordenTrabajo = await this.obtenerPorId(id);
        const data = this.validar({
            ...ordenTrabajoData,
            creado_por: ordenTrabajo.creado_por
        });

        await ordenTrabajoRepository.modificar(id, data);

        return {
            success: true,
            id,
            message: 'Orden de trabajo modificada exitosamente'
        };
    }

    validar(ordenTrabajoData) {
        const mantenimiento = this.normalizarOpcion(ordenTrabajoData.mantenimiento);
        const tipo = this.normalizarOpcion(ordenTrabajoData.tipo);
        const asignadoA = ordenTrabajoData.asignado_a || null;
        const personasDestinadas = ordenTrabajoData.personas_destinadas === '' || ordenTrabajoData.personas_destinadas == null
            ? null
            : parseInt(ordenTrabajoData.personas_destinadas, 10);

        if (!ordenTrabajoData.fecha_pedido) {
            throw new Error('La fecha de pedido es obligatoria');
        }

        if (!ESTADOS_VALIDOS.includes(ordenTrabajoData.estado)) {
            throw new Error('El estado seleccionado no es válido');
        }

        if (personasDestinadas !== null && (!Number.isInteger(personasDestinadas) || personasDestinadas < 0)) {
            throw new Error('Personas destinadas debe ser un número entero mayor o igual a cero');
        }

        if (!ordenTrabajoData.maquina || ordenTrabajoData.maquina.trim() === '') {
            throw new Error('La máquina es obligatoria');
        }

        if (!ordenTrabajoData.descripcion || ordenTrabajoData.descripcion.trim() === '') {
            throw new Error('La descripción es obligatoria');
        }

        if (!mantenimiento) {
            throw new Error('Debe seleccionar una opción de mantenimiento');
        }

        if (!tipo) {
            throw new Error('Debe seleccionar un tipo');
        }

        this.validarOpcion(mantenimiento, MANTENIMIENTOS_VALIDOS, 'mantenimiento');
        this.validarOpcion(tipo, TIPOS_VALIDOS, 'tipo');

        return {
            fecha_pedido: ordenTrabajoData.fecha_pedido,
            fecha_terminada: ordenTrabajoData.fecha_terminada || null,
            estado: ordenTrabajoData.estado,
            asignado_a: asignadoA,
            personas_destinadas: personasDestinadas,
            maquina: ordenTrabajoData.maquina.trim(),
            descripcion: ordenTrabajoData.descripcion.trim(),
            mantenimiento,
            tipo,
            creado_por: ordenTrabajoData.creado_por
        };
    }

    normalizarOpcion(value) {
        if (!value) {
            return '';
        }

        return Array.isArray(value) ? value[0] || '' : value;
    }

    validarOpcion(opcion, validas, campo) {
        if (!validas.includes(opcion)) {
            throw new Error(`La opción "${opcion}" no es válida para ${campo}`);
        }
    }

    normalizarFiltros(filtros = {}) {
        return {
            fecha_desde: filtros.fecha_desde || '',
            fecha_hasta: filtros.fecha_hasta || '',
            maquina: filtros.maquina || '',
            estado: ESTADOS_VALIDOS.includes(filtros.estado) ? filtros.estado : ''
        };
    }
}

module.exports = new OrdenTrabajoService();
