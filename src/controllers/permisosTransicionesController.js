const userRepository = require('../repositories/userRepository');

const permisosTransicionesController = {
    /**
     * Obtener permisos de transiciones de un usuario
     */
    async obtenerPermisosUsuario(req, res) {
        try {
            const { username } = req.params;
            
            const user = await userRepository.findByUsername(username);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'Usuario no encontrado'
                });
            }

            const permisos = user.permisos_transiciones_oc || [];
            
            return res.status(200).json({
                success: true,
                data: {
                    username: user.username,
                    permisos: permisos
                }
            });
        } catch (error) {
            console.error('Error al obtener permisos de transiciones:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al obtener permisos de transiciones'
            });
        }
    },

    /**
     * Actualizar permisos de transiciones de un usuario
     */
    async actualizarPermisosUsuario(req, res) {
        try {
            const { username } = req.params;
            const { permisos } = req.body;

            if (!Array.isArray(permisos)) {
                return res.status(400).json({
                    success: false,
                    error: 'Los permisos deben ser un array'
                });
            }

            // Validar estructura de permisos
            const estadosValidos = ['Abierta', 'Revision', 'Aprobada', 'En Proceso', 'Entregado', 'Cerrada'];
            for (const permiso of permisos) {
                if (!permiso.desde || !permiso.hacia) {
                    return res.status(400).json({
                        success: false,
                        error: 'Cada permiso debe tener "desde" y "hacia"'
                    });
                }
                
                if (!estadosValidos.includes(permiso.desde) || !estadosValidos.includes(permiso.hacia)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Estados inválidos en los permisos'
                    });
                }
            }

            const user = await userRepository.findByUsername(username);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'Usuario no encontrado'
                });
            }

            await userRepository.actualizarPermisosTransiciones(username, permisos);

            return res.status(200).json({
                success: true,
                message: 'Permisos de transiciones actualizados correctamente'
            });
        } catch (error) {
            console.error('Error al actualizar permisos de transiciones:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al actualizar permisos de transiciones'
            });
        }
    },

    /**
     * Verificar si un usuario puede hacer una transición específica
     */
    async verificarPermiso(req, res) {
        try {
            const { username, desde, hacia } = req.query;

            if (!username || !desde || !hacia) {
                return res.status(400).json({
                    success: false,
                    error: 'Se requieren username, desde y hacia'
                });
            }

            const user = await userRepository.findByUsername(username);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'Usuario no encontrado'
                });
            }

            const permisos = user.permisos_transiciones_oc || [];
            const tienePermiso = permisos.some(p => p.desde === desde && p.hacia === hacia);

            return res.status(200).json({
                success: true,
                data: {
                    tienePermiso: tienePermiso
                }
            });
        } catch (error) {
            console.error('Error al verificar permiso:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al verificar permiso'
            });
        }
    },

    /**
     * Obtener todos los usuarios con sus permisos de transiciones
     */
    async listarTodosLosPermisos(req, res) {
        try {
            const users = await userRepository.findAllWithEmail();
            
            const usuariosConPermisos = users.map(user => ({
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                permisos_transiciones_oc: user.permisos_transiciones_oc || []
            }));

            return res.status(200).json({
                success: true,
                data: usuariosConPermisos
            });
        } catch (error) {
            console.error('Error al listar permisos:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al listar permisos'
            });
        }
    }
};

module.exports = permisosTransicionesController;
