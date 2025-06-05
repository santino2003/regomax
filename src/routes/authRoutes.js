const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');

// Rutas públicas
router.post('/login', authController.login);
router.post('/register', authController.register);

// Ruta protegida /me que ahora requiere un permiso específico
router.get('/me', 
  authMiddleware.verifyToken, 
  permissionsMiddleware.hasPermission('ver_perfil'), // Ahora requiere el permiso 'ver_perfil'
  (req, res) => {
    const userPermissions = req.user.permissions || {};
    const role = req.user.role;
    
    res.json({
      success: true,
      message: 'Usuario autenticado con permiso para ver perfil',
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: role
      },
      permissions: {
        role: role,
        isAdmin: role === 'admin',
        details: userPermissions
      }
    });
});


module.exports = router;