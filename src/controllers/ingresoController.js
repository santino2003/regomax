const ingresoService = require('../services/ingresoService');

const ingresoController = {
    async vistaNuevoIngreso(req, res) {
        const datos = await ingresoService.obtenerDatosNuevoIngreso();
        res.render('ingresosNuevo', { username: req.user.username, ...datos });
    },

    async listarMovimientos(req, res) {
        try {
            const resultado = await ingresoService.listarMovimientos(req.query.page);
            res.render('ingresosListado', {
                title: 'Ingresos y egresos', username: req.user.username, ...resultado,
                registrado: req.query.registrado === '1', errorListado: false
            });
        } catch (error) {
            console.error('Error al listar ingresos y egresos:', error);
            res.status(500).render('ingresosListado', {
                title: 'Ingresos y egresos', username: req.user.username,
                movimientos: [], pagina: 1, paginas: 1, total: 0,
                registrado: false, errorListado: true
            });
        }
    },

    async registrarMovimiento(req, res) {
        try {
            const movimiento = await ingresoService.registrarMovimiento(req.body);
            res.status(201).json({ success: true, movimiento });
        } catch (error) {
            if (!error.status) console.error('Error al registrar ingreso o egreso:', error);
            res.status(error.status || 500).json({ success: false,
                error: error.status ? error.message : 'No se pudo registrar el movimiento. Intente nuevamente.' });
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
