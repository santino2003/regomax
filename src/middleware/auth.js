const hashUtils = require('../utils/hash');

/**
 * Middleware para autenticación y verificación de tokens JWT
 */
const authMiddleware = {
  // Middleware para verificar token JWT
  verifyToken(req, res, next) {
    try {
      const token = req.cookies && req.cookies.token;
      if (!token) {
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(401).json({ success: false, message: 'No autorizado' });
        } else {
          return res.redirect('/login');
        }
      }
      const decoded = hashUtils.verifyToken(token);
      if (!decoded || !decoded.username) {
        if (req.originalUrl.startsWith('/api/')) {
          return res.status(401).json({ success: false, message: 'Token inválido' });
        } else {
          return res.redirect('/login');
        }
      }
      req.user = decoded;
      next();
    } catch (error) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'Token inválido' });
      } else {
        return res.redirect('/login');
      }
    }
  }
};

module.exports = authMiddleware;