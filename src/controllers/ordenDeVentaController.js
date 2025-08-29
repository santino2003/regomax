const OVService = require('../services/ordenDeVentaService');
const ProductoService = require('../services/productoService'); // Añadida nueva importación
const Excel = require('exceljs'); // Añadir importación de ExcelJS

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
            const searchType = req.query.searchType || 'all'; // Nuevo parámetro para tipo de búsqueda
            
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
            
            // Si hay un término de búsqueda, filtramos los resultados según el tipo de búsqueda
            if (search) {
                const searchLower = search.toLowerCase();
                resultado.data = resultado.data.filter(orden => {
                    // Diferentes criterios de búsqueda según el tipo seleccionado
                    if (searchType === 'cliente') {
                        // Buscar solo por cliente
                        return orden.cliente && orden.cliente.toLowerCase().includes(searchLower);
                    } 
                    else if (searchType === 'clienteFinal') {
                        // Buscar solo por cliente final
                        return orden.cliente_final && orden.cliente_final.toLowerCase().includes(searchLower);
                    } 
                    else if (searchType === 'id') {
                        // Buscar solo por ID (numérico o formato OV-X)
                        const idFormatoOV = `OV-${orden.id}`.toLowerCase();
                        const idNumericoMatch = orden.id.toString() === search;
                        return idFormatoOV.includes(searchLower) || idNumericoMatch;
                    } 
                    else {
                        // Modo "all" - buscar en todos los campos (comportamiento predeterminado)
                        // Buscar por cliente
                        const clienteMatch = orden.cliente && 
                                            orden.cliente.toLowerCase().includes(searchLower);
                        
                        // Buscar por cliente final (nuevo)
                        const clienteFinalMatch = orden.cliente_final && 
                                                orden.cliente_final.toLowerCase().includes(searchLower);
                        
                        // Buscar por código de venta (si existe)
                        const codigoVentaMatch = orden.codigo_venta && 
                                                orden.codigo_venta.toLowerCase().includes(searchLower);
                        
                        // Buscar por ID en formato OV-X
                        const idFormatoOV = `OV-${orden.id}`.toLowerCase();
                        const idMatch = idFormatoOV.includes(searchLower);
                        
                        // Buscar por ID numérico
                        const idNumericoMatch = orden.id.toString() === search;
                        
                        return clienteMatch || clienteFinalMatch || codigoVentaMatch || idMatch || idNumericoMatch;
                    }
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
                currentEstado: estado,
                searchType: searchType // Pasar el tipo de búsqueda a la vista
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
            // Obtener bolsones despachados asociados a la orden
            const despachoService = require('../services/despachoService');
            const bolsonesDespachados = await despachoService.obtenerBolsonesDespachadosPorOrden(id);
            return res.render('visualizarOrden', {
                title: `Orden de Venta #${orden.codigo_venta || orden.id}`,
                username: req.user.username,
                orden: orden,
                bolsonesDespachados: bolsonesDespachados
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
            ordenData.updatedBy = req.user.username;
            // Normalizar productos (pueden venir como objeto o array)
            let productos = [];
            if (Array.isArray(ordenData.productos)) {
                productos = ordenData.productos;
            } else if (typeof ordenData.productos === 'object') {
                productos = Object.values(ordenData.productos);
            }
            ordenData.productos = productos;
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
    },

    // Agregar método para buscar órdenes por cliente
    async buscarOrdenesPorCliente(req, res) {
        try {
            const { clienteId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            const resultado = await OVService.obtenerOrdenesPorCliente(clienteId, page, limit);
            
            return res.status(200).json({
                success: true,
                data: resultado.data,
                pagination: resultado.pagination
            });
        } catch (error) {
            console.error('Error al buscar órdenes por cliente:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener órdenes por cliente',
                error: error.message
            });
        }
    },
    
    // Agregar método para eliminar una orden de venta
    async eliminarOrdenDeVenta(req, res) {
        try {
            const { id } = req.params;
            await OVService.eliminarOrden(id);
            
            return res.status(200).json({
                success: true,
                message: 'Orden de venta eliminada exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar orden de venta:', error);
            
            if (error.message.includes('no encontrada')) {
                return res.status(404).json({
                    success: false,
                    message: 'Orden de venta no encontrada'
                });
            }
            
            return res.status(500).json({
                success: false,
                message: 'Error al eliminar orden de venta',
                error: error.message
            });
        }
    },

    // Nueva función para exportar órdenes a Excel
    async exportarExcel(req, res) {
        try {
            console.log('Iniciando proceso de exportación de órdenes a Excel');
            
            // Obtener los parámetros de filtrado que en vistaListarOrdenes
            const search = req.query.search || '';
            const estado = req.query.estado || '';
            const searchType = req.query.searchType || 'all';
            
            // Nuevo: Comprobar si hay IDs específicos para exportar
            const selectedIds = req.query.ids ? req.query.ids.split(',') : [];
            
            // Obtener órdenes según los parámetros
            let ordenesParaExportar = [];
            
            if (selectedIds.length > 0) {
                // Si hay IDs seleccionados, obtener solo esas órdenes
                console.log(`Exportando ${selectedIds.length} órdenes seleccionadas`);
                
                // Obtener cada orden seleccionada por su ID
                ordenesParaExportar = await Promise.all(
                    selectedIds.map(async (id) => {
                        try {
                            return await OVService.obtenerOrdenPorId(id);
                        } catch (error) {
                            console.error(`Error al obtener orden ID ${id}:`, error);
                            return null;
                        }
                    })
                );
                
                // Filtrar cualquier error (nulos)
                ordenesParaExportar = ordenesParaExportar.filter(orden => orden !== null);
            } else {
                // Obtener todas las órdenes sin paginación para incluir todo en el Excel
                const resultado = await OVService.obtenerTodasLasOrdenes(1, 1000, 'id', 'DESC');
                ordenesParaExportar = resultado.data;
                
                // Aplicar los mismos filtros que en la vista
                // Si hay un filtro de estado, filtramos los resultados
                if (estado && estado !== 'todos') {
                    ordenesParaExportar = ordenesParaExportar.filter(orden => orden.estado === estado);
                }
                
                // Si hay un término de búsqueda, filtramos los resultados según el tipo de búsqueda
                if (search) {
                    const searchLower = search.toLowerCase();
                    ordenesParaExportar = ordenesParaExportar.filter(orden => {
                        // Diferentes criterios de búsqueda según el tipo seleccionado
                        if (searchType === 'cliente') {
                            // Buscar solo por cliente
                            return orden.cliente && orden.cliente.toLowerCase().includes(searchLower);
                        } 
                        else if (searchType === 'clienteFinal') {
                            // Buscar solo por cliente final
                            return orden.cliente_final && orden.cliente_final.toLowerCase().includes(searchLower);
                        } 
                        else if (searchType === 'id') {
                            // Buscar solo por ID (numérico o formato OV-X)
                            const idFormatoOV = `OV-${orden.id}`.toLowerCase();
                            const idNumericoMatch = orden.id.toString() === search;
                            return idFormatoOV.includes(searchLower) || idNumericoMatch;
                        } 
                        else {
                            // Modo "all" - buscar en todos los campos
                            const clienteMatch = orden.cliente && 
                                                orden.cliente.toLowerCase().includes(searchLower);
                            const clienteFinalMatch = orden.cliente_final && 
                                                    orden.cliente_final.toLowerCase().includes(searchLower);
                            const codigoVentaMatch = orden.codigo_venta && 
                                                    orden.codigo_venta.toLowerCase().includes(searchLower);
                            const idFormatoOV = `OV-${orden.id}`.toLowerCase();
                            const idMatch = idFormatoOV.includes(searchLower);
                            const idNumericoMatch = orden.id.toString() === search;
                            
                            return clienteMatch || clienteFinalMatch || codigoVentaMatch || idMatch || idNumericoMatch;
                        }
                    });
                }
            }
            
            // Crear un nuevo libro de Excel
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Órdenes de Venta');
            
            // Añadir encabezados según lo solicitado
            worksheet.columns = [
                { header: 'Numero', key: 'numero', width: 15 },
                { header: 'Fecha', key: 'fecha', width: 15 },
                { header: 'Estado', key: 'estado', width: 15 },
                { header: 'Productos / Cantidad restante', key: 'productos_saldos', width: 30 },
                { header: 'Cliente', key: 'cliente', width: 20 },
                { header: 'Cliente Final', key: 'cliente_final', width: 20 },
                { header: 'Codigo de Venta', key: 'codigo_venta', width: 15 }
            ];
            
            // Dar formato al encabezado
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4F81BD' }
            };
            worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
            
            console.log(`Procesando ${ordenesParaExportar.length} órdenes para exportar`);
            
            // Procesar cada orden para el Excel
            for (const orden of ordenesParaExportar) {
                // Formatear productos y cantidades
                let productosSaldos = '';
                
                // Si hay productos, procesarlos
                if (orden.productos && orden.productos.length > 0) {
                    // Para el formato "Productos / Cantidad restante" - mostrar cantidad directamente
                    productosSaldos = orden.productos.map(p => 
                        `${p.nombre || p.producto} - ${p.cantidad}`
                    ).join('\n');
                }
                
                // Formatear fecha para mejor visualización
                const fecha = orden.fecha ? new Date(orden.fecha).toLocaleDateString() : 'N/A';
                
                // Formatear estado para mejor visualización
                let estado = 'PENDIENTE';
                if (orden.estado) {
                    estado = orden.estado.toUpperCase().replace('_', ' ');
                }
                
                // Añadir la fila al Excel
                worksheet.addRow({
                    numero: `OV-${orden.id}`,
                    fecha: fecha,
                    estado: estado,
                    productos_saldos: productosSaldos,
                    cliente: orden.cliente || 'N/A',
                    cliente_final: orden.cliente_final || 'N/A',
                    codigo_venta: orden.codigo_venta || 'N/A'
                });
            }
            
            // Aplicar estilos a las filas
            worksheet.eachRow((row, rowNumber) => {
                // Saltar la primera fila (encabezados)
                if (rowNumber > 1) {
                    // Alineación de celdas
                    row.eachCell((cell) => {
                        cell.alignment = { 
                            vertical: 'middle', 
                            wrapText: true 
                        };
                    });
                }
            });
            
            // Configurar el nombre del archivo con la fecha actual
            const fechaActual = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            const filtroInfo = estado && !selectedIds.length ? `_${estado}` : '';
            const searchInfo = search && !selectedIds.length ? `_${search.replace(/[^a-z0-9]/gi, '_')}` : '';
            const seleccionInfo = selectedIds.length > 0 ? '_seleccionadas' : '';
            const filename = `ordenes_venta${filtroInfo}${searchInfo}${seleccionInfo}_${fechaActual}.xlsx`;
            
            console.log(`Generando archivo Excel: ${filename}`);
            
            // Configurar las cabeceras para la descarga
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            
            // Escribir el archivo y enviarlo como respuesta
            await workbook.xlsx.write(res);
            
            console.log('Exportación completada con éxito');
            
            // La respuesta se envía automáticamente después de escribir el Excel
        } catch (error) {
            console.error('Error al exportar órdenes a Excel:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al exportar órdenes a Excel',
                error: error.message
            });
        }
    }
}

module.exports = OVController;
