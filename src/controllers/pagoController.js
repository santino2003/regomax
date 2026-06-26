const pagosService = require('../services/pagosService');
const ordenCompraService = require('../services/ordenCompraService');
const pagoRepository = require('../repositories/pagoRepository');
const proveedorRepository = require('../repositories/proveedorRepository');

class PagoController {
    /**
     * Obtener cuotas de contrafactura de una orden de compra
     */
    async obtenerCuotasOrdenCompra(req, res) {
        try {
            const { ordenId } = req.params;
            
            console.log(`📋 [CONTROLLER] Obteniendo cuotas de contrafactura para orden: ${ordenId}`);
            
            // Obtener cuotas usando el servicio (que transforma las fechas correctamente)
            const cuotas = await ordenCompraService.obtenerCuotasOrden(ordenId);
            
            console.log(`📊 [CONTROLLER] Cuotas obtenidas del servicio: ${cuotas ? cuotas.length : 0}`);
            
            // También obtener adelanto si existe
            let adelanto = null;
            const pagosData = await pagoRepository.obtenerPagosContrafacturaPorOrden(ordenId);
            if (pagosData && pagosData.adelantos && pagosData.adelantos.length > 0) {
                const adelantoData = pagosData.adelantos[0];

                // Convertir fecha a formato YYYY-MM-DD
                let fechaFormato = '';
                if (adelantoData.fecha_pago) {
                    const fecha = new Date(adelantoData.fecha_pago);
                    const año = fecha.getFullYear();
                    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                    const día = String(fecha.getDate()).padStart(2, '0');
                    fechaFormato = `${año}-${mes}-${día}`;
                }

                // Tomar el monto real del adelanto desde los campos correctos
                const montoAdelantoRaw =
                    adelantoData.monto_adelanto != null
                        ? adelantoData.monto_adelanto
                        : (adelantoData.monto_pago != null ? adelantoData.monto_pago : null);

                const montoAdelanto =
                    montoAdelantoRaw != null && montoAdelantoRaw !== ''
                        ? parseFloat(montoAdelantoRaw)
                        : null;

                adelanto = {
                    monto: montoAdelanto,
                    fecha: fechaFormato,
                    moneda: adelantoData.moneda || 'ARS'
                };

                console.log('💰 [CONTROLLER] Adelanto construido para respuesta de cuotas:', adelanto);
            }
            
            console.log(`✅ [CONTROLLER] Se encontraron ${cuotas ? cuotas.length : 0} cuota(s)`);
            if (cuotas && cuotas.length > 0) {
                cuotas.forEach((c, i) => {
                    console.log(`   Cuota ${i+1}: ${c.fecha} - $${c.monto}`);
                });
            }
            
            return res.json({
                success: true,
                data: {
                    cuotas: cuotas || [],
                    adelanto: adelanto
                }
            });
        } catch (error) {
            console.error('❌ [CONTROLLER] Error al obtener cuotas de orden de compra:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Error al obtener cuotas'
            });
        }
    }

    /**
     * Mostrar la vista de listado de pagos
     */
    async mostrarListado(req, res) {
        try {
            const username = req.user.username;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit || req.query.limite) || 50;
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

            // Obtener totales agregados (sin paginación) con los mismos filtros
            const totales = await pagoRepository.obtenerTotalesConFiltros(filtros);
            const totalesPorMoneda = await pagoRepository.obtenerTotalesPorMonedaConFiltros(filtros);

            // Calcular información de paginación
            const totalPages = Math.ceil(resultado.total / limit);

            res.render('listarPagos', {
                username,
                pagos: resultado.pagos,
                filtros,
                proveedores,
                totales,
                totalesPorMoneda,
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
            // Si la petición espera JSON (llamada desde JS), respondemos con JSON
            const acceptHeader = req.headers.accept || '';
            const isJsonRequest = req.xhr || acceptHeader.includes('application/json') || acceptHeader.includes('*/*');

            if (isJsonRequest) {
                return res.json({
                    success: true,
                    message: 'Pago marcado como pagado exitosamente',
                    redirectUrl: `/pagos/${id}`
                });
            }

            // Si viene de un form normal, redirigimos directo al detalle del pago
            return res.redirect(`/pagos/${id}`);
        } catch (error) {
            console.error('Error en PagoController.marcarComoPagado:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Error al marcar pago como pagado. Realice la operación nuevamente.',
                error: error.message
            });
        }
    }

    /**
     * Registrar pago múltiple con comprobante único
     */
    async marcarPagosMultiples(req, res) {
        try {
            const { ids, detalle } = req.body;
            const username = req.user.username;

            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe seleccionar al menos un pago'
                });
            }

            const resultado = await pagosService.registrarPagoMultiple(ids, username, detalle || null);

            if (!resultado.success) {
                return res.status(400).json(resultado);
            }

            return res.json({
                success: true,
                message: resultado.message,
                redirectUrl: `/pagos/${resultado.pagoId}`
            });
        } catch (error) {
            console.error('Error en PagoController.marcarPagosMultiples:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Error al registrar pago múltiple. Realice la operación nuevamente.',
                error: error.message
            });
        }
    }

    /**
     * Refinanciar un pago
     */
    async refinanciarPago(req, res) {
        try {
            const { id } = req.params;
            const { cuotas, observacionesGenerales } = req.body;
            const username = req.user.username;

            // Llamar al servicio para realizar la refinanciación
            const resultado = await pagosService.refinanciarPago(
                id,
                cuotas,
                username,
                observacionesGenerales
            );

            if (resultado.success) {
                res.json(resultado);
            } else {
                res.status(400).json(resultado);
            }

        } catch (error) {
            console.error('Error en PagoController.refinanciarPago:', error);
            res.status(500).json({
                success: false,
                message: 'Error al refinanciar el pago',
                error: error.message
            });
        }
    }
}

module.exports = new PagoController();
