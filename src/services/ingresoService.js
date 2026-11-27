const personaRepository = require('../repositories/personaRepository');
const movimientoIngresoRepository = require('../repositories/movimientoIngresoRepository');
const clienteNFURepository = require('../repositories/clienteNFURepository');
const db = require('../config/db');
const ordenDeVentaRepository = require('../repositories/ordenDeVentaRepository');
const personalService = require('./personalService');
const empresaIngresoRepository = require('../repositories/empresaIngresoRepository');

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
        const [clientes, ordenes, empresas] = await Promise.allSettled([
            clienteNFURepository.obtenerTodos(), ordenDeVentaRepository.obtenerParaIngresosLogistica(), empresaIngresoRepository.listar(true)
        ]);
        if (clientes.status === 'rejected') console.error('Error al obtener empresas para ingresos:', clientes.reason);
        if (ordenes.status === 'rejected') console.error('Error al obtener órdenes para ingresos:', ordenes.reason);
        if (empresas.status === 'rejected') console.error('Error al obtener empresas de ingresos:', empresas.reason);
        return {
            clientes: clientes.status === 'fulfilled' ? clientes.value || [] : [],
            errorClientes: clientes.status === 'rejected',
            ordenesVenta: ordenes.status === 'fulfilled' ? ordenes.value || [] : [],
            errorOrdenes: ordenes.status === 'rejected',
            empresasIngresos: empresas.status === 'fulfilled' ? empresas.value || [] : [], errorEmpresasIngresos: empresas.status === 'rejected'
        };
    }

    normalizarFiltros(entrada = {}) {
        const filtros = {};
        for (const [campo, limite] of Object.entries({ persona: 200, patente: 20, empresa: 255, motivo: 100, tipo_movimiento: 7, estado: 20, fecha_desde: 10, fecha_hasta: 10 })) {
            if (entrada[campo] == null || entrada[campo] === '') continue;
            if (typeof entrada[campo] !== 'string' || entrada[campo].length > limite || /[\x00-\x1f\x7f]/.test(entrada[campo])) throw this.errorValidacion(`Revise el filtro ${campo}.`);
            const valor = entrada[campo].trim();
            if (valor) filtros[campo] = valor;
        }
        if (filtros.tipo_movimiento && !['INGRESO', 'EGRESO'].includes(filtros.tipo_movimiento)) throw this.errorValidacion('Seleccione un tipo de movimiento válido.');
        if (filtros.estado && !['pendientes', 'egresados'].includes(filtros.estado)) throw this.errorValidacion('Seleccione un estado válido.');
        for (const campo of ['fecha_desde', 'fecha_hasta']) {
            if (!filtros[campo]) continue;
            const fecha = new Date(`${filtros[campo]}T12:00:00Z`);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(filtros[campo]) || !Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== filtros[campo]) throw this.errorValidacion('Ingrese fechas válidas.');
        }
        if (filtros.fecha_desde && filtros.fecha_hasta && filtros.fecha_desde > filtros.fecha_hasta) throw this.errorValidacion('La fecha desde no puede ser posterior a la fecha hasta.');
        return filtros;
    }

    async listarMovimientos(pagina, entrada = {}) {
        const filtros = this.normalizarFiltros(entrada);
        const numero = Number(pagina);
        const limite = 50;
        const total = await movimientoIngresoRepository.contar(filtros);
        const paginas = Math.max(1, Math.ceil(total / limite));
        pagina = Math.min(Number.isSafeInteger(numero) && numero > 0 ? numero : 1, paginas);
        const movimientos = await movimientoIngresoRepository.listar(limite, (pagina - 1) * limite, filtros);
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
        if (datos.descripcion !== undefined) {
            if (datos.descripcion !== null && typeof datos.descripcion !== 'string') throw this.errorValidacion('La descripción debe ser texto.');
            const descripcion = (datos.descripcion || '').trim();
            if (descripcion.length > 2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(descripcion)) throw this.errorValidacion('La descripción debe tener hasta 2000 caracteres.');
            movimiento.descripcion = descripcion || null;
        }
        return movimiento;
    }

    async resolverEmpresaIngreso(id, obligatoria, connection, actual) {
        if (id === 'actual' && actual && ['Basura', 'Acero', 'Proveedor', 'Visita'].includes(actual.motivo) && actual.empresa) {
            return { empresa: actual.empresa, empresa_ingreso_id: actual.empresa_ingreso_id ?? null };
        }
        if ((id === undefined || id === null || id === '') && !obligatoria) return { empresa: null, empresa_ingreso_id: null };
        if (!['string', 'number'].includes(typeof id) || !/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id))) throw this.errorValidacion('Seleccione una empresa válida del padrón.');
        const empresa = await empresaIngresoRepository.obtener(Number(id), connection);
        if (!empresa || !Number(empresa.activo)) throw this.errorValidacion('La empresa no existe o está dada de baja.');
        return { empresa: empresa.nombre, empresa_ingreso_id: empresa.id };
    }

    async registrarMovimiento(datos, archivo) {
        const movimiento = this.validarCamposMovimiento(datos);
        if (movimiento.motivo === 'Personal') throw this.errorValidacion('Utilice la opción Ingreso de personal.');
        if (archivo) movimiento.archivo_jpg = `/uploads/ingresos/${archivo.filename}`;
        if (['Basura', 'Acero', 'Proveedor', 'Visita'].includes(movimiento.motivo)) {
            return db.withTransaction(async connection => {
                Object.assign(movimiento, await this.resolverEmpresaIngreso(datos.empresa_ingreso_id, movimiento.motivo !== 'Visita', connection));
                return movimientoIngresoRepository.crear(movimiento, connection);
            });
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
            movimiento.empresa_ingreso_id = null;
            movimiento.archivo_jpg = archivo ? `/uploads/ingresos/${archivo.filename}` : actual.archivo_jpg;
            if (datos.descripcion === undefined && actual.descripcion !== undefined) movimiento.descripcion = actual.descripcion;
            if (movimiento.motivo === 'Personal') {
                Object.assign(movimiento, personalService.validarDatos({ ...datos, nombre: movimiento.nombre, apellido: movimiento.apellido, descripcion: movimiento.descripcion }));
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
            } else if (['Basura', 'Acero', 'Proveedor', 'Visita'].includes(movimiento.motivo)) {
                Object.assign(movimiento, await this.resolverEmpresaIngreso(datos.empresa_ingreso_id, movimiento.motivo !== 'Visita', connection, actual));
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
                ...(ingreso.personal_id != null ? { personal_id: ingreso.personal_id, auto: ingreso.auto, cargo: ingreso.cargo, turno: ingreso.turno } : {}),
                ...(ingreso.descripcion !== undefined ? { descripcion: ingreso.descripcion } : {}),
                ...(ingreso.empresa_ingreso_id != null ? { empresa_ingreso_id: ingreso.empresa_ingreso_id } : {})
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
        const texto = entrada.trim();
        let campos = texto.split(/\\*@/).map(valor => valor.trim());
        if (campos.length === 1) {
            // Algunos lectores envían 2 en lugar de @. No reemplazar los 2 del trámite o del DNI.
            const escaneo = texto.match(/^(\d+)2([\p{L}\p{M} .’'-]+)2([\p{L}\p{M} .’'-]+)2([MFX])2(\d{7,8})(?:2[A-Z](?:2[^\r\n]*)?)?$/iu);
            if (escaneo) campos = escaneo.slice(1, 6).map(valor => valor.trim());
        }
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
