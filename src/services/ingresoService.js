const personaRepository = require('../repositories/personaRepository');
const movimientoIngresoRepository = require('../repositories/movimientoIngresoRepository');
const clienteNFURepository = require('../repositories/clienteNFURepository');
const db = require('../config/db');

class IngresoService {
    async obtenerDatosNuevoIngreso() {
        try {
            return { clientes: await clienteNFURepository.obtenerTodos() || [], errorClientes: false };
        } catch (error) {
            console.error('Error al obtener empresas para ingresos:', error);
            return { clientes: [], errorClientes: true };
        }
    }

    async listarMovimientos(pagina) {
        const numero = Number(pagina);
        const limite = 50;
        const total = await movimientoIngresoRepository.contar();
        const paginas = Math.max(1, Math.ceil(total / limite));
        pagina = Math.min(Number.isSafeInteger(numero) && numero > 0 ? numero : 1, paginas);
        const movimientos = await movimientoIngresoRepository.listar(limite, (pagina - 1) * limite);
        return { movimientos, total, pagina, paginas };
    }

    async registrarMovimiento(datos) {
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
        movimiento.empresa = null;
        if (datos.cliente_id || (movimiento.tipo_movimiento === 'INGRESO' && movimiento.motivo === 'CNFU/NFU')) {
            const clienteId = String(datos.cliente_id ?? '');
            if (!/^[1-9]\d*$/.test(clienteId) || !Number.isSafeInteger(Number(clienteId))) {
                throw this.errorValidacion('Seleccione una empresa válida.');
            }
            const cliente = await clienteNFURepository.obtenerPorId(Number(clienteId));
            if (!cliente || !cliente.empresa) {
                throw this.errorValidacion('La empresa seleccionada no existe.');
            }
            movimiento.empresa = cliente.empresa;
        }
        return movimientoIngresoRepository.crear(movimiento);
    }

    async registrarEgreso(ingresoId) {
        if (!['string', 'number'].includes(typeof ingresoId) || !/^[1-9]\d*$/.test(String(ingresoId)) || !Number.isSafeInteger(Number(ingresoId))) {
            throw this.errorValidacion('Seleccione un ingreso válido.');
        }
        const id = Number(ingresoId);
        return db.withTransaction(async connection => {
            const ingreso = await movimientoIngresoRepository.obtenerParaEgreso(id, connection);
            if (!ingreso) throw this.errorValidacion('El ingreso seleccionado no existe.', 404);
            if (ingreso.tipo_movimiento !== 'INGRESO') {
                throw this.errorValidacion('Solo se puede dar egreso a un ingreso.', 400);
            }
            if (await movimientoIngresoRepository.obtenerEgreso(id, connection)) {
                throw this.errorValidacion('Este ingreso ya tiene un egreso registrado. Actualice el listado.', 409);
            }
            const { motivo, nombre, apellido, patente, empresa } = ingreso;
            return movimientoIngresoRepository.crear({
                tipo_movimiento: 'EGRESO', ingreso_id: id, motivo, nombre, apellido, patente, empresa
            }, connection);
        });
    }

    errorValidacion(message, status = 400) {
        const error = new Error(message);
        error.status = status;
        return error;
    }

    normalizarDni(valor) {
        const dni = typeof valor === 'string' ? valor.trim() : '';
        if (!/^\d{7,8}$/.test(dni) || Number(dni) < 1000000) {
            throw this.errorValidacion('Ingrese un DNI válido de 7 u 8 dígitos, sin puntos.');
        }
        return String(Number(dni));
    }

    validarPersona(datos) {
        const persona = { dni: this.normalizarDni(datos.dni) };
        for (const campo of ['nombre', 'apellido']) {
            const valor = typeof datos[campo] === 'string' ? datos[campo].trim() : '';
            if (!valor || valor.length > 100 || /[\x00-\x1f@\\]/.test(valor)) {
                throw this.errorValidacion(`El ${campo} es obligatorio y debe tener hasta 100 caracteres.`);
            }
            persona[campo] = valor;
        }
        persona.sexo = typeof datos.sexo === 'string' ? datos.sexo.trim().toUpperCase() : '';
        if (!['M', 'F', 'X'].includes(persona.sexo)) {
            throw this.errorValidacion('Seleccione un sexo válido.');
        }
        return persona;
    }

    async identificar(entrada) {
        if (typeof entrada !== 'string' || entrada.length > 1000) {
            throw this.errorValidacion('Ingrese el DNI o escanee el documento.');
        }
        const campos = entrada.trim().split(/\\*@/).map(valor => valor.trim());
        const escaneado = campos.length > 1;
        if (escaneado && campos.length < 5) {
            throw this.errorValidacion('El escaneo del DNI está incompleto. Vuelva a escanearlo.');
        }
        const dni = this.normalizarDni(escaneado ? campos[4] : entrada);
        const existente = await personaRepository.obtenerPorDni(dni);
        if (existente) return { persona: existente, requiereRegistro: false };
        if (!escaneado) return { dni, requiereRegistro: true };
        const persona = this.validarPersona({ dni, apellido: campos[1], nombre: campos[2], sexo: campos[3] });
        return { persona: await personaRepository.crear(persona), requiereRegistro: false };
    }

    async registrarPersona(datos) {
        const persona = this.validarPersona(datos);
        const existente = await personaRepository.obtenerPorDni(persona.dni);
        return existente || personaRepository.crear(persona);
    }
}

module.exports = new IngresoService();
