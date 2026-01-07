const db = require('../config/db');

class ConfigAlertasStockRepository {
    /**
     * Obtener todos los usuarios configurados para recibir alertas activas
     */
    async obtenerUsuariosActivos() {
        try {
            const query = `
                SELECT 
                    c.id,
                    c.user_id,
                    u.username,
                    u.email,
                    u.role,
                    c.activo,
                    c.created_at,
                    c.updated_at
                FROM config_alertas_stock c
                INNER JOIN users u ON c.user_id = u.id
                WHERE c.activo = TRUE AND u.email IS NOT NULL AND u.email != ''
                ORDER BY u.username ASC
            `;
            
            const result = await db.query(query);
            return result || [];
        } catch (error) {
            console.error('Error al obtener usuarios activos para alertas:', error);
            throw error;
        }
    }

    /**
     * Obtener emails de usuarios activos para alertas
     */
    async obtenerEmailsActivos() {
        try {
            const usuarios = await this.obtenerUsuariosActivos();
            return usuarios.map(u => u.email).filter(email => email);
        } catch (error) {
            console.error('Error al obtener emails de alertas:', error);
            throw error;
        }
    }

    /**
     * Obtener toda la configuración (incluye usuarios activos e inactivos)
     */
    async obtenerTodos() {
        try {
            const query = `
                SELECT 
                    c.id,
                    c.user_id,
                    u.username,
                    u.email,
                    u.role,
                    c.activo,
                    c.created_at,
                    c.updated_at
                FROM config_alertas_stock c
                INNER JOIN users u ON c.user_id = u.id
                WHERE u.email IS NOT NULL AND u.email != ''
                ORDER BY u.username ASC
            `;
            
            const result = await db.query(query);
            return result || [];
        } catch (error) {
            console.error('Error al obtener toda la configuración de alertas:', error);
            throw error;
        }
    }

    /**
     * Agregar un usuario a las alertas
     */
    async agregar(userId) {
        try {
            const query = `
                INSERT INTO config_alertas_stock (user_id, activo)
                VALUES (?, TRUE)
                ON DUPLICATE KEY UPDATE activo = TRUE, updated_at = CURRENT_TIMESTAMP
            `;
            
            await db.query(query, [userId]);
            return { success: true };
        } catch (error) {
            console.error('Error al agregar usuario a alertas:', error);
            throw error;
        }
    }

    /**
     * Remover un usuario de las alertas (marca como inactivo)
     */
    async remover(userId) {
        try {
            const query = `
                UPDATE config_alertas_stock
                SET activo = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `;
            
            await db.query(query, [userId]);
            return { success: true };
        } catch (error) {
            console.error('Error al remover usuario de alertas:', error);
            throw error;
        }
    }

    /**
     * Eliminar completamente un usuario de la configuración
     */
    async eliminar(userId) {
        try {
            const query = 'DELETE FROM config_alertas_stock WHERE user_id = ?';
            await db.query(query, [userId]);
            return { success: true };
        } catch (error) {
            console.error('Error al eliminar usuario de alertas:', error);
            throw error;
        }
    }

    /**
     * Actualizar configuración completa (reemplaza todos los usuarios)
     * @param {Array} userIds - Array de IDs de usuarios que recibirán alertas
     */
    async actualizarConfiguracion(userIds) {
        try {
            // Eliminar todos los registros existentes
            await db.query('DELETE FROM config_alertas_stock');
            
            // Insertar los nuevos usuarios seleccionados
            if (userIds && userIds.length > 0) {
                for (const userId of userIds) {
                    await this.agregar(userId);
                }
            }
            
            return { success: true, count: userIds.length };
        } catch (error) {
            console.error('Error al actualizar configuración de alertas:', error);
            throw error;
        }
    }

    /**
     * Verificar si un usuario está en la configuración de alertas
     */
    async estaConfigurado(userId) {
        try {
            const query = `
                SELECT id, activo 
                FROM config_alertas_stock 
                WHERE user_id = ?
            `;
            
            const result = await db.query(query, [userId]);
            return result && result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Error al verificar configuración de usuario:', error);
            throw error;
        }
    }
}

module.exports = new ConfigAlertasStockRepository();
