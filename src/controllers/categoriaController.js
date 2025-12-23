const categoriaService = require('../services/categoriaService');

const categoriaController = {
    async nuevaCategoria(req, res) {
        try {
            const categoriaData = req.body;
            categoriaData.responsable = req.user.username;
            await categoriaService.crearCategoria(categoriaData);
            return res.status(201).json({
                success: true,
                message: 'Categoria agregada exitosamente',
            });
        } catch (error) {
            console.error('Error al crear categoria:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al crear categoria' 
            });
        }
    },

    async modificarCategoria(req, res) {
        try {
            const { id } = req.params;
            const { nombre } = req.body;

            if (!nombre || nombre.trim() === '') {
                return res.status(400).json({ error: 'El nombre de la categoria es obligatorio' });
            }

            await categoriaService.modificarCategoria(id, nombre.trim());
            return res.status(200).json({
                success: true,
                message: 'Categoria modificada exitosamente',
            });
        } catch (error) {
            console.error('Error al modificar categoria:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al modificar categoria' 
            });
        }
    },
    
    async eliminarCategoria(req, res) {
        try {
            const { id } = req.params;
            await categoriaService.eliminarCategoria(id);
            return res.status(200).json({
                success: true,
                message: 'Categoria eliminada exitosamente',
            });
        } catch (error) {
            console.error('Error al eliminar categoria:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Error al eliminar categoria' 
            });
        }
    },

    async obtenerCategorias(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const resultado = await categoriaService.obtenerTodas(page, limit);
            return res.status(200).json(resultado);
        } catch (error) {
            console.error('Error al obtener categorias:', error);
            return res.status(500).json({ error: 'Error al obtener categorias' });
        }
    },

    // Vistas
    async vistaListarCategorias(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            const resultado = await categoriaService.obtenerTodas(page, limit);
            
            res.render('listarCategorias', {
                username: req.user.username,
                categorias: resultado.data,
                pagination: resultado.pagination
            });
        } catch (error) {
            console.error('Error al listar categorias:', error);
            res.status(500).render('error', {
                message: 'Error al listar categorias',
                error
            });
        }
    },

    async vistaNuevaCategoria(req, res) {
        try {
            res.render('categoriasNuevo', {
                username: req.user.username
            });
        } catch (error) {
            console.error('Error al renderizar vista de nueva categoria:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista de nueva categoria',
                error
            });
        }
    },

    async vistaVerCategoria(req, res) {
        try {
            const { id } = req.params;
            const categoria = await categoriaService.obtenerPorId(id);
            
            if (!categoria) {
                return res.status(404).render('error', {
                    message: 'Categoria no encontrada',
                    username: req.user.username
                });
            }

            res.render('categoriasVer', {
                username: req.user.username,
                categoria
            });
        } catch (error) {
            console.error('Error al ver categoria:', error);
            res.status(500).render('error', {
                message: 'Error al cargar los detalles de la categoria',
                error
            });
        }
    },

    async vistaEditarCategoria(req, res) {
        try {
            const { id } = req.params;
            const categoria = await categoriaService.obtenerPorId(id);
            
            if (!categoria) {
                return res.status(404).render('error', {
                    message: 'Categoria no encontrada',
                    username: req.user.username
                });
            }

            res.render('categoriasEditar', {
                username: req.user.username,
                categoria
            });
        } catch (error) {
            console.error('Error al cargar vista de edición de categoria:', error);
            res.status(500).render('error', {
                message: 'Error al cargar el formulario de edición',
                error
            });
        }
    },
};

module.exports = categoriaController;
