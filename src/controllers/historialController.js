const historialService = require('../services/historialService');

class HistorialController {
    /**
     * Renderiza la página de historial con los registros filtrados
     */
    async mostrarHistorial(req, res) {
        try {
            // Obtener parámetros de paginación y filtros
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            
            // Construir objeto de filtros desde la query
            const filtros = {};
            
            if (req.query.usuario) {
                filtros.usuario = req.query.usuario;
            }
            
            if (req.query.accion) {
                filtros.accion = req.query.accion;
            }
            
            if (req.query.entidad) {
                filtros.entidad = req.query.entidad;
            }
            
            // Ya no filtramos por entidadId
            
            if (req.query.fechaDesde) {
                filtros.fechaDesde = req.query.fechaDesde;
            }
            
            if (req.query.fechaHasta) {
                filtros.fechaHasta = req.query.fechaHasta;
            }
            
            // Obtener historial con paginación y filtros
            const resultado = await historialService.obtenerHistorial(page, limit, filtros);
            
            // Renderizar vista con los datos
            res.render('historial', {
                historial: resultado.data,
                pagination: resultado.pagination,
                filtros: req.query,
                username: req.user ? req.user.username : 'Usuario'
            });
            
        } catch (error) {
            console.error('Error al obtener el historial:', error);
            res.status(500).render('error', {
                mensaje: 'Error al cargar el historial de acciones',
                error: error.message
            });
        }
    }
    
    /**
     * API para exportar el historial a CSV
     */
    async exportarHistorial(req, res) {
        try {
            // Obtener todos los registros (con un límite alto)
            const resultado = await historialService.obtenerHistorial(1, 10000, req.query);
            
            // Crear cabeceras CSV
            let csv = 'ID,Fecha y Hora,Usuario,Acción,Entidad,Detalles\n';
            
            // Agregar filas
            resultado.data.forEach(item => {
                // Formatear fecha
                const fecha = new Date(item.fecha_hora).toLocaleString();
                
                // Convertir detalles a string, escapando comillas
                let detallesStr = '';
                if (item.detalles) {
                    detallesStr = JSON.stringify(item.detalles).replace(/"/g, '""');
                }
                
                // Agregar fila
                csv += `${item.id},"${fecha}","${item.usuario}","${item.accion}","${item.entidad}","${detallesStr}"\n`;
            });
            
            // Configurar headers para descarga
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=historial-${new Date().toISOString().split('T')[0]}.csv`);
            
            // Enviar CSV
            res.send(csv);
            
        } catch (error) {
            console.error('Error al exportar el historial:', error);
            res.status(500).json({
                error: 'Error al exportar el historial',
                mensaje: error.message
            });
        }
    }
}

module.exports = new HistorialController();