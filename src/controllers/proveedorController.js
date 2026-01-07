const proveedorService = require('../services/proveedorService');

const proveedoresController ={
    async nuevoProveedor(req, res) {
        try {
        const proveedorData = req.body;
        proveedorData.responsable = req.user.username;
        await proveedorService.crearProveedor(proveedorData);
        return res.status(201).json({
            success: true,
            message: 'Proveedor agregado exitosamente',
        });
        } catch (error) {
        console.error('Error al crear proveedor:', error);
        return res.status(500).json({ error: 'Error al crear proveedor' });
        }
    },

    async vistaListarProveedores(req, res) {
        try {
            // Obtener parámetros de paginación
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            // Obtener los parámetros de filtro
            const filtros = {
                nombre: req.query.nombre || '',
                contacto: req.query.contacto || '',
                rubro: req.query.rubro || ''
            };
            
            // Obtener proveedores con paginación
            const resultado = await proveedorService.obtenerTodos(filtros, page, limit);
            
            res.render('listarProveedores', {
                username: req.user.username,
                proveedores: resultado.data,
                pagination: resultado.pagination,
                filtros
            });
        } catch (error) {
            console.error('Error al listar proveedores:', error);
            res.status(500).render('error', {
                message: 'Error al listar proveedores',
                error
            });
        }
    },

    // Nuevo método para renderizar el formulario de creación de proveedor
    async vistaNuevoProveedor(req, res) {
        try {
            res.render('proveedoresNuevo', {
                title: 'Nuevo Proveedor',
                username: req.user.username
            });
        } catch (error) {
            console.error('Error al renderizar la vista de nuevo proveedor:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la vista de nuevo proveedor',
                error
            });
        }
    },

    async vistaVerProveedor(req, res) {
        try {
            const { id } = req.params;
            const proveedor = await proveedorService.obtenerPorId(id);
            
            if (!proveedor) {
                return res.status(404).render('error', {
                    message: 'Proveedor no encontrado',
                    username: req.user.username
                });
            }

            res.render('proveedoresVer', {
                username: req.user.username,
                proveedor
            });
        } catch (error) {
            console.error('Error al ver proveedor:', error);
            res.status(500).render('error', {
                message: 'Error al cargar los detalles del proveedor',
                error
            });
        }
    },

    async vistaEditarProveedor(req, res) {
        try {
            const { id } = req.params;
            const proveedor = await proveedorService.obtenerPorId(id);
            
            if (!proveedor) {
                return res.status(404).render('error', {
                    message: 'Proveedor no encontrado',
                    username: req.user.username
                });
            }

            res.render('proveedoresEditar', {
                username: req.user.username,
                proveedor
            });
        } catch (error) {
            console.error('Error al cargar vista de edición de proveedor:', error);
            res.status(500).render('error', {
                message: 'Error al cargar el formulario de edición',
                error
            });
        }
    },

    async eliminarProveedor(req, res) {
        try {
            const { id } = req.params;
            await proveedorService.eliminar(id);
            return res.status(200).json({
                success: true,
                message: 'Proveedor eliminado exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar proveedor:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Error al eliminar proveedor'
            });
        }
    },

    async actualizarProveedor(req, res) {
        try {
            const { id } = req.params;
            const proveedorData = req.body;
            proveedorData.responsable = req.user.username;
            
            await proveedorService.actualizar(id, proveedorData);
            
            return res.status(200).json({
                success: true,
                message: 'Proveedor actualizado exitosamente'
            });
        } catch (error) {
            console.error('Error al actualizar proveedor:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Error al actualizar proveedor'
            });
        }
    },

};

module.exports = proveedoresController;