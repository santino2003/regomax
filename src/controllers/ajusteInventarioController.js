const ajusteInventarioService = require('../services/ajusteInventarioService');
const bienService = require('../services/bienService');

class AjusteInventarioController {
    /**
     * Renderizar vista de ajuste de inventario
     */
    async renderAjusteNuevo(req, res) {
        try {
            // Obtener datos para los dropdowns (igual que en crear bien)
            const datosFormulario = await bienService.obtenerDatosParaFormulario();
            
            res.render('ajusteInventarioNuevo', {
                user: req.user,
                username: req.user.username,
                pageTitle: 'Ajuste de Inventario',
                categorias: datosFormulario.categorias,
                familias: datosFormulario.familias,
                unidadesMedida: datosFormulario.unidadesMedida,
                almacenes: datosFormulario.almacenes,
                proveedores: datosFormulario.proveedores
            });
        } catch (error) {
            console.error('Error al renderizar vista de ajuste:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista',
                user: req.user
            });
        }
    }

    /**
     * Procesar ajuste de inventario
     */
    async procesarAjuste(req, res) {
        try {
            const resultado = await ajusteInventarioService.procesarAjuste(
                req.body,
                req.user.username
            );

            res.json(resultado);
        } catch (error) {
            console.error('Error al procesar ajuste:', error);
            res.status(500).json({
                success: false,
                message: 'Error al procesar el ajuste de inventario'
            });
        }
    }

    /**
     * Obtener historial de movimientos
     */
    async obtenerHistorial(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            
            const filtros = {
                tipo_movimiento: req.query.tipo_movimiento,
                fecha_desde: req.query.fecha_desde,
                fecha_hasta: req.query.fecha_hasta,
                bien_id: req.query.bien_id
            };

            const resultado = await ajusteInventarioService.obtenerHistorial(page, limit, filtros);
            res.json(resultado);
        } catch (error) {
            console.error('Error al obtener historial:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener el historial'
            });
        }
    }

    /**
     * Renderizar vista de historial
     */
    async renderHistorial(req, res) {
        try {
            res.render('ajusteInventarioHistorial', {
                user: req.user,
                username: req.user.username,
                pageTitle: 'Historial de Movimientos'
            });
        } catch (error) {
            console.error('Error al renderizar historial:', error);
            res.status(500).render('error', {
                message: 'Error al cargar el historial',
                user: req.user
            });
        }
    }
}

module.exports = new AjusteInventarioController();
