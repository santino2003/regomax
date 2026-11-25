const historialService = require('../services/historialService');
const { etiqueta, filasDetalles } = require('../utils/historial');
const { formatearFechaHoraLocal, fechaActual, formatMySQLLocal } = require('../utils/fecha');

class HistorialController {
    /**
     * Renderiza la página de historial con los registros filtrados
     */
    async mostrarHistorial(req, res) {
        try {
            // Obtener parámetros de paginación y filtros
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            
            const filtros = {};
            for (const clave of ['buscar', 'usuario', 'accion', 'entidad', 'fechaDesde', 'fechaHasta']) {
                if (typeof req.query[clave] === 'string' && req.query[clave].trim()) {
                    filtros[clave] = req.query[clave].trim();
                }
            }

            // Obtener historial con paginación y filtros
            const resultado = await historialService.obtenerHistorial(page, limit, filtros);
            
            // Renderizar vista con los datos
            res.render('historial', {
                historial: resultado.data,
                pagination: resultado.pagination,
                filtros,
                opciones: await historialService.obtenerOpciones(),
                etiqueta,
                filasDetalles,
                exportUrl: `/api/historial/exportar?${new URLSearchParams(filtros)}`,
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
                // Formatear fecha usando utilidades
                const fecha = formatearFechaHoraLocal(item.fecha_hora);
                
                // Convertir detalles a string, escapando comillas
                let detallesStr = '';
                if (item.detalles) {
                    detallesStr = filasDetalles(item.detalles).map(f => `${f.campo}: ${f.valor}`).join('; ');
                }
                
                // Agregar fila
                csv += [item.id, fecha, item.usuario, etiqueta(item.accion), etiqueta(item.entidad), detallesStr]
                    .map(valor => `"${String(valor ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
            });
            
            // Configurar headers para descarga
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=historial-${formatMySQLLocal(fechaActual()).split(' ')[0]}.csv`);
            
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