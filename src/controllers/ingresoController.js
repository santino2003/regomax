const ingresoService = require('../services/ingresoService');
const clienteNFUService = require('../services/clienteNFUService');

const ingresoController = {
    async vistaNuevoIngreso(req, res) {
        let clientes = [];
        let errorClientes = false;
        try {
            clientes = await clienteNFUService.obtenerTodos() || [];
        } catch (error) {
            console.error('Error al obtener clientes NFU para ingresos:', error);
            errorClientes = true;
        }
        res.render('ingresosNuevo', { username: req.user.username, clientes, errorClientes });
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
            const persona = await ingresoService.registrar(req.body || {});
            res.json({ success: true, persona });
        } catch (error) {
            if (!error.status) console.error('Error al registrar persona:', error);
            res.status(error.status || 500).json({ success: false,
                error: error.status ? error.message : 'No se pudo registrar la persona. Intente nuevamente.' });
        }
    }
};

module.exports = ingresoController;
