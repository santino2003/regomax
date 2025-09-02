const hashUtils = require('../utils/hash');

/**
 * Middleware para autenticación y verificación de tokens JWT
 */
const authMiddleware = {
  // Middleware para verificar token JWT
  verifyToken(req, res, next) {
    try {
      console.log('🔒 Verificando token - Ruta:', req.originalUrl);
      console.log('🍪 Cookies disponibles:', req.cookies);
      
      const token = req.cookies && req.cookies.token;
      if (!token) {
        console.log('❌ No se encontró token en las cookies');
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(401).json({ success: false, message: 'No autorizado - Token no encontrado' });
        } else {
          return res.redirect('/login');
        }
      }
      
      console.log('✓ Token encontrado, verificando...');
      const decoded = hashUtils.verifyToken(token);
      if (!decoded || !decoded.username) {
        console.log('❌ Token inválido o expirado');
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
        } else {
          return res.redirect('/login');
        }
      }
      
      console.log('✅ Token válido para usuario:', decoded.username);
      req.user = decoded;
      next();
    } catch (error) {
      console.log('❌ Error en verificación:', error.message);
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'Error de autenticación: ' + error.message });
      } else {
        return res.redirect('/login');
      }
    }
  }
};

module.exports = authMiddleware;