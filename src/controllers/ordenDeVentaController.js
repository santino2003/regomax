const OVService = require('../services/ordenDeVentaService');
const ProductoService = require('../services/productoService'); // Añadida nueva importación

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
                resultado.data = resultado.data.filter(orden => {
                    // Buscar por cliente
                    const clienteMatch = orden.cliente && 
                                         orden.cliente.toLowerCase().includes(searchLower);
                    
                    // Buscar por código de venta (si existe)
                    const codigoVentaMatch = orden.codigo_venta && 
                                             orden.codigo_venta.toLowerCase().includes(searchLower);
                    
                    // Buscar por ID en formato OV-X
                    const idFormatoOV = `OV-${orden.id}`.toLowerCase();
                    const idMatch = idFormatoOV.includes(searchLower);
                    
                    // Buscar por ID numérico
                    const idNumericoMatch = orden.id.toString() === search;
                    
                    return clienteMatch || codigoVentaMatch || idMatch || idNumericoMatch;
                });
                
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
            // Obtener la lista de productos para el desplegable
            const productos = await ProductoService.obtenerTodosLosProductos();
            
            return res.render('ordenesNueva', {
                title: 'Nueva Orden de Venta',
                username: req.user.username,
                productos: productos, // Pasamos la lista de productos
                clientes: [] // Mantenemos clientes vacío como antes
            });
        } catch (error) {
            console.error('Error al renderizar la vista de nueva orden:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al renderizar la vista de nueva orden',
                error: error.message
            });
        }
    },
    async vistaVisualizarOrden(req, res) {
        try {
            const { id } = req.params;
            const orden = await OVService.obtenerOrdenPorId(id);
            
            return res.render('visualizarOrden', {
                title: `Orden de Venta #${orden.codigo_venta || orden.id}`,
                username: req.user.username,
                orden: orden
            });
        } catch (error) {
            console.error('Error al visualizar orden de venta:', error);
            return res.status(error.message.includes('no encontrada') ? 404 : 500)
                .render('error', {
                    message: error.message.includes('no encontrada') ? 
                        'La orden solicitada no existe' : 
                        'Error al cargar los detalles de la orden de venta',
                    error: error
                });
        }
    },
    async vistaEditarOrden(req, res) {
        try {
            const { id } = req.params;
            const orden = await OVService.obtenerOrdenPorId(id);
            // Obtener la lista de productos para el desplegable
            const productos = await ProductoService.obtenerTodosLosProductos();
            
            return res.render('ordenesEditar', {
                title: `Editar Orden de Venta #OV-${orden.id}`,
                username: req.user.username,
                orden: orden,
                productos: productos // Pasamos la lista de productos
            });
        } catch (error) {
            console.error('Error al cargar vista de edición de orden:', error);
            return res.status(error.message.includes('no encontrada') ? 404 : 500)
                .render('error', {
                    message: error.message.includes('no encontrada') ? 
                        'La orden solicitada no existe' : 
                        'Error al cargar los datos de la orden de venta',
                    error: error
                });
        }
    },

    async actualizarOrden(req, res) {
        try {
            const { id } = req.params;
            const ordenData = req.body;
            ordenData.updatedBy = req.user.username; // Registrar quién hace la modificación
            
            const ordenActualizada = await OVService.actualizarOrden(id, ordenData);
            
            return res.status(200).json({
                success: true,
                message: 'Orden de venta actualizada exitosamente',
                data: ordenActualizada
            });
        } catch (error) {
            console.error('Error al actualizar orden de venta:', error);
            return res.status(error.message.includes('no encontrada') ? 404 : 500).json({
                success: false,
                message: 'Error al actualizar orden de venta',
                error: error.message
            });
        }
    }
}

module.exports = OVController;
