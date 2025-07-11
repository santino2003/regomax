const OVService = require('../services/ordenDeVentaService');

const OVController = {
    async crearOrdenDeVenta(req, res) {
        try {
            const ordenData = req.body;
            // ordenData.responsable = req.user.username; // Descomenta esta línea si tienes autenticación y quieres usar el usuario autenticado
            ordenData.responsable = req.user.username; // Cambia esto por el usuario real si tienes autenticación
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
            // Obtener parámetros de paginación y ordenación de la solicitud
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const sortBy = req.query.sortBy || 'id';
            const sortOrder = req.query.sortOrder || 'DESC';
            
            const resultado = await OVService.obtenerTodasLasOrdenes(page, limit, sortBy, sortOrder);
            
            return res.status(200).json({
                success: true,
                data: resultado.data,
                pagination: resultado.pagination
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
            // Parámetros de paginación para la vista
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            const estado = req.query.estado || '';
            
            // Por defecto ordenamos por id descendente (del último al primero)
            const resultado = await OVService.obtenerTodasLasOrdenes(page, limit, 'id', 'DESC');
            
            // Si hay un filtro de estado, filtramos los resultados
            if (estado && estado !== 'todos') {
                resultado.data = resultado.data.filter(orden => orden.estado === estado);
                
                // Ajustar la paginación para reflejar los resultados filtrados
                resultado.pagination.total = resultado.data.length;
                resultado.pagination.totalPages = Math.ceil(resultado.data.length / limit);
                if (resultado.pagination.page > resultado.pagination.totalPages) {
                    resultado.pagination.page = 1;
                }
            }
            
            // Si hay un término de búsqueda, filtramos los resultados
            if (search) {
                const searchLower = search.toLowerCase();
                resultado.data = resultado.data.filter(orden => 
                    (orden.codigo_venta && orden.codigo_venta.toLowerCase().includes(searchLower)) || 
                    (orden.cliente && orden.cliente.toLowerCase().includes(searchLower))
                );
                
                // Ajustar la paginación para reflejar los resultados de búsqueda
                resultado.pagination.total = resultado.data.length;
                resultado.pagination.totalPages = Math.ceil(resultado.data.length / limit);
            }
            
            return res.render('listarOrdenes', {
                title: 'Listado de Órdenes de Venta',
                username: req.user.username,
                ordenes: resultado.data,
                pagination: resultado.pagination,
                currentSearch: search,
                currentEstado: estado
            });
        } catch (error) {
            console.error('Error al listar órdenes de venta:', error);
            return res.status(500).render('error', {
                message: 'Error al cargar la lista de órdenes de venta',
                error: error
            });
        }
    },
    async vistaNuevaOrden(req, res) {
        try {
            // No necesitamos consultar clientes si es un campo manual
            return res.render('ordenesNueva', {
                title: 'Nueva Orden de Venta',
                username: req.user.username,
                // Pasamos un array vacío para evitar el error, pero no se usará
                clientes: [],
                productos: []
            });
        } catch (error) {
            console.error('Error al renderizar la vista de nueva orden:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al renderizar la vista de nueva orden',
                error: error.message
            });
        }
    }
}

module.exports = OVController;
