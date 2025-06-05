const hashUtils = require('../utils/hash');

const authMiddleware = {
  // Middleware para verificar token JWT
  verifyToken(req, res, next) {
    try {
      // Obtener token del encabezado
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'No se proporcionó token de autenticación'
        });
      }

      // Formato: Bearer TOKEN
      const token = authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Formato de token inválido'
        });
      }

      // Verificar token
      const decoded = hashUtils.verifyToken(token);
      
      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: 'Token inválido o expirado'
        });
      }

      // Agregar datos del usuario al request
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Error de autenticación',
        error: error.message
      });
    }
  }
};

module.exports = authMiddleware;