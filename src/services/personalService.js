const personalRepository = require('../repositories/personalRepository');
const movimientos = require('../repositories/movimientoIngresoRepository');
const db = require('../config/db');

class PersonalService {
    error(mensaje, status = 400) { return Object.assign(new Error(mensaje), { status }); }

    validarId(id) {
        if (!['string', 'number'].includes(typeof id) || !/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id))) throw this.error('Seleccione un registro de personal válido.');
        return Number(id);
    }

    validarDatos(datos) {
        if (!datos || typeof datos !== 'object' || Array.isArray(datos)) throw this.error('Ingrese los datos del personal.');
        const resultado = {};
        for (const [campo, limite] of Object.entries({ nombre: 100, apellido: 100, patente: 20, auto: 100, cargo: 100, turno: 100 })) {
            if (datos[campo] != null && typeof datos[campo] !== 'string') throw this.error(`El campo ${campo} debe ser texto.`);
            const valor = (datos[campo] || '').trim();
            if (valor.length > limite || /[\x00-\x1f\x7f]/.test(valor) || (['nombre', 'apellido'].includes(campo) && !valor)) throw this.error(`Revise el campo ${campo} (máximo ${limite} caracteres).`);
            resultado[campo] = valor || null;
        }
        if (resultado.patente) resultado.patente = resultado.patente.toUpperCase();
        return resultado;
    }

    listar(soloActivos = false) { return personalRepository.listar(soloActivos); }

    async obtener(id) {
        const personal = await personalRepository.obtenerPorId(this.validarId(id));
        if (!personal) throw this.error('El registro de personal no existe.', 404);
        return personal;
    }

    async obtenerFicha(id, paginaSolicitada) {
        const personal = await this.obtener(id);
        const total = await personalRepository.contarMovimientos(personal.id);
        const limite = 50;
        const paginas = Math.max(1, Math.ceil(total / limite));
        const numero = Number(paginaSolicitada);
        const pagina = Math.min(Number.isSafeInteger(numero) && numero > 0 ? numero : 1, paginas);
        const movimientos = await personalRepository.listarMovimientos(personal.id, limite, (pagina - 1) * limite);
        return { personal, movimientos, pagina, paginas, total };
    }

    async guardar(datos, id) {
        const personal = this.validarDatos(datos);
        personal.activo = datos.activo === false || datos.activo === '0' ? 0 : 1;
        if (id !== undefined) id = (await this.obtener(id)).id;
        return personalRepository.guardar(personal, id);
    }

    async eliminar(id) {
        const personal = await this.obtener(id);
        await personalRepository.darDeBaja(personal.id);
    }

    async registrarIngreso(id, datos = {}, archivo) {
        id = this.validarId(id);
        return db.withTransaction(async connection => {
            const personal = await personalRepository.obtenerPorId(id, connection);
            if (!personal || !Number(personal.activo)) throw this.error('Seleccione personal activo.');
            if (await movimientos.obtenerIngresoPersonalPendiente(id, connection)) throw this.error('Esta persona ya tiene un ingreso sin egreso.', 409);
            const campos = this.validarDatos({ nombre: personal.nombre, apellido: personal.apellido,
                ...Object.fromEntries(['patente', 'auto', 'cargo', 'turno'].map(campo => [campo, datos[campo] === undefined ? personal[campo] : datos[campo]])) });
            return movimientos.crear({ tipo_movimiento: 'INGRESO', motivo: 'Personal', personal_id: id,
                ...campos, empresa: null, ...(archivo ? { archivo_jpg: `/uploads/ingresos/${archivo.filename}` } : {}) }, connection);
        });
    }
}
module.exports = new PersonalService();
