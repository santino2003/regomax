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
            // Obtener los parámetros de filtro
            const filtros = {
                nombre: req.query.nombre || '',
                contacto: req.query.contacto || '',
                rubro: req.query.rubro || ''
            };
            // Aquí deberías tener un método en el service/repository para obtener proveedores filtrados
            const proveedores = await proveedorService.obtenerTodos(filtros);
            res.render('listarProveedores', {
                username: req.user.username,
                proveedores,
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

};

module.exports = proveedoresController;