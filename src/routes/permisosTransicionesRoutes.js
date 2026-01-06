const express = require('express');
const router = express.Router();
const permisosTransicionesController = require('../controllers/permisosTransicionesController');
const auth = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');

// Listar todos los usuarios con sus permisos
router.get(
  '/listado',
  auth.verifyToken,
  permissionsMiddleware.hasPermission('ordenes_compra:manage_transitions'),
  permisosTransicionesController.listarTodosLosPermisos
);

// Obtener permisos de un usuario específico
router.get(
  '/:username',
  auth.verifyToken,
  permissionsMiddleware.hasPermission('ordenes_compra:manage_transitions'),
  permisosTransicionesController.obtenerPermisosUsuario
);

// Actualizar permisos de un usuario
router.put(
  '/:username',
  auth.verifyToken,
  permissionsMiddleware.hasPermission('ordenes_compra:manage_transitions'),
  permisosTransicionesController.actualizarPermisosUsuario
);

// Verificar si un usuario tiene permiso para una transición específica
router.post(
  '/verificar',
  auth.verifyToken,
  permisosTransicionesController.verificarPermiso
);

module.exports = router;
