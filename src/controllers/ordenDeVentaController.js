const OVService = require('../services/ordenDeVentaService');

const OVController = {
    async crearOrdenDeVenta(req, res) {
        try {
            const ordenData = req.body;
            // ordenData.responsable = req.user.username; // Descomenta esta línea si tienes autenticación y quieres usar el usuario autenticado
            ordenData.responsable = 'admin'; // Cambia esto por el usuario real si tienes autenticación
            const result = await OVService.crearOrdenDeVenta(ordenData);
            return res.status(201).json({
                success: true,
                message: 'Orden de venta creada exitosamente',
                data: result.codigo
            });
        } catch (error) {
            console.error('Error al crear orden de venta:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al crear orden de venta',
                error: error.message
            });
        }
    },

    async listarOrdenes(req, res) {
        try {
            const ordenes = await OVService.obtenerTodasLasOrdenes();
            return res.status(200).json({
                success: true,
                data: ordenes
            });
        } catch (error) {
            console.error('Error al listar órdenes:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener órdenes',
                error: error.message
            });
        }
    },

    async obtenerOrden(req, res) {
        try {
            const { id } = req.params;
            const orden = await OVService.obtenerOrdenPorId(id);
            
            return res.status(200).json({
                success: true,
                data: orden
            });
        } catch (error) {
            console.error('Error al obtener orden:', error);
            
            if (error.message.includes('no encontrada')) {
                return res.status(404).json({
                    success: false,
                    message: 'Orden de venta no encontrada'
                });
            }
            
            return res.status(500).json({
                success: false,
                message: 'Error al obtener orden de venta',
                error: error.message
            });
        }
    },
    async vistaListarOrdenes(req, res) {
        try {
            const ordenes = await OVService.obtenerTodasLasOrdenes();
            return res.render('listarOrdenes', {
                title: 'Listado de Órdenes de Venta',
                username: req.user.username,
                ordenes: ordenes,
            });
        } catch (error) {
            console.error('Error al listar órdenes de venta:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener órdenes de venta',
                error: error.message
            });
        }
    },
}

module.exports = OVController;
