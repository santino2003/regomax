const configAlertasStockRepository = require('../repositories/configAlertasStockRepository');
const userRepository = require('../repositories/userRepository');

class ConfigAlertasStockController {
    /**
     * Mostrar página de configuración de alertas
     */
    async mostrarConfiguracion(req, res) {
        try {
            // Obtener todos los usuarios con email
            const todosUsuarios = await userRepository.findAllWithEmail();
            
            // Obtener usuarios actualmente configurados
            const usuariosConfigurados = await configAlertasStockRepository.obtenerTodos();
            const idsConfigurados = usuariosConfigurados.map(u => u.user_id);
            
            res.render('configAlertasStock', {
                title: 'Configuración de Alertas de Stock',
                todosUsuarios,
                idsConfigurados,
                user: req.user
            });
        } catch (error) {
            console.error('Error al mostrar configuración de alertas:', error);
            res.status(500).render('error', {
                message: 'Error al cargar la configuración de alertas',
                error: error,
                user: req.user
            });
        }
    }

    /**
     * Actualizar configuración de alertas
     */
    async actualizarConfiguracion(req, res) {
        try {
            const { usuarios } = req.body;
            
            // usuarios puede ser un array de IDs o undefined si no se seleccionó ninguno
            const userIds = usuarios ? (Array.isArray(usuarios) ? usuarios : [usuarios]) : [];
            
            // Convertir strings a números
            const userIdsNum = userIds.map(id => parseInt(id));
            
            // Actualizar configuración
            const result = await configAlertasStockRepository.actualizarConfiguracion(userIdsNum);
            
            res.json({
                success: true,
                message: `Configuración actualizada. ${result.count} usuario(s) recibirán alertas`,
                data: result
            });
        } catch (error) {
            console.error('Error al actualizar configuración de alertas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar la configuración',
                error: error.message
            });
        }
    }

    /**
     * Obtener configuración actual (API)
     */
    async obtenerConfiguracion(req, res) {
        try {
            const usuarios = await configAlertasStockRepository.obtenerUsuariosActivos();
            
            res.json({
                success: true,
                data: usuarios
            });
        } catch (error) {
            console.error('Error al obtener configuración de alertas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener la configuración',
                error: error.message
            });
        }
    }
}

module.exports = new ConfigAlertasStockController();
