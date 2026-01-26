const hashUtils = require('../utils/hash');

/**
 * Middleware para autenticación y verificación de tokens JWT
 */
const authMiddleware = {
  // Middleware para verificar token JWT
  verifyToken(req, res, next) {
    try {
      // Intentar obtener el token desde cookies, query string o headers
      let token = req.cookies && req.cookies.token;
      
      // Si no hay token en cookies, buscar en query string (para PDFs abiertos en nueva ventana)
      if (!token && req.query.token) {
        token = req.query.token;
      }
      
      // Si no hay token en cookies ni query, buscar en headers Authorization
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
      
      if (!token) {
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(401).json({ success: false, message: 'No autorizado - Token no encontrado' });
        } else {
          return res.redirect('/login');
        }
      }

      const decoded = hashUtils.verifyToken(token);
      if (!decoded || !decoded.username) {
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
        } else {
          return res.redirect('/login');
        }
      }

      req.user = decoded;
      next();
    } catch (error) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'Error de autenticación: ' + error.message });
      } else {
        return res.redirect('/login');
      }
    }
  }
};

module.exports = authMiddleware;
