const ordenCompraService = require('../services/ordenCompraService');
const pdfOrdenCompraService = require('../services/pdfOrdenCompraService');
const bienRepository = require('../repositories/bienRepository');
const proveedorRepository = require('../repositories/proveedorRepository');
const unidadMedidaRepository = require('../repositories/unidadMedidaRepository');
const centroCostoRepository = require('../repositories/centroCostoRepository');
const path = require('path');
const fs = require('fs').promises;

const ordenCompraController = {
    /**
     * Vista para crear nueva orden de compra
     */
    async vistaNuevaOrden(req, res) {
        try {
            // Obtener datos necesarios para el formulario
            const bienesResult = await bienRepository.obtenerTodos(1, 10000, {});
            const proveedoresResult = await proveedorRepository.obtenerTodos({}, 1, 10000);
            const unidadesMedidaResult = await unidadMedidaRepository.obtenerTodas(1, 10000);
            const centrosCosto = await centroCostoRepository.obtenerActivos();

            return res.render('ordenesCompraNueva', {
                username: req.user.username,
                bienes: bienesResult.data || [],
                proveedores: proveedoresResult.data || [],
                unidadesMedida: unidadesMedidaResult.data || [],
                centrosCosto: centrosCosto || []
            });
        } catch (error) {
            console.error('Error al renderizar vista de nueva orden:', error);
            return res.status(500).render('error', {
                message: 'Error al cargar la vista de nueva orden',
                error: error
            });
        }
    },

    /**
     * Vista para editar orden de compra existente
     */
    async vistaEditarOrden(req, res) {
        try {
            const { id } = req.params;
            
            // Obtener datos de la orden
            const orden = await ordenCompraService.obtenerOrdenPorId(id);
            if (!orden) {
                return res.status(404).render('error', {
                    message: 'Orden de compra no encontrada'
                });
            }

            // Obtener datos necesarios para el formulario
            const bienesResult = await bienRepository.obtenerTodos(1, 10000, {});
            const proveedoresResult = await proveedorRepository.obtenerTodos({}, 1, 10000);
            const unidadesMedidaResult = await unidadMedidaRepository.obtenerTodas(1, 10000);
            const centrosCosto = await centroCostoRepository.obtenerActivos();

            return res.render('ordenesCompraEditar', {
                username: req.user.username,
                orden: orden,
                bienes: bienesResult.data || [],
                proveedores: proveedoresResult.data || [],
                unidadesMedida: unidadesMedidaResult.data || [],
                centrosCosto: centrosCosto || []
            });
        } catch (error) {
            console.error('Error al renderizar vista de editar orden:', error);
            return res.status(500).render('error', {
                message: 'Error al cargar la vista de editar orden',
                error: error
            });
        }
    },

    /**
     * Crear nueva orden de compra
     */
    async nuevaOrdenCompra(req, res) {
        try {
            const ordenData = req.body;
            ordenData.creado_por = req.user.username;

            // Procesar items si vienen como JSON string
            if (typeof ordenData.items === 'string') {
                ordenData.items = JSON.parse(ordenData.items);
            }

            // Si hay archivos adjuntos (múltiples archivos)
            if (req.files && req.files.length > 0) {
                ordenData.archivos_adjuntos = req.files.map(file => file.filename);
            }

            const result = await ordenCompraService.crearOrdenCompra(ordenData, req.user.username);
            
            return res.status(201).json({
                success: true,
                message: 'Orden de compra creada exitosamente',
                data: result.data
            });
        } catch (error) {
            console.error('Error al crear orden de compra:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Error al crear orden de compra'
            });
        }
    },

    /**
     * Modificar orden de compra existente
     */
    async modificarOrdenCompra(req, res) {
        try {
            const { id } = req.params;
            const ordenData = req.body;

            // Procesar items si vienen como JSON string
            if (ordenData.items) {
                if (typeof ordenData.items === 'string') {
                    ordenData.items = JSON.parse(ordenData.items);
                }
            }

            // Archivos a eliminar
            if (ordenData.archivos_eliminar) {
                if (typeof ordenData.archivos_eliminar === 'string') {
                    ordenData.archivos_eliminar = JSON.parse(ordenData.archivos_eliminar);
                }
            }

            // Si hay archivos adjuntos (múltiples archivos)
            if (req.files && req.files.length > 0) {
                ordenData.archivos_adjuntos = req.files.map(file => file.filename);
            }

            await ordenCompraService.modificarOrdenCompra(id, ordenData);
            
            return res.status(200).json({
                success: true,
                message: 'Orden de compra modificada exitosamente'
            });
        } catch (error) {
            console.error('Error al modificar orden de compra:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Error al modificar orden de compra'
            });
        }
    },

    /**
     * Eliminar orden de compra
     */
    async eliminarOrdenCompra(req, res) {
        try {
            const { id } = req.params;
            await ordenCompraService.eliminarOrdenCompra(id);
            
            return res.status(200).json({
                success: true,
                message: 'Orden de compra eliminada exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar orden de compra:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Error al eliminar orden de compra'
            });
        }
    },

    /**
     * Obtener todas las ordenes de compra con filtros
     */
    async obtenerOrdenesCompra(req, res) {
        try {
            const filtros = {
                estado: req.query.estado,
                proveedor_id: req.query.proveedor_id,
                condicion: req.query.condicion,
                bien_id: req.query.bien_id,
                fecha_desde: req.query.fecha_desde,
                fecha_hasta: req.query.fecha_hasta,
                busqueda: req.query.busqueda
            };

            const pagina = parseInt(req.query.pagina) || 1;
            const limite = parseInt(req.query.limite) || 50;

            const resultado = await ordenCompraService.obtenerOrdenesCompra(filtros, pagina, limite);
            
            return res.status(200).json({
                success: true,
                data: resultado
            });
        } catch (error) {
            console.error('Error al obtener ordenes de compra:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Error al obtener ordenes de compra'
            });
        }
    },

    /**
     * Obtener una orden de compra por ID
     */
    async obtenerOrdenCompraPorId(req, res) {
        try {
            const { id } = req.params;
            const orden = await ordenCompraService.obtenerOrdenPorId(id);
            
            return res.status(200).json({
                success: true,
                data: orden
            });
        } catch (error) {
            console.error('Error al obtener orden de compra:', error);
            return res.status(404).json({
                success: false,
                error: error.message || 'Orden de compra no encontrada'
            });
        }
    },

    /**
     * Cambiar estado de una orden
     */
    async cambiarEstado(req, res) {
        try {
            const { id } = req.params;
            const { estado } = req.body;

            if (!estado) {
                return res.status(400).json({
                    success: false,
                    error: 'El estado es requerido'
                });
            }

            const username = req.user.username;
            const result = await ordenCompraService.cambiarEstado(id, estado, username);
            
            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Error al cambiar estado:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Error al cambiar estado'
            });
        }
    },

    /**
     * Actualizar cantidad recibida de un item
     * Solo permitido cuando la orden está en estado "En Proceso"
     */
    async actualizarCantidadRecibida(req, res) {
        try {
            const { id, itemId } = req.params;
            const { cantidad_recibida } = req.body;

            if (cantidad_recibida === undefined || cantidad_recibida === null) {
                return res.status(400).json({
                    success: false,
                    error: 'La cantidad recibida es requerida'
                });
            }

            const result = await ordenCompraService.actualizarCantidadRecibida(
                parseInt(id), 
                parseInt(itemId), 
                parseFloat(cantidad_recibida),
                req.user.username
            );
            
            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Error al actualizar cantidad recibida:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Error al actualizar cantidad recibida'
            });
        }
    },

    /**
     * Subir archivo adjunto
     */
    async subirArchivo(req, res) {
        try {
            const { id } = req.params;

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No se proporcionaron archivos'
                });
            }

            const archivos = req.files.map(file => file.filename);
            await ordenCompraService.agregarArchivos(id, archivos);

            return res.status(200).json({
                success: true,
                message: `${archivos.length} archivo(s) subido(s) exitosamente`,
                data: {
                    archivos: archivos.map(archivo => ({
                        nombre: archivo,
                        url: `/uploads/ordenes-compra/${archivo}`
                    }))
                }
            });
        } catch (error) {
            console.error('Error al subir archivos:', error);
            
            // Eliminar los archivos si hubo error
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const filePath = path.join(__dirname, '../../uploads/ordenes-compra', file.filename);
                    try {
                        await fs.unlink(filePath);
                    } catch (unlinkError) {
                        console.error('Error al eliminar archivo temporal:', unlinkError);
                    }
                }
            }

            return res.status(500).json({
                success: false,
                error: error.message || 'Error al subir archivos'
            });
        }
    },

    /**
     * Eliminar archivo adjunto
     */
    async eliminarArchivo(req, res) {
        try {
            const { id } = req.params;
            
            // Obtener la orden para conocer el archivo actual
            const orden = await ordenCompraService.obtenerOrdenPorId(id);
            
            if (!orden.archivo_adjunto) {
                return res.status(404).json({
                    success: false,
                    error: 'No hay archivo adjunto en esta orden'
                });
            }

            // Eliminar el archivo del sistema de archivos
            const filePath = path.join(__dirname, '../../uploads/ordenes-compra', orden.archivo_adjunto);
            try {
                await fs.unlink(filePath);
            } catch (unlinkError) {
                console.warn('No se pudo eliminar el archivo físico:', unlinkError);
            }

            // Actualizar la base de datos
            await ordenCompraService.actualizarArchivo(id, null);

            return res.status(200).json({
                success: true,
                message: 'Archivo eliminado exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar archivo:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Error al eliminar archivo'
            });
        }
    },

    /**
     * Obtener datos del formulario (bienes, proveedores, unidades de medida)
     */
    async obtenerDatosFormulario(req, res) {
        try {
            // Obtener todos los registros sin paginación (límite alto)
            const bienesResult = await bienRepository.obtenerTodos(1, 10000, {});
            const proveedoresResult = await proveedorRepository.obtenerTodos({}, 1, 10000);
            const unidadesMedidaResult = await unidadMedidaRepository.obtenerTodas(1, 10000);

            return res.status(200).json({
                success: true,
                data: {
                    bienes: bienesResult.data || [],
                    proveedores: proveedoresResult.data || [],
                    unidades_medida: unidadesMedidaResult.data || [],
                    estados: ['Abierta', 'Revision', 'Aprobada', 'En Proceso', 'Entregado', 'Cerrada'],
                    condiciones: ['No Critica', 'Semi Critica', 'Muy Critica']
                }
            });
        } catch (error) {
            console.error('Error al obtener datos del formulario:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Error al obtener datos del formulario'
            });
        }
    },

    /**
     * Obtener estadísticas de ordenes de compra
     */
    async obtenerEstadisticas(req, res) {
        try {
            const estadisticas = await ordenCompraService.obtenerEstadisticas();
            
            return res.status(200).json({
                success: true,
                data: estadisticas
            });
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Error al obtener estadísticas'
            });
        }
    },

    /**
     * Exportar orden de compra a PDF
     */
    async exportarPDF(req, res) {
        try {
            const { id } = req.params;
            
            // Obtener la orden para usar su código como nombre del archivo
            const orden = await ordenCompraService.obtenerOrdenPorId(id);
            if (!orden) {
                return res.status(404).json({
                    success: false,
                    error: 'Orden de compra no encontrada'
                });
            }
            
            // Generar el PDF
            const pdfDoc = await pdfOrdenCompraService.generarPDF(id);
            
            // Configurar headers para descarga con el código de la orden
            const nombreArchivo = `${orden.codigo}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=${nombreArchivo}`);
            
            // Pipe el PDF a la respuesta
            pdfDoc.pipe(res);
            
        } catch (error) {
            console.error('Error al exportar PDF:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Error al exportar PDF'
            });
        }
    }
};

module.exports = ordenCompraController;
