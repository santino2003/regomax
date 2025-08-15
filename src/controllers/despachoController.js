const despachoService = require('../services/despachoService');
const bolsonService = require('../services/bolsonService');
const ordenDeVentaService = require('../services/ordenDeVentaService');
const Excel = require('exceljs');
const db = require('../config/db'); // Importar la conexión a la base de datos

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
                precinto: req.query.precinto,
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
                precinto: req.query.precinto,
                fechaDesde: req.query.fechaDesde,
                fechaHasta: req.query.fechaHasta
            };
            
            const resultado = await despachoService.obtenerBolsonesDespachados(page, limit, filtros);
            
            // Depurar para ver la estructura exacta de los datos
            console.log("Datos de bolsones:", JSON.stringify(resultado.data.slice(0, 1), null, 2));
            
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
    },
    
    async despachoManual(req, res) {
        try {
            const { ordenId } = req.params;
            const { observaciones, productos } = req.body;
            
            if (!productos || !Array.isArray(productos) || productos.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar al menos un producto para despachar manualmente'
                });
            }
            
            const despachoData = {
                ordenVentaId: ordenId,
                responsable: req.user.username,
                observaciones: observaciones || 'Despacho manual',
                productosManual: productos,
                esManual: true
            };
            
            const result = await despachoService.procesarDespachoManual(despachoData);
            
            return res.status(201).json({
                success: true,
                message: 'Despacho manual creado exitosamente',
                data: result
            });
        } catch (error) {
            console.error('Error al crear despacho manual:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al crear despacho manual',
                error: error.message
            });
        }
    },
    
    /**
     * Exporta todos los bolsones despachados a un archivo Excel
     * @param {Object} req - Objeto de solicitud
     * @param {Object} res - Objeto de respuesta
     */
    async exportarBolsonesDespachados(req, res) {
        try {
            console.log('Iniciando proceso de exportación de bolsones despachados');
            
            // Crear un nuevo libro de Excel
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Bolsones Despachados');
            
            // Añadir encabezados
            worksheet.columns = [
                { header: '#', key: 'numero', width: 8 },
                { header: 'Código', key: 'codigo', width: 15 },
                { header: 'Producto', key: 'producto', width: 20 },
                { header: 'Peso (kg)', key: 'peso', width: 10 },
                { header: 'Precinto', key: 'precinto', width: 15 },
                { header: 'Fecha', key: 'fecha', width: 15 },
                { header: 'Responsable', key: 'responsable', width: 20 },
                { header: 'Orden de Venta', key: 'orden_venta', width: 15 }
            ];
            
            // Dar formato al encabezado
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4F81BD' }
            };
            worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
            
            console.log('Obteniendo datos de bolsones despachados para exportar');
            
            // Obtener todos los bolsones despachados con información de la orden de venta
            // Usando la tabla correcta despachos_detalle en lugar de despacho_items
            const query = `
                SELECT 
                    dd.id,
                    dd.bolson_codigo,
                    dd.producto,
                    dd.peso,
                    dd.precinto,
                    d.fecha,
                    d.responsable,
                    d.orden_venta_id
                FROM 
                    despachos_detalle dd
                JOIN 
                    despachos d ON dd.despacho_id = d.id
                WHERE 
                    (dd.es_manual = 0 OR dd.es_manual IS NULL)
                ORDER BY 
                    d.fecha DESC, dd.id DESC
            `;
            
            const resultado = await db.query(query);
            
            if (!resultado || resultado.length === 0) {
                console.log('No se encontraron bolsones despachados para exportar');
                return res.status(404).render('error', {
                    message: 'No hay bolsones despachados para exportar',
                    error: { status: 404, stack: 'No se encontraron bolsones despachados en la base de datos' }
                });
            }
            
            console.log(`Se encontraron ${resultado.length} bolsones despachados para exportar`);
            
            // Añadir los datos
            resultado.forEach((bolson, index) => {
                worksheet.addRow({
                    numero: index + 1,
                    codigo: bolson.bolson_codigo || 'N/A',
                    producto: bolson.producto || 'N/A',
                    peso: bolson.peso ? parseFloat(bolson.peso).toFixed(2) : 'N/A',
                    precinto: bolson.precinto || 'N/A',
                    fecha: bolson.fecha ? new Date(bolson.fecha).toLocaleDateString() : 'N/A',
                    responsable: bolson.responsable || 'N/A',
                    orden_venta: bolson.orden_venta_id ? `OV-${bolson.orden_venta_id}` : 'N/A'
                });
            });
            
            // Configurar el nombre del archivo con la fecha actual
            const fecha = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            const filename = `bolsones_despachados_${fecha}.xlsx`;
            
            console.log(`Generando archivo Excel: ${filename}`);
            
            // Configurar las cabeceras para la descarga
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            
            try {
                // Escribir a la respuesta
                await workbook.xlsx.write(res);
                res.end();
                console.log('Exportación de bolsones despachados completada exitosamente');
            } catch (writeError) {
                console.error('Error al escribir el archivo Excel:', writeError);
                return res.status(500).render('error', {
                    message: 'Error al generar el archivo Excel',
                    error: { status: 500, stack: writeError.message }
                });
            }
        } catch (error) {
            console.error('Error al exportar bolsones despachados:', error);
            return res.status(500).render('error', {
                message: 'Error al exportar bolsones despachados',
                error: { status: 500, stack: error.message || 'Error desconocido al exportar bolsones despachados' }
            });
        }
    },
};

module.exports = despachoController;