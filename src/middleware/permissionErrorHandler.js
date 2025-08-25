/**
 * Middleware para interceptar errores de permisos y redirigir a la página visual de error
 */

const permissionErrorHandler = (req, res, next) => {
  // Guardamos la función original res.status para interceptarla
  const originalStatus = res.status;
  
  // Reemplazamos res.status con nuestra propia implementación
  res.status = function(statusCode) {
    // Si es un error 403 (Forbidden)
    if (statusCode === 403) {
      // Restauramos la función original para evitar recursión
      res.status = originalStatus;
      
      // Capturamos el contexto de JSON (por si nos envían uno)
      const originalJson = res.json;
      res.json = function(body) {
        // Si tiene la estructura de error de permisos que genera nuestro middleware
        if (body && body.error === 'PERMISSION_DENIED') {
          // Si es una llamada API, devolvemos JSON como estaba previsto
          if (req.xhr || 
              req.get('Content-Type') === 'application/json' || 
              req.get('Accept') === 'application/json' ||
              req.originalUrl.startsWith('/api/')) {
            return originalJson.call(this, body);
          }
          
          // Si es una navegación web normal, redirigimos a la página de error visual
          // Pasando los detalles del error como parámetros de consulta
          const params = new URLSearchParams();
          if (body.message) params.append('message', body.message);
          if (body.requiredPermission) params.append('requiredPermission', body.requiredPermission);
          
          // Redirigir a la vista de error de permisos con los parámetros
          return res.render('permissionDenied', {
            message: body.message || 'Acceso denegado: No tienes permisos para esta acción',
            requiredPermission: body.requiredPermission || null,
            requiredPermissions: body.requiredPermissions || [],
            username: req.user ? req.user.username : null
          });
        }
        
        // Si no es un error de permisos, continuar normalmente
        return originalJson.call(this, body);
      };
    }
    
    // Devolvemos el objeto de respuesta original para encadenar métodos
    return originalStatus.call(this, statusCode);
  };
  
  next();
};

module.exports = permissionErrorHandler;