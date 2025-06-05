/**
 * Middleware para la verificación de permisos de usuario
 */

const permissionsMiddleware = {
  /**
   * Verifica si el usuario tiene un permiso específico
   * @param {string} permission - El permiso necesario para acceder a la ruta
   */
  hasPermission: (permission) => {
    return (req, res, next) => {
      // Verificar que el usuario esté autenticado
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          error: 'AUTH_REQUIRED'
        });
      }

      // Los administradores tienen todos los permisos
      if (req.user.role === 'admin') {
        // Agregar información de permisos al request para uso posterior
        req.permissionInfo = {
          granted: true,
          permission,
          reason: 'ADMIN_ROLE'
        };
        return next();
      }

      // Verificar el permiso específico
      const userPermissions = req.user.permissions || {};
      if (userPermissions[permission] === true) {
        // Agregar información de permisos al request para uso posterior
        req.permissionInfo = {
          granted: true,
          permission,
          reason: 'EXPLICIT_PERMISSION'
        };
        return next();
      }

      // Denegar acceso si no tiene el permiso
      return res.status(403).json({
        success: false,
        message: `Acceso denegado: No tienes permiso para ${permission}`,
        error: 'PERMISSION_DENIED',
        requiredPermission: permission
      });
    };
  },

  /**
   * Verifica si el usuario tiene al menos uno de los permisos especificados
   * @param {string[]} permissions - Lista de permisos, cualquiera es válido
   */
  hasAnyPermission: (permissions) => {
    return (req, res, next) => {
      // Verificar que el usuario esté autenticado
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          error: 'AUTH_REQUIRED'
        });
      }

      // Los administradores tienen todos los permisos
      if (req.user.role === 'admin') {
        req.permissionInfo = {
          granted: true,
          permissions,
          reason: 'ADMIN_ROLE'
        };
        return next();
      }

      // Verificar si tiene al menos uno de los permisos
      const userPermissions = req.user.permissions || {};
      for (const perm of permissions) {
        if (userPermissions[perm] === true) {
          req.permissionInfo = {
            granted: true,
            permission: perm,
            allChecked: permissions,
            reason: 'HAS_ONE_REQUIRED'
          };
          return next();
        }
      }

      // Denegar acceso si no tiene ninguno de los permisos
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: No tienes los permisos necesarios',
        error: 'PERMISSION_DENIED',
        requiredPermissions: permissions
      });
    };
  },

  /**
   * Verifica si el usuario tiene todos los permisos especificados
   * @param {string[]} permissions - Lista de permisos, todos son requeridos
   */
  hasAllPermissions: (permissions) => {
    return (req, res, next) => {
      // Verificar que el usuario esté autenticado
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          error: 'AUTH_REQUIRED'
        });
      }

      // Los administradores tienen todos los permisos
      if (req.user.role === 'admin') {
        req.permissionInfo = {
          granted: true,
          permissions,
          reason: 'ADMIN_ROLE'
        };
        return next();
      }

      // Verificar si tiene todos los permisos requeridos
      const userPermissions = req.user.permissions || {};
      const missingPermissions = [];

      for (const perm of permissions) {
        if (userPermissions[perm] !== true) {
          missingPermissions.push(perm);
        }
      }

      if (missingPermissions.length === 0) {
        // Tiene todos los permisos requeridos
        req.permissionInfo = {
          granted: true,
          permissions,
          reason: 'HAS_ALL_REQUIRED'
        };
        return next();
      }

      // Denegar acceso si falta alguno de los permisos
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: Te faltan permisos requeridos',
        error: 'PERMISSION_DENIED',
        requiredPermissions: permissions,
        missingPermissions: missingPermissions
      });
    };
  }
};

module.exports = permissionsMiddleware;