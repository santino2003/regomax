const movimientoIngresoService = require('../services/movimientoIngresoService');

const movimientoIngresoController = {
    async listar(req, res) {
        try {
            const resultado = await movimientoIngresoService.listar(req.query.page);
            res.render('ingresosListado', {
                title: 'Ingresos y egresos',
                username: req.user.username,
                ...resultado,
                registrado: req.query.registrado === '1',
                errorListado: false
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

    async registrar(req, res) {
        try {
            const movimiento = await movimientoIngresoService.registrar(req.body);
            res.status(201).json({ success: true, movimiento });
        } catch (error) {
            if (!error.status) console.error('Error al registrar ingreso o egreso:', error);
            res.status(error.status || 500).json({
                success: false,
                error: error.status ? error.message : 'No se pudo registrar el movimiento. Intente nuevamente.'
            });
        }
    }
};

module.exports = movimientoIngresoController;
