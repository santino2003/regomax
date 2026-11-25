const ingresoService = require('../services/ingresoService');
const fs = require('node:fs/promises');
const path = require('node:path');
const { getUploadPath } = require('../config/uploads');

const ingresoController = {
    async vistaEditarIngreso(req, res) {
        const numero = Number(req.query.page);
        const pagina = Number.isSafeInteger(numero) && numero > 0 ? numero : 1;
        try {
            const movimiento = await ingresoService.obtenerDetalle(req.params.id);
            if (movimiento.tipo_movimiento !== 'INGRESO') {
                return res.status(400).render('ingresoDetalle', { title: 'Editar ingreso', username: req.user.username,
                    movimiento: null, pagina, errorDetalle: 'Solo se pueden editar ingresos.' });
            }
            const datos = await ingresoService.obtenerDatosNuevoIngreso();
            res.render('ingresosEditar', { title: 'Editar ingreso', username: req.user.username, movimiento, pagina, ...datos });
        } catch (error) {
            if (!error.status) console.error('Error al cargar la edición del ingreso:', error);
            res.status(error.status || 500).render('ingresoDetalle', { title: 'Editar ingreso', username: req.user.username,
                movimiento: null, pagina, errorDetalle: error.status ? error.message : 'No se pudo cargar el ingreso.' });
        }
    },

    async editarIngreso(req, res) {
        try {
            const { archivoAnterior, ...movimiento } = await ingresoService.editarIngreso(req.params.id, req.body, req.file);
            if (typeof archivoAnterior === 'string' && /^\/uploads\/ingresos\/[a-z0-9_-]+\.(jpe?g|pdf)$/i.test(archivoAnterior) && archivoAnterior !== movimiento.archivo_jpg) {
                await fs.unlink(path.join(getUploadPath('ingresos'), path.basename(archivoAnterior))).catch(fallo => {
                    if (fallo.code !== 'ENOENT') console.error('No se pudo limpiar el adjunto reemplazado:', fallo);
                });
            }
            res.json({ success: true, movimiento });
        } catch (error) {
            if (req.file) await fs.unlink(req.file.path).catch(fallo => {
                if (fallo.code !== 'ENOENT') console.error('No se pudo limpiar el adjunto de la edición rechazada:', fallo);
            });
            if (!error.status) console.error('Error al editar ingreso:', error);
            res.status(error.status || 500).json({ success: false,
                error: error.status ? error.message : 'No se pudo guardar el ingreso. Intente nuevamente.' });
        }
    },

    async verDetalle(req, res) {
        const numeroPaginaPersonal = Number(req.query.personal_page);
        const paginaPersonal = Number.isSafeInteger(numeroPaginaPersonal) && numeroPaginaPersonal > 0 ? numeroPaginaPersonal : 1;
        const numeroPagina = Number(req.query.page);
        const pagina = Number.isSafeInteger(numeroPagina) && numeroPagina > 0 ? numeroPagina : 1;
        try {
            const movimiento = await ingresoService.obtenerDetalle(req.params.id);
            res.render('ingresoDetalle', {
                title: `Detalle del movimiento #${movimiento.id}`, username: req.user.username,
                movimiento, pagina, paginaPersonal, errorDetalle: null
            });
        } catch (error) {
            if (!error.status) console.error('Error al consultar el detalle del movimiento:', error);
            res.status(error.status || 500).render('ingresoDetalle', {
                title: 'Detalle del movimiento', username: req.user.username, movimiento: null, pagina,
                errorDetalle: error.status ? error.message : 'No se pudo cargar el detalle. Intente nuevamente.'
            });
        }
    },

    async vistaNuevoIngreso(req, res) {
        const datos = await ingresoService.obtenerDatosNuevoIngreso();
        res.render('ingresosNuevo', { username: req.user.username, ...datos });
    },

    async listarMovimientos(req, res) {
        let filtros = {};
        try {
            filtros = ingresoService.normalizarFiltros(req.query);
            const resultado = await ingresoService.listarMovimientos(req.query.page, filtros);
            res.render('ingresosListado', {
                title: 'Ingresos y egresos', username: req.user.username, ...resultado,
                registrado: req.query.registrado === '1', egresoRegistrado: req.query.egreso === '1', errorListado: false, filtros
            });
        } catch (error) {
            if (!error.status) console.error('Error al listar ingresos y egresos:', error);
            res.status(error.status || 500).render('ingresosListado', {
                title: 'Ingresos y egresos', username: req.user.username,
                movimientos: [], pagina: 1, paginas: 1, total: 0,
                registrado: false, egresoRegistrado: false, errorListado: true, filtros,
                errorFiltros: error.status ? error.message : null
            });
        }
    },

    async registrarMovimiento(req, res) {
        try {
            const movimiento = await ingresoService.registrarMovimiento(req.body, req.file);
            res.status(201).json({ success: true, movimiento });
        } catch (error) {
            if (req.file) {
                await fs.unlink(req.file.path).catch(fallo => {
                    if (fallo.code !== 'ENOENT') console.error('No se pudo limpiar el adjunto del ingreso rechazado:', fallo);
                });
            }
            if (!error.status) console.error('Error al registrar ingreso o egreso:', error);
            res.status(error.status || 500).json({ success: false,
                error: error.status ? error.message : 'No se pudo registrar el movimiento. Intente nuevamente.' });
        }
    },

    async registrarEgreso(req, res) {
        try {
            const movimiento = await ingresoService.registrarEgreso(req.params.id);
            res.status(201).json({ success: true, movimiento });
        } catch (error) {
            if (!error.status) console.error('Error al registrar egreso:', error);
            res.status(error.status || 500).json({ success: false,
                error: error.status ? error.message : 'No se pudo registrar el egreso. Intente nuevamente.' });
        }
    },

    async identificarPersona(req, res) {
        try {
            const resultado = await ingresoService.identificar(req.body?.entrada);
            res.json({ success: true, ...resultado });
        } catch (error) {
            if (!error.status) console.error('Error al identificar persona:', error);
            res.status(error.status || 500).json({ success: false,
                error: error.status ? error.message : 'No se pudo consultar la persona. Intente nuevamente.' });
        }
    },

    async registrarPersona(req, res) {
        try {
            const persona = await ingresoService.registrarPersona(req.body || {});
            res.json({ success: true, persona });
        } catch (error) {
            if (!error.status) console.error('Error al registrar persona:', error);
            res.status(error.status || 500).json({ success: false,
                error: error.status ? error.message : 'No se pudo registrar la persona. Intente nuevamente.' });
        }
    }
};

module.exports = ingresoController;
