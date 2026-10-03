const movimientoIngresoRepository = require('../repositories/movimientoIngresoRepository');

class MovimientoIngresoService {
    errorValidacion(message) {
        const error = new Error(message);
        error.status = 400;
        return error;
    }

    async listar(pagina) {
        const numero = Number(pagina);
        const paginaValida = Number.isSafeInteger(numero) && numero > 0 ? numero : 1;
        return movimientoIngresoRepository.listar(paginaValida, 50);
    }

    async registrar(datos) {
        if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
            throw this.errorValidacion('Ingrese los datos del movimiento.');
        }
        const movimiento = {};
        for (const [campo, limite] of Object.entries({ tipo_movimiento: 7, motivo: 100, nombre: 100, apellido: 100, patente: 20 })) {
            const valor = typeof datos[campo] === 'string' ? datos[campo].trim() : '';
            if (!valor || valor.length > limite || /[\x00-\x1f\x7f]/.test(valor)) {
                throw this.errorValidacion(`El campo ${campo} es obligatorio y debe tener hasta ${limite} caracteres.`);
            }
            movimiento[campo] = valor;
        }
        movimiento.tipo_movimiento = movimiento.tipo_movimiento.toUpperCase();
        if (!['INGRESO', 'EGRESO'].includes(movimiento.tipo_movimiento)) {
            throw this.errorValidacion('El tipo de movimiento debe ser INGRESO o EGRESO.');
        }
        movimiento.patente = movimiento.patente.toUpperCase();
        return movimientoIngresoRepository.crear(movimiento);
    }
}

module.exports = new MovimientoIngresoService();
