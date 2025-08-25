const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');
const permissionsMiddleware = require('../middleware/permissions');

// Rutas públicas sin registro en historial
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/logout', authMiddleware.verifyToken, authController.logout);

// Rutas protegidas
router.get('/check', authMiddleware.verifyToken, authController.check);

// Nuevas rutas para gestión de usuarios (protegidas y requieren permisos)
router.get('/', 
  authMiddleware.verifyToken,
  permissionsMiddleware.hasPermission('users:view'),
  authController.viewUsers);

// API para administración de usuarios - CORREGIDAS SIN PREFIJO /api/users
router.get('/', 
  authMiddleware.verifyToken, 
  permissionsMiddleware.hasPermission('users:view'),
  authController.getAllUsers);

router.get('/:id', 
  authMiddleware.verifyToken, 
  permissionsMiddleware.hasPermission('users:view'),
  authController.getUser);

router.post('/', 
  authMiddleware.verifyToken, 
  permissionsMiddleware.hasPermission('users:create'),
  historialMiddleware.registrarHistorial('crear', 'usuario'),
  authController.register);

router.put('/:id', 
  authMiddleware.verifyToken,
  permissionsMiddleware.hasPermission('users:edit'),
  historialMiddleware.registrarHistorial('editar', 'usuario'),
  authController.updateUser);

router.delete('/:id', 
  authMiddleware.verifyToken,
  permissionsMiddleware.hasPermission('users:delete'),
  historialMiddleware.registrarHistorial('eliminar', 'usuario'),
  authController.deleteUser);

module.exports = router;