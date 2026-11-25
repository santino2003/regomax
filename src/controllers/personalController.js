const servicio = require('../services/personalService');
const fs = require('node:fs/promises');

function errorVista(req, res, error) {
    if (!error.status) console.error('Error en personal:', error);
    return res.status(error.status || 500).render('personalError', { title: 'Personal', username: req.user.username,
        mensaje: error.status ? error.message : 'No se pudo cargar personal. Intente nuevamente.' });
}
const controlador = {
    async detalle(req, res) {
        try {
            const datos = await servicio.obtenerFicha(req.params.id, req.query.page);
            res.render('personalDetalle', { title: 'Ficha de personal', username: req.user.username, ...datos });
        } catch (error) { errorVista(req, res, error); }
    },
    async listado(req, res) {
        try { res.render('personalListado', { title: 'Personal', username: req.user.username, personal: await servicio.listar() }); }
        catch (error) { errorVista(req, res, error); }
    },
    async formulario(req, res) {
        try { res.render('personalFormulario', { title: 'Personal', username: req.user.username,
            personal: req.params.id ? await servicio.obtener(req.params.id) : null }); }
        catch (error) { errorVista(req, res, error); }
    },
    async ingreso(req, res) {
        try { res.render('personalIngreso', { title: 'Ingreso de personal', username: req.user.username, personal: await servicio.listar(true) }); }
        catch (error) { errorVista(req, res, error); }
    },
    async guardar(req, res) {
        try { res.status(req.params.id ? 200 : 201).json({ success: true, personal: await servicio.guardar(req.body, req.params.id) }); }
        catch (error) { if (!error.status) console.error('Error al guardar personal:', error); res.status(error.status || 500).json({ success: false, error: error.status ? error.message : 'No se pudo guardar personal.' }); }
    },
    async eliminar(req, res) {
        try { await servicio.eliminar(req.params.id); res.json({ success: true }); }
        catch (error) { if (!error.status) console.error('Error al dar de baja personal:', error); res.status(error.status || 500).json({ success: false, error: error.status ? error.message : 'No se pudo dar de baja personal.' }); }
    },
    async registrarIngreso(req, res) {
        try { res.status(201).json({ success: true, movimiento: await servicio.registrarIngreso(req.body?.personal_id, req.body, req.file) }); }
        catch (error) {
            if (req.file) await fs.unlink(req.file.path).catch(fallo => { if (fallo.code !== 'ENOENT') console.error('No se pudo limpiar el adjunto:', fallo); });
            if (!error.status) console.error('Error al registrar ingreso de personal:', error);
            res.status(error.status || 500).json({ success: false, error: error.status ? error.message : 'No se pudo registrar el ingreso de personal.' });
        }
    }
};
module.exports = controlador;
