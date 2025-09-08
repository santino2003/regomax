const historialRepository = require('../repositories/historialRepository');
const { fechaActual } = require('../utils/fecha');

class HistorialService {
    /**
     * Registra una acción en el historial
     */
    async registrarAccion(usuario, accion, entidad, detalles = null) {
        const fechaHora = fechaActual(); // Usar utilidad de fecha en lugar de new Date()
        return await historialRepository.registrarAccion(
            usuario, accion, entidad, detalles, fechaHora
        );
    }
    
    /**
     * Obtiene el historial de acciones con filtros y paginación
     */
    async obtenerHistorial(page = 1, limit = 50, filtros = {}) {
        return await historialRepository.obtenerHistorial(page, limit, filtros);
    }
    
    /**
     * Método utilitario para registrar creaciones de entidades
     */
    async registrarCreacion(req, entidad, detalles = null) {
        const usuario = req.user ? req.user.username : 'sistema';
        
        await this.registrarAccion(
            usuario, 
            'crear', 
            entidad, 
            detalles
        );
    }
    
    /**
     * Método utilitario para registrar ediciones de entidades
     */
    async registrarEdicion(req, entidad, detalles = null) {
        const usuario = req.user ? req.user.username : 'sistema';
        
        await this.registrarAccion(
            usuario, 
            'editar', 
            entidad, 
            detalles
        );
    }
    
    /**
     * Método utilitario para registrar eliminaciones de entidades
     */
    async registrarEliminacion(req, entidad, detalles = null) {
        const usuario = req.user ? req.user.username : 'sistema';
        
        await this.registrarAccion(
            usuario, 
            'eliminar', 
            entidad, 
            detalles
        );
    }

    /**
     * Método utilitario para registrar consultas o visualizaciones de entidades
     */
    async registrarConsulta(req, entidad, detalles = null) {
        const usuario = req.user ? req.user.username : 'sistema';
        
        await this.registrarAccion(
            usuario, 
            'consultar', 
            entidad, 
            detalles
        );
    }
}

module.exports = new HistorialService();