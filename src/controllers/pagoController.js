const pagosService = require('../services/pagosService');
const pagoRepository = require('../repositories/pagoRepository');
const proveedorRepository = require('../repositories/proveedorRepository');

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
                proveedor_id: req.query.proveedor_id || '',
                tipo_pago: req.query.tipo_pago || '',
                fecha_desde: req.query.fecha_desde || '',
                fecha_hasta: req.query.fecha_hasta || '',
                pagado: req.query.pagado // Filtro de estado pagado
            };

            // Obtener lista de proveedores para el filtro
            const proveedoresResult = await proveedorRepository.obtenerTodos({}, 1, 1000);
            const proveedores = proveedoresResult.data || [];

            // Obtener pagos con paginación y filtros
            const resultado = await pagoRepository.obtenerPagosConFiltros(filtros, limit, offset);

            // Calcular información de paginación
            const totalPages = Math.ceil(resultado.total / limit);

            res.render('listarPagos', {
                username,
                pagos: resultado.pagos,
                filtros,
                proveedores,
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
     * Mostrar detalle de un pago
     */
    async mostrarDetalle(req, res) {
        try {
            const { id } = req.params;
            const username = req.user.username;

            // Obtener el pago por ID
            const pago = await pagoRepository.obtenerPorId(id);

            if (!pago) {
                return res.status(404).render('error', {
                    message: 'Pago no encontrado',
                    error: { status: 404 }
                });
            }

            res.render('pagoDetalle', {
                username,
                pago
            });
        } catch (error) {
            console.error('Error en PagoController.mostrarDetalle:', error);
            res.status(500).render('error', {
                message: 'Error al obtener el detalle del pago',
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

    /**
     * Marcar un pago como pagado
     */
    async marcarComoPagado(req, res) {
        try {
            const { id } = req.params;
            const { detalle } = req.body;
            const username = req.user.username;

            await pagoRepository.marcarComoPagado(id, username, detalle);

            res.json({
                success: true,
                message: 'Pago marcado como pagado exitosamente'
            });
        } catch (error) {
            console.error('Error en PagoController.marcarComoPagado:', error);
            res.status(500).json({
                success: false,
                message: 'Error al marcar pago como pagado',
                error: error.message
            });
        }
    }
}

module.exports = new PagoController();
