const pagosService = require('../services/pagosService');
const pagoRepository = require('../repositories/pagoRepository');

class PagoController {
    /**
     * Mostrar la vista de listado de pagos
     */
    async mostrarListado(req, res) {
        try {
            const username = req.user.username;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const offset = (page - 1) * limit;

            // Obtener filtros de la query string
            const filtros = {
                orden_codigo: req.query.orden_codigo || '',
                proveedor: req.query.proveedor || '',
                tipo_pago: req.query.tipo_pago || '',
                fecha_desde: req.query.fecha_desde || '',
                fecha_hasta: req.query.fecha_hasta || '',
                bien_nombre: req.query.bien_nombre || ''
            };

            // Obtener pagos con paginación y filtros
            const resultado = await pagoRepository.obtenerPagosConFiltros(filtros, limit, offset);

            // Calcular información de paginación
            const totalPages = Math.ceil(resultado.total / limit);

            res.render('listarPagos', {
                username,
                pagos: resultado.pagos,
                filtros,
                paginacion: {
                    currentPage: page,
                    totalPages,
                    totalItems: resultado.total,
                    limit,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            });
        } catch (error) {
            console.error('Error en PagoController.mostrarListado:', error);
            res.status(500).render('error', {
                message: 'Error al obtener el listado de pagos',
                error: error
            });
        }
    }

    /**
     * Obtener resumen de pagos (API)
     */
    async obtenerResumen(req, res) {
        try {
            const { fecha_inicio, fecha_fin } = req.query;

            if (!fecha_inicio || !fecha_fin) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren las fechas de inicio y fin'
                });
            }

            const resumen = await pagosService.obtenerResumenPorFecha(fecha_inicio, fecha_fin);

            res.json({
                success: true,
                data: resumen
            });
        } catch (error) {
            console.error('Error en PagoController.obtenerResumen:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener el resumen de pagos',
                error: error.message
            });
        }
    }

    /**
     * Exportar pagos a Excel
     */
    async exportarExcel(req, res) {
        try {
            // Obtener filtros de la query string
            const filtros = {
                orden_codigo: req.query.orden_codigo || '',
                proveedor: req.query.proveedor || '',
                tipo_pago: req.query.tipo_pago || '',
                fecha_desde: req.query.fecha_desde || '',
                fecha_hasta: req.query.fecha_hasta || '',
                bien_nombre: req.query.bien_nombre || ''
            };

            // Obtener todos los pagos sin paginación para exportar
            const resultado = await pagoRepository.obtenerPagosConFiltros(filtros, null, null);

            // Aquí podrías implementar la lógica de exportación a Excel
            // Por ahora, devolvemos JSON
            res.json({
                success: true,
                data: resultado.pagos,
                total: resultado.total
            });
        } catch (error) {
            console.error('Error en PagoController.exportarExcel:', error);
            res.status(500).json({
                success: false,
                message: 'Error al exportar pagos',
                error: error.message
            });
        }
    }
}

module.exports = new PagoController();
