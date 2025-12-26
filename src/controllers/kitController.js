const kitService = require('../services/kitService');
const generarBarcodeBase64 = require('../utils/imageBarcode');

const kitController = {
    /**
     * Crear nuevo kit
     */
    async nuevoKit(req, res) {
        try {
            const kitData = req.body;
            kitData.responsable = req.user.username;
            
            // Procesar componentes
            if (kitData.componentes && typeof kitData.componentes === 'string') {
                kitData.componentes = JSON.parse(kitData.componentes);
            }
            
            const result = await kitService.crearKit(kitData);
            return res.status(201).json({
                success: true,
                message: 'Kit creado exitosamente',
                data: result.data
            });
        } catch (error) {
            console.error('Error al crear kit:', error);
            return res.status(500).json({ 
                success: false,
                error: error.message || 'Error al crear kit' 
            });
        }
    },

    /**
     * Modificar kit existente
     */
    async modificarKit(req, res) {
        try {
            const { id } = req.params;
            const kitData = req.body;

            // Procesar componentes
            if (kitData.componentes && typeof kitData.componentes === 'string') {
                kitData.componentes = JSON.parse(kitData.componentes);
            }

            await kitService.modificarKit(id, kitData);
            return res.status(200).json({
                success: true,
                message: 'Kit modificado exitosamente',
            });
        } catch (error) {
            console.error('Error al modificar kit:', error);
            return res.status(500).json({ 
                success: false,
                error: error.message || 'Error al modificar kit' 
            });
        }
    },
    
    /**
     * Eliminar kit
     */
    async eliminarKit(req, res) {
        try {
            const { id } = req.params;
            await kitService.eliminarKit(id);
            return res.status(200).json({
                success: true,
                message: 'Kit eliminado exitosamente',
            });
        } catch (error) {
            console.error('Error al eliminar kit:', error);
            return res.status(500).json({ 
                success: false,
                error: error.message || 'Error al eliminar kit' 
            });
        }
    },

    /**
     * Obtener todos los kits
     */
    async obtenerKits(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            // Filtros opcionales
            const filtros = {
                tipo: req.query.tipo,
                categoria_id: req.query.categoria_id,
                busqueda: req.query.busqueda
            };
            
            const resultado = await kitService.obtenerTodos(page, limit, filtros);
            return res.status(200).json(resultado);
        } catch (error) {
            console.error('Error al obtener kits:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al obtener kits' 
            });
        }
    },

    /**
     * Obtener kit por ID
     */
    async obtenerKitPorId(req, res) {
        try {
            const { id } = req.params;
            const kit = await kitService.obtenerPorId(id);
            
            // Generar código de barras
            if (kit) {
                kit.barcodeBase64 = await generarBarcodeBase64(kit.codigo);
            }
            
            return res.status(200).json(kit);
        } catch (error) {
            console.error('Error al obtener kit:', error);
            return res.status(500).json({ error: error.message || 'Error al obtener kit' });
        }
    },

    /**
     * Descontar stock de kit y componentes
     */
    async descontarStock(req, res) {
        try {
            const { id } = req.params;
            const { cantidad } = req.body;
            
            if (cantidad === undefined || cantidad === null) {
                return res.status(400).json({ error: 'La cantidad es requerida' });
            }
            
            await kitService.descontarStock(id, parseInt(cantidad));
            return res.status(200).json({
                success: true,
                message: 'Stock descontado exitosamente del kit y sus componentes',
            });
        } catch (error) {
            console.error('Error al descontar stock:', error);
            return res.status(500).json({ 
                success: false,
                error: error.message || 'Error al descontar stock' 
            });
        }
    },

    /**
     * Incrementar stock de kit y componentes
     */
    async incrementarStock(req, res) {
        try {
            const { id } = req.params;
            const { cantidad } = req.body;
            
            if (cantidad === undefined || cantidad === null) {
                return res.status(400).json({ error: 'La cantidad es requerida' });
            }
            
            await kitService.incrementarStock(id, parseInt(cantidad));
            return res.status(200).json({
                success: true,
                message: 'Stock incrementado exitosamente del kit y sus componentes',
            });
        } catch (error) {
            console.error('Error al incrementar stock:', error);
            return res.status(500).json({ 
                success: false,
                error: error.message || 'Error al incrementar stock' 
            });
        }
    },

    /**
     * Obtener datos para formularios (dropdowns)
     */
    async obtenerDatosFormulario(req, res) {
        try {
            const datos = await kitService.obtenerDatosFormulario();
            return res.status(200).json(datos);
        } catch (error) {
            console.error('Error al obtener datos para formulario:', error);
            return res.status(500).json({ error: 'Error al obtener datos para formulario' });
        }
    },

    // ===== VISTAS =====

    /**
     * Vista: Listar kits
     */
    async vistaListarKits(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            const filtros = {
                tipo: req.query.tipo,
                categoria_id: req.query.categoria_id,
                busqueda: req.query.busqueda
            };
            
            const resultado = await kitService.obtenerTodos(page, limit, filtros);
            const datosFormulario = await kitService.obtenerDatosFormulario();
            
            res.render('listarKits', {
                username: req.user.username,
                kits: resultado.data,
                pagination: resultado.pagination,
                filtros: filtros,
                categorias: datosFormulario.categorias,
                tipos: datosFormulario.tipos
            });
        } catch (error) {
            console.error('Error al listar kits:', error);
            res.status(500).render('error', {
                message: 'Error al listar kits',
                error
            });
        }
    },

    /**
     * Vista: Nuevo kit
     */
    async vistaNuevoKit(req, res) {
        try {
            const datosFormulario = await kitService.obtenerDatosFormulario();
            
            res.render('kitNuevo', {
                username: req.user.username,
                categorias: datosFormulario.categorias,
                familias: datosFormulario.familias,
                unidadesMedida: datosFormulario.unidadesMedida,
                almacenes: datosFormulario.almacenes,
                bienesDisponibles: datosFormulario.bienesDisponibles,
                tipos: datosFormulario.tipos
            });
        } catch (error) {
            console.error('Error al renderizar vista de nuevo kit:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista de nuevo kit',
                error
            });
        }
    },

    /**
     * Vista: Ver kit
     */
    async vistaVerKit(req, res) {
        try {
            const { id } = req.params;
            const kit = await kitService.obtenerPorId(id);
            
            if (!kit) {
                return res.status(404).render('error', {
                    message: 'Kit no encontrado',
                    username: req.user.username
                });
            }

            // Generar código de barras
            kit.barcodeBase64 = await generarBarcodeBase64(kit.codigo);

            res.render('kitVer', {
                username: req.user.username,
                kit
            });
        } catch (error) {
            console.error('Error al ver kit:', error);
            res.status(500).render('error', {
                message: 'Error al cargar los detalles del kit',
                error
            });
        }
    },

    /**
     * Vista: Editar kit
     */
    async vistaEditarKit(req, res) {
        try {
            const { id } = req.params;
            const kit = await kitService.obtenerPorId(id);
            
            if (!kit) {
                return res.status(404).render('error', {
                    message: 'Kit no encontrado',
                    username: req.user.username
                });
            }

            const datosFormulario = await kitService.obtenerDatosFormulario();

            res.render('kitEditar', {
                username: req.user.username,
                kit,
                categorias: datosFormulario.categorias,
                familias: datosFormulario.familias,
                unidadesMedida: datosFormulario.unidadesMedida,
                almacenes: datosFormulario.almacenes,
                bienesDisponibles: datosFormulario.bienesDisponibles,
                tipos: datosFormulario.tipos
            });
        } catch (error) {
            console.error('Error al cargar vista de edición de kit:', error);
            res.status(500).render('error', {
                message: 'Error al cargar el formulario de edición',
                error
            });
        }
    },
};

module.exports = kitController;
