const bienService = require('../services/bienService');
const path = require('path');
const fs = require('fs').promises;
const generarBarcodeBase64 = require('../utils/imageBarcode');

const bienController = {
    /**
     * Crear nuevo bien
     */
    async nuevoBien(req, res) {
        try {
            const bienData = req.body;
            bienData.responsable = req.user.username;
            
            // Procesar proveedores (pueden venir como array o string separado por comas)
            if (bienData.proveedores && typeof bienData.proveedores === 'string') {
                bienData.proveedores = bienData.proveedores.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
            }
            
            const result = await bienService.crearBien(bienData);
            return res.status(201).json({
                success: true,
                message: 'Bien agregado exitosamente',
                data: result.data
            });
        } catch (error) {
            console.error('Error al crear bien:', error);
            return res.status(500).json({ 
                success: false,
                error: error.message || 'Error al crear bien' 
            });
        }
    },

    /**
     * Modificar bien existente
     */
    async modificarBien(req, res) {
        try {
            const { id } = req.params;
            const bienData = req.body;

            // Procesar proveedores
            if (bienData.proveedores && typeof bienData.proveedores === 'string') {
                bienData.proveedores = bienData.proveedores.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
            }

            await bienService.modificarBien(id, bienData);
            return res.status(200).json({
                success: true,
                message: 'Bien modificado exitosamente',
            });
        } catch (error) {
            console.error('Error al modificar bien:', error);
            return res.status(500).json({ 
                success: false,
                error: error.message || 'Error al modificar bien' 
            });
        }
    },
    
    /**
     * Eliminar bien
     */
    async eliminarBien(req, res) {
        try {
            const { id } = req.params;
            await bienService.eliminarBien(id);
            return res.status(200).json({
                success: true,
                message: 'Bien eliminado exitosamente',
            });
        } catch (error) {
            console.error('Error al eliminar bien:', error);
            return res.status(500).json({ 
                success: false,
                error: error.message || 'Error al eliminar bien' 
            });
        }
    },

    /**
     * Obtener todos los bienes
     */
    async obtenerBienes(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const critico = req.query.critico === '1' || req.query.critico === 'true';
            
            // Filtros opcionales
            const filtros = {
                tipo: req.query.tipo,
                categoria_id: req.query.categoria_id,
                familia_id: req.query.familia_id,
                busqueda: req.query.busqueda,
                critico
            };
            
            const resultado = await bienService.obtenerTodos(page, limit, filtros);
            return res.status(200).json(resultado);
        } catch (error) {
            console.error('Error al obtener bienes:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al obtener bienes' 
            });
        }
    },

    /**
     * Obtener bien por ID
     */
    async obtenerBienPorId(req, res) {
        try {
            const { id } = req.params;
            const bien = await bienService.obtenerPorId(id);
            
            // Generar código de barras
            if (bien && bien.data) {
                bien.data.barcodeBase64 = await generarBarcodeBase64(bien.data.codigo);
            }
            
            return res.status(200).json(bien);
        } catch (error) {
            console.error('Error al obtener bien:', error);
            return res.status(500).json({ error: error.message || 'Error al obtener bien' });
        }
    },

    /**
     * Actualizar stock
     */
    async actualizarStock(req, res) {
        try {
            const { id } = req.params;
            const { cantidad } = req.body;
            
            if (cantidad === undefined || cantidad === null) {
                return res.status(400).json({ error: 'La cantidad es requerida' });
            }
            
            await bienService.actualizarStock(id, parseFloat(cantidad));
            return res.status(200).json({
                success: true,
                message: 'Stock actualizado exitosamente',
            });
        } catch (error) {
            console.error('Error al actualizar stock:', error);
            return res.status(500).json({ 
                success: false,
                error: error.message || 'Error al actualizar stock' 
            });
        }
    },

    /**
     * Subir archivo adjunto
     */
    async subirArchivo(req, res) {
        try {
            const { id } = req.params;
            
            if (!req.file) {
                return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
            }

            // Convertir ruta absoluta a ruta relativa web
            const rutaRelativa = req.file.path.replace(/\\/g, '/').replace(/^.*\/uploads\//, 'uploads/');
            
            const archivoData = {
                nombre: req.file.originalname,
                ruta: rutaRelativa,
                tipo_mime: req.file.mimetype,
                tamanio: req.file.size,
                subido_por: req.user.username
            };
            
            await bienService.guardarArchivo(id, archivoData);
            
            return res.status(200).json({
                success: true,
                message: 'Archivo subido exitosamente',
            });
        } catch (error) {
            console.error('Error al subir archivo:', error);
            return res.status(500).json({ 
                success: false,
                error: error.message || 'Error al subir archivo' 
            });
        }
    },

    /**
     * Eliminar archivo adjunto
     */
    async eliminarArchivo(req, res) {
        try {
            const { archivoId } = req.params;
            
            const result = await bienService.eliminarArchivo(archivoId);
            
            // Intentar eliminar el archivo físico
            try {
                await fs.unlink(result.archivo.ruta_archivo);
            } catch (err) {
                console.error('Error al eliminar archivo físico:', err);
            }
            
            return res.status(200).json({
                success: true,
                message: 'Archivo eliminado exitosamente',
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
     * Obtener datos para formularios (dropdowns)
     */
    async obtenerDatosFormulario(req, res) {
        try {
            const datos = await bienService.obtenerDatosParaFormulario();
            return res.status(200).json(datos);
        } catch (error) {
            console.error('Error al obtener datos para formulario:', error);
            return res.status(500).json({ error: 'Error al obtener datos para formulario' });
        }
    },

    // ===== VISTAS =====

    /**
     * Vista: Listar bienes
     */
    async vistaListarBienes(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const critico = req.query.critico === '1' || req.query.critico === 'true';
            
            const filtros = {
                tipo: req.query.tipo,
                categoria_id: req.query.categoria_id,
                familia_id: req.query.familia_id,
                busqueda: req.query.busqueda,
                critico
            };
            
            const resultado = await bienService.obtenerTodos(page, limit, filtros);
            const datosFormulario = await bienService.obtenerDatosParaFormulario();
            
            res.render('listarBienes', {
                username: req.user.username,
                bienes: resultado.data,
                pagination: resultado.pagination,
                filtros: filtros,
                categorias: datosFormulario.categorias,
                familias: datosFormulario.familias,
                tipos: datosFormulario.tipos
            });
        } catch (error) {
            console.error('Error al listar bienes:', error);
            res.status(500).render('error', {
                message: 'Error al listar bienes',
                error
            });
        }
    },

    /**
     * Vista: Nuevo bien
     */
    async vistaNuevoBien(req, res) {
        try {
            const datosFormulario = await bienService.obtenerDatosParaFormulario();
            
            res.render('bienesNuevo', {
                username: req.user.username,
                categorias: datosFormulario.categorias,
                familias: datosFormulario.familias,
                unidadesMedida: datosFormulario.unidadesMedida,
                almacenes: datosFormulario.almacenes,
                proveedores: datosFormulario.proveedores,
                tipos: datosFormulario.tipos
            });
        } catch (error) {
            console.error('Error al renderizar vista de nuevo bien:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista de nuevo bien',
                error
            });
        }
    },

    /**
     * Vista: Ver bien
     */
    async vistaVerBien(req, res) {
        try {
            const { id } = req.params;
            const bien = await bienService.obtenerPorId(id);
            
            if (!bien) {
                return res.status(404).render('error', {
                    message: 'Bien no encontrado',
                    username: req.user.username
                });
            }

            // Generar código de barras
            bien.barcodeBase64 = await generarBarcodeBase64(bien.codigo);

            res.render('bienesVer', {
                username: req.user.username,
                bien
            });
        } catch (error) {
            console.error('Error al ver bien:', error);
            res.status(500).render('error', {
                message: 'Error al cargar los detalles del bien',
                error
            });
        }
    },

    /**
     * Vista: Editar bien
    /**
     * Vista: Editar bien
     */
    async vistaEditarBien(req, res) {
        try {
            const { id } = req.params;
            const bien = await bienService.obtenerPorId(id);
            
            if (!bien) {
                return res.status(404).render('error', {
                    message: 'Bien no encontrado',
                    username: req.user.username
                });
            }

            const datosFormulario = await bienService.obtenerDatosParaFormulario();

            res.render('bienesEditar', {
                username: req.user.username,
                bien,
                categorias: datosFormulario.categorias,
                familias: datosFormulario.familias,
                unidadesMedida: datosFormulario.unidadesMedida,
                almacenes: datosFormulario.almacenes,
                proveedores: datosFormulario.proveedores,
                tipos: datosFormulario.tipos
            });
        } catch (error) {
            console.error('Error al cargar vista de edición de bien:', error);
            res.status(500).render('error', {
                message: 'Error al cargar el formulario de edición',
                error
            });
        }
    },
};

module.exports = bienController;
