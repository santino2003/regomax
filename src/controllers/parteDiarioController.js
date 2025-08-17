const parteDiarioService = require('../services/parteDiarioService');
const parteDiarioRepository = require('../repositories/parteDiarioRepository');
const bolsonService = require('../services/bolsonService'); // Añadir este servicio

const parteDiarioController = {
    async crearParteDiario(req, res) {
        try {
            const datosParteDiario = req.body;
            datosParteDiario.responsable = req.user.username; // Agregar responsable desde la sesión
            
            const resultado = await parteDiarioService.crearParteDiario(datosParteDiario);
            
            // Si se asociaron bolsones automáticamente, mostrar información
            let mensaje = 'Parte diario creado exitosamente';
            if (resultado.bolsonesAsociados > 0) {
                mensaje += `. Se asociaron automáticamente ${resultado.bolsonesAsociados} bolsones al parte diario.`;
            } else {
                mensaje += '. No había bolsones pendientes para asociar.';
            }
            
            return res.status(201).json({
                success: true,
                message: mensaje,
                data: resultado
            });
        } catch (error) {
            console.error('Error al crear parte diario:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al crear parte diario',
                error: error.message
            });
        }
    },
    
    async listarPartesDiarios(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            const resultado = await parteDiarioService.obtenerPartesDiarios(page, limit);
            
            return res.status(200).json({
                success: true,
                data: resultado.data,
                pagination: resultado.pagination
            });
        } catch (error) {
            console.error('Error al listar partes diarios:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener partes diarios',
                error: error.message
            });
        }
    },
    
    async obtenerParteDiario(req, res) {
        try {
            const { id } = req.params;
            const parteDiario = await parteDiarioService.obtenerParteDiarioPorId(id);
            
            if (!parteDiario) {
                return res.status(404).json({
                    success: false,
                    message: 'Parte diario no encontrado'
                });
            }
            
            return res.status(200).json({
                success: true,
                data: parteDiario
            });
        } catch (error) {
            console.error('Error al obtener parte diario:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener parte diario',
                error: error.message
            });
        }
    },
    
    // Método para renderizar la vista de nuevo parte diario
    async vistaNuevoParteDiario(req, res) {
        try {
            // Obtener bolsones pendientes de asociar
            const bolsonesPendientes = await bolsonService.obtenerBolsonesPendientes();
            
            res.render('parteDiarioNuevo', { 
                username: req.user.username,
                title: 'Nuevo Parte Diario',
                bolsonesPendientes: bolsonesPendientes // Pasar los bolsones a la vista
            });
        } catch (error) {
            console.error('Error al renderizar vista de nuevo parte diario:', error);
            res.status(500).render('error', { 
                message: 'Error al cargar formulario de nuevo parte diario',
                error: error
            });
        }
    },
    
    // Método para renderizar la vista de listar partes diarios
    async vistaListarPartesDiarios(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            const resultado = await parteDiarioService.obtenerPartesDiarios(page, limit);
            
            res.render('listarPartesDiarios', { 
                username: req.user.username,
                title: 'Partes Diarios',
                partesDiarios: resultado.data,
                pagination: resultado.pagination,
                estadoActual: undefined // Añadir estadoActual como undefined para la vista general
            });
        } catch (error) {
            console.error('Error al renderizar vista de partes diarios:', error);
            res.status(500).render('error', { 
                message: 'Error al cargar la lista de partes diarios',
                error: error
            });
        }
    },
    
    // Método para renderizar la vista de detalle de parte diario
    async vistaDetalleParteDiario(req, res) {
        try {
            const { id } = req.params;
            const parteDiario = await parteDiarioService.obtenerParteDiarioPorId(id);
            
            if (!parteDiario) {
                return res.status(404).render('error', { 
                    message: 'Parte diario no encontrado'
                });
            }
            
            res.render('parteDiarioDetalle', { 
                username: req.user.username,
                title: `Parte Diario #${id}`,
                parteDiario: parteDiario
            });
        } catch (error) {
            console.error('Error al renderizar vista de detalle parte diario:', error);
            res.status(500).render('error', { 
                message: 'Error al cargar detalle del parte diario',
                error: error
            });
        }
    },
    
    // Agregar el método para actualizar un parte diario
    async actualizarParteDiario(req, res) {
        try {
            const { id } = req.params;
            const datosParteDiario = req.body;
            datosParteDiario.actualizadoPor = req.user.username; // Registrar quién actualizó
            
            // Verificar si el parte diario existe
            const parteDiarioExistente = await parteDiarioService.obtenerParteDiarioPorId(id);
            if (!parteDiarioExistente) {
                return res.status(404).json({
                    success: false,
                    message: 'Parte diario no encontrado'
                });
            }
            
            // Actualizar el parte diario
            const resultado = await parteDiarioService.actualizarParteDiario(id, datosParteDiario);
            
            return res.status(200).json({
                success: true,
                message: 'Parte diario actualizado exitosamente',
                data: resultado
            });
        } catch (error) {
            console.error('Error al actualizar parte diario:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al actualizar parte diario',
                error: error.message
            });
        }
    },
    
    // Agregar el método para eliminar un parte diario
    async eliminarParteDiario(req, res) {
        try {
            const { id } = req.params;
            
            // Verificar si el parte diario existe
            const parteDiarioExistente = await parteDiarioService.obtenerParteDiarioPorId(id);
            if (!parteDiarioExistente) {
                return res.status(404).json({
                    success: false,
                    message: 'Parte diario no encontrado'
                });
            }
            
            // Eliminar el parte diario
            await parteDiarioService.eliminarParteDiario(id);
            
            return res.status(200).json({
                success: true,
                message: 'Parte diario eliminado exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar parte diario:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al eliminar parte diario',
                error: error.message
            });
        }
    },
    
    /**
     * Aprobar un parte diario
     */
    async aprobarParteDiario(req, res) {
        try {
            const { id } = req.params;
            const aprobador = req.user.username; // Obtener el usuario que aprueba
            
            await parteDiarioService.actualizarEstadoParteDiario(id, 'aprobado', aprobador);
            
            return res.status(200).json({
                success: true,
                message: 'Parte diario aprobado exitosamente'
            });
        } catch (error) {
            console.error('Error al aprobar parte diario:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al aprobar parte diario',
                error: error.message
            });
        }
    },
    
    /**
     * Rechazar un parte diario
     */
    async rechazarParteDiario(req, res) {
        try {
            const { id } = req.params;
            const aprobador = req.user.username; // Obtener el usuario que rechaza
            
            await parteDiarioService.actualizarEstadoParteDiario(id, 'rechazado', aprobador);
            
            return res.status(200).json({
                success: true,
                message: 'Parte diario rechazado exitosamente'
            });
        } catch (error) {
            console.error('Error al rechazar parte diario:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al rechazar parte diario',
                error: error.message
            });
        }
    },
    
    /**
     * Listar partes diarios por estado
     */
    async listarPartesDiariosPorEstado(req, res) {
        try {
            const { estado } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            const estadosValidos = ['pendiente', 'aprobado', 'rechazado'];
            if (!estadosValidos.includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message: `Estado no válido. Debe ser uno de: ${estadosValidos.join(', ')}`
                });
            }
            
            const resultado = await parteDiarioService.obtenerPartesDiariosPorEstado(estado, page, limit);
            
            return res.status(200).json({
                success: true,
                data: resultado.data,
                pagination: resultado.pagination
            });
        } catch (error) {
            console.error('Error al listar partes diarios por estado:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener partes diarios por estado',
                error: error.message
            });
        }
    },
    
    /**
     * Vista para listar partes diarios por estado
     */
    async vistaListarPartesDiariosPorEstado(req, res) {
        try {
            const { estado } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            const estadosValidos = ['pendiente', 'aprobado', 'rechazado'];
            if (!estadosValidos.includes(estado)) {
                return res.status(400).render('error', { 
                    message: `Estado no válido. Debe ser uno de: ${estadosValidos.join(', ')}`
                });
            }
            
            const resultado = await parteDiarioService.obtenerPartesDiariosPorEstado(estado, page, limit);
            
            // Definir títulos según el estado
            let titulo;
            switch(estado) {
                case 'pendiente':
                    titulo = 'Partes Diarios Pendientes';
                    break;
                case 'aprobado':
                    titulo = 'Partes Diarios Aprobados';
                    break;
                case 'rechazado':
                    titulo = 'Partes Diarios Rechazados';
                    break;
            }
            
            res.render('listarPartesDiarios', { 
                username: req.user.username,
                title: titulo,
                partesDiarios: resultado.data,
                pagination: resultado.pagination,
                estadoActual: estado
            });
        } catch (error) {
            console.error(`Error al renderizar vista de partes diarios ${req.params.estado}:`, error);
            res.status(500).render('error', { 
                message: 'Error al cargar la lista de partes diarios',
                error: error
            });
        }
    }
};

module.exports = parteDiarioController;