const despachoService = require('../services/despachoService');
const bolsonService = require('../services/bolsonService');
const ordenDeVentaService = require('../services/ordenDeVentaService');

const despachoController = {
    async nuevoDespacho(req, res) {
        try {
            const despachoData = {
                ...req.body,
                codigos: req.body.codigos || [],
                ordenVentaId: req.body.ordenVentaId,
                responsable: req.user.username,
                observaciones: req.body.observaciones || ''
            };
            
            const result = await despachoService.procesarDespacho(despachoData);
            
            return res.status(201).json({
                success: true,
                message: 'Despacho creado exitosamente',
                data: result
            });
        } catch (error) {
            console.error('Error al crear despacho:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al crear despacho',
                error: error.message
            });
        }
    },
    
    async obtenerDespachosPorOrden(req, res) {
        try {
            const { ordenId } = req.params;
            const despachos = await despachoService.obtenerDespachosPorOrden(ordenId);
            
            return res.status(200).json({
                success: true,
                data: despachos
            });
        } catch (error) {
            console.error('Error al obtener despachos:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener despachos',
                error: error.message
            });
        }
    },
    
    async verificarBolson(req, res) {
        try {
            const { codigo } = req.params;
            
            // Verificar si el bolsón existe
            const bolson = await bolsonService.obtenerPorCodigo(codigo);
            if (!bolson) {
                return res.status(404).json({
                    success: false,
                    message: 'Bolsón no encontrado'
                });
            }
            
            // Verificar si ya fue despachado
            const repository = require('../repositories/despachoRepository');
            const despachado = await repository.verificarBolsonDespachado(codigo);
            
            return res.status(200).json({
                success: true,
                data: {
                    bolson,
                    despachado: despachado !== null,
                    despacho: despachado
                }
            });
        } catch (error) {
            console.error('Error al verificar bolsón:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al verificar bolsón',
                error: error.message
            });
        }
    },
    
    async vistaCrearDespacho(req, res) {
        try {
            // Obtener todas las órdenes en estado 'en_proceso'
            const ordenes = await ordenDeVentaService.obtenerOrdenesPorEstado('abierta');
            
            res.render('despachoNuevo', {
                title: 'Nuevo Despacho',
                username: req.user.username,
                ordenes: ordenes
            });
        } catch (error) {
            console.error('Error al renderizar vista de despacho:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista de despacho',
                error: error
            });
        }
    },
    
    async vistaVerDespachos(req, res) {
        try {
            const { ordenId } = req.params;
            
            // Obtener la orden
            const orden = await ordenDeVentaService.obtenerOrdenPorId(ordenId);
            if (!orden) {
                return res.status(404).render('error', {
                    message: 'Orden no encontrada',
                    error: { status: 404 }
                });
            }
            
            // Obtener los despachos de la orden
            const despachos = await despachoService.obtenerDespachosPorOrden(ordenId);
            
            res.render('despachos', {
                title: `Despachos de Orden #${orden.id}`,
                username: req.user.username,
                orden: orden,
                despachos: despachos
            });
        } catch (error) {
            console.error('Error al renderizar vista de despachos:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista de despachos',
                error: error
            });
        }
    },
    
    async listarBolsonesDespachados(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            const filtros = {
                ordenId: req.query.ordenId,
                producto: req.query.producto,
                codigo: req.query.codigo,
                fechaDesde: req.query.fechaDesde,
                fechaHasta: req.query.fechaHasta
            };
            
            const resultado = await despachoService.obtenerBolsonesDespachados(page, limit, filtros);
            
            return res.status(200).json({
                success: true,
                data: resultado.data,
                pagination: resultado.pagination
            });
        } catch (error) {
            console.error('Error al listar bolsones despachados:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener bolsones despachados',
                error: error.message
            });
        }
    },
    
    async vistaListarBolsonesDespachados(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            const filtros = {
                ordenId: req.query.ordenId,
                producto: req.query.producto,
                codigo: req.query.codigo,
                fechaDesde: req.query.fechaDesde,
                fechaHasta: req.query.fechaHasta
            };
            
            const resultado = await despachoService.obtenerBolsonesDespachados(page, limit, filtros);
            
            res.render('bolsonesDespachados', {
                title: 'Bolsones Despachados',
                username: req.user.username,
                bolsones: resultado.data,
                pagination: resultado.pagination,
                filtros: filtros
            });
        } catch (error) {
            console.error('Error al renderizar vista de bolsones despachados:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la lista de bolsones despachados',
                error: error
            });
        }
    }
};

module.exports = despachoController;