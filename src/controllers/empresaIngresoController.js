const servicio = require('../services/empresaIngresoService');
function errorJSON(res, error) {
    if (!error.status) console.error('Error en empresas de ingresos:', error);
    res.status(error.status || 500).json({ success: false, error: error.status ? error.message : 'No se pudo completar la operación con la empresa.' });
}
module.exports = {
    async listado(req, res) {
        try { res.render('empresasIngresos', { title: 'Empresas de ingresos', username: req.user.username, empresas: await servicio.listar() }); }
        catch (error) { console.error('Error al listar empresas:', error); res.status(500).render('personalError', { title: 'Empresas de ingresos', username: req.user.username, mensaje: 'No se pudieron cargar las empresas de ingresos.' }); }
    },
    async guardar(req, res) {
        try { res.status(req.params.id ? 200 : 201).json({ success: true, empresa: await servicio.guardar(req.body, req.params.id) }); }
        catch (error) { errorJSON(res, error); }
    },
    async eliminar(req, res) {
        try { await servicio.eliminar(req.params.id); res.json({ success: true }); }
        catch (error) { errorJSON(res, error); }
    }
};
