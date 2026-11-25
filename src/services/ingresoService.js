const personaRepository = require('../repositories/personaRepository');
const movimientoIngresoRepository = require('../repositories/movimientoIngresoRepository');
const clienteNFURepository = require('../repositories/clienteNFURepository');
const db = require('../config/db');
const ordenDeVentaRepository = require('../repositories/ordenDeVentaRepository');
const personalService = require('./personalService');

class IngresoService {
    async obtenerDetalle(id) {
        if (!['string', 'number'].includes(typeof id) || !/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id))) {
            throw this.errorValidacion('Seleccione un movimiento válido.');
        }
        const movimiento = await movimientoIngresoRepository.obtenerDetalle(Number(id));
        if (!movimiento) throw this.errorValidacion('El movimiento no existe.', 404);
        const adjuntos = [];
        for (const [url, origen] of [[movimiento.archivo_jpg, 'Adjunto del movimiento'], [movimiento.archivo_ingreso, 'Adjunto del ingreso original']]) {
            if (typeof url === 'string' && /^\/uploads\/ingresos\/[a-z0-9_-]+\.(jpe?g|pdf)$/i.test(url) && !adjuntos.some(adjunto => adjunto.url === url)) {
                adjuntos.push({ url, origen, esPDF: /\.pdf$/i.test(url) });
            }
        }
        return { ...movimiento, adjuntos };
    }

    async obtenerDatosNuevoIngreso() {
        const [clientes, ordenes] = await Promise.allSettled([
            clienteNFURepository.obtenerTodos(), ordenDeVentaRepository.obtenerParaIngresosLogistica()
        ]);
        if (clientes.status === 'rejected') console.error('Error al obtener empresas para ingresos:', clientes.reason);
        if (ordenes.status === 'rejected') console.error('Error al obtener órdenes para ingresos:', ordenes.reason);
        return {
            clientes: clientes.status === 'fulfilled' ? clientes.value || [] : [],
            errorClientes: clientes.status === 'rejected',
            ordenesVenta: ordenes.status === 'fulfilled' ? ordenes.value || [] : [],
            errorOrdenes: ordenes.status === 'rejected'
        };
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

    validarCamposMovimiento(datos) {
        if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
            throw this.errorValidacion('Ingrese los datos del movimiento.');
        }
        const movimiento = {};
        for (const [campo, limite] of Object.entries({ tipo_movimiento: 7, motivo: 100, nombre: 100, apellido: 100, patente: 20 })) {
            const valor = typeof datos[campo] === 'string' ? datos[campo].trim() : '';
            if ((!valor && !(campo === 'patente' && datos.motivo === 'Personal')) || valor.length > limite || /[\x00-\x1f\x7f]/.test(valor)) {
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
        return movimiento;
    }

    async registrarMovimiento(datos, archivo) {
        const movimiento = this.validarCamposMovimiento(datos);
        if (movimiento.motivo === 'Personal') throw this.errorValidacion('Utilice la opción Ingreso de personal.');
        if (archivo) movimiento.archivo_jpg = `/uploads/ingresos/${archivo.filename}`;
        if (['Basura', 'Acero'].includes(movimiento.motivo)) {
            const empresa = typeof datos.empresa === 'string' ? datos.empresa.trim() : '';
            if (!empresa || empresa.length > 255 || /[\x00-\x1f\x7f]/.test(empresa)) {
                throw this.errorValidacion('Ingrese una empresa válida de hasta 255 caracteres.');
            }
            movimiento.empresa = empresa;
            return movimientoIngresoRepository.crear(movimiento);
        }
        if (movimiento.motivo === 'Logística') {
            const ordenId = datos.orden_venta_id;
            if (!['string', 'number'].includes(typeof ordenId) || !/^[1-9]\d*$/.test(String(ordenId)) || !Number.isSafeInteger(Number(ordenId))) {
                throw this.errorValidacion('Seleccione una orden de venta válida.');
            }
            return db.withTransaction(async connection => {
                const orden = await ordenDeVentaRepository.obtenerParaIngresoLogistica(Number(ordenId), connection);
                if (!orden || !['abierta', 'en_logistica'].includes(orden.estado)) {
                    throw this.errorValidacion('La orden debe estar abierta o en logística. Actualice el formulario.');
                }
                if (typeof orden.cliente_final !== 'string' || !orden.cliente_final.trim()) {
                    throw this.errorValidacion('La orden seleccionada no tiene cliente final.');
                }
                movimiento.empresa = orden.cliente_final;
                movimiento.orden_venta_id = orden.id;
                return movimientoIngresoRepository.crear(movimiento, connection);
            });
        }
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

    async editarIngreso(id, datos, archivo) {
        if (!['string', 'number'].includes(typeof id) || !/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id))) {
            throw this.errorValidacion('Seleccione un ingreso válido.');
        }
        const movimiento = this.validarCamposMovimiento({ ...datos, tipo_movimiento: 'INGRESO' });
        return db.withTransaction(async connection => {
            const actual = await movimientoIngresoRepository.obtenerParaEgreso(Number(id), connection);
            if (!actual) throw this.errorValidacion('El ingreso no existe.', 404);
            if (actual.tipo_movimiento !== 'INGRESO') throw this.errorValidacion('Solo se pueden editar ingresos.');
            if ((actual.motivo === 'Personal') !== (movimiento.motivo === 'Personal')) throw this.errorValidacion('Los ingresos de personal deben conservar ese motivo.');
            movimiento.orden_venta_id = null;
            movimiento.archivo_jpg = archivo ? `/uploads/ingresos/${archivo.filename}` : actual.archivo_jpg;
            if (movimiento.motivo === 'Personal') {
                Object.assign(movimiento, personalService.validarDatos({ ...datos, nombre: movimiento.nombre, apellido: movimiento.apellido }));
            } else if (movimiento.motivo === 'CNFU/NFU') {
                if (datos.cliente_id === 'actual' && actual.motivo === 'CNFU/NFU' && actual.empresa) {
                    movimiento.empresa = actual.empresa;
                } else {
                    const clienteId = String(datos.cliente_id ?? '');
                    if (!/^[1-9]\d*$/.test(clienteId) || !Number.isSafeInteger(Number(clienteId))) throw this.errorValidacion('Seleccione una empresa válida.');
                    const cliente = await clienteNFURepository.obtenerPorId(Number(clienteId));
                    if (!cliente?.empresa) throw this.errorValidacion('La empresa seleccionada no existe.');
                    movimiento.empresa = cliente.empresa;
                }
            } else if (movimiento.motivo === 'Logística') {
                const ordenId = String(datos.orden_venta_id ?? '');
                if (!/^[1-9]\d*$/.test(ordenId) || !Number.isSafeInteger(Number(ordenId))) throw this.errorValidacion('Seleccione una orden de venta válida.');
                if (actual.motivo === 'Logística' && Number(actual.orden_venta_id) === Number(ordenId)) {
                    movimiento.empresa = actual.empresa;
                    movimiento.orden_venta_id = actual.orden_venta_id;
                } else {
                    const orden = await ordenDeVentaRepository.obtenerParaIngresoLogistica(Number(ordenId), connection);
                    if (!orden || !['abierta', 'en_logistica'].includes(orden.estado)) throw this.errorValidacion('La orden debe estar abierta o en logística.');
                    if (typeof orden.cliente_final !== 'string' || !orden.cliente_final.trim()) throw this.errorValidacion('La orden seleccionada no tiene cliente final.');
                    movimiento.empresa = orden.cliente_final;
                    movimiento.orden_venta_id = orden.id;
                }
            } else if (['Basura', 'Acero'].includes(movimiento.motivo)) {
                const empresa = typeof datos.empresa === 'string' ? datos.empresa.trim() : '';
                if (!empresa || empresa.length > 255 || /[\x00-\x1f\x7f]/.test(empresa)) throw this.errorValidacion('Ingrese una empresa válida de hasta 255 caracteres.');
                movimiento.empresa = empresa;
            } else if (movimiento.motivo === actual.motivo) {
                movimiento.empresa = actual.empresa;
                movimiento.orden_venta_id = actual.orden_venta_id;
            } else {
                throw this.errorValidacion('Seleccione un motivo válido.');
            }
            await movimientoIngresoRepository.actualizar(Number(id), movimiento, connection);
            return { id: Number(id), ...movimiento, archivoAnterior: archivo ? actual.archivo_jpg : null };
        });
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
                tipo_movimiento: 'EGRESO', ingreso_id: id, motivo, nombre, apellido, patente, empresa,
                ...(ingreso.orden_venta_id != null ? { orden_venta_id: ingreso.orden_venta_id } : {}),
                ...(ingreso.personal_id != null ? { personal_id: ingreso.personal_id, auto: ingreso.auto, cargo: ingreso.cargo, turno: ingreso.turno } : {})
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
