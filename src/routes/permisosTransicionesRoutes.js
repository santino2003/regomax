const express = require('express');
const router = express.Router();
const permisosTransicionesController = require('../controllers/permisosTransicionesController');
const auth = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');

// Listar todos los usuarios con sus permisos
router.get(
  '/listado',
  auth.verifyToken,
  permissionsMiddleware.hasPermission('ordenes_compra:change_state'),
  permisosTransicionesController.listarTodosLosPermisos
);

// Obtener permisos de un usuario específico
router.get(
  '/:username',
  auth.verifyToken,
  permissionsMiddleware.hasPermission('ordenes_compra:change_state'),
  permisosTransicionesController.obtenerPermisosUsuario
);

// Actualizar permisos de un usuario
router.put(
  '/:username',
  auth.verifyToken,
  permissionsMiddleware.hasPermission('ordenes_compra:change_state'),
  permisosTransicionesController.actualizarPermisosUsuario
);

// Verificar si un usuario tiene permiso para una transición específica
router.post(
  '/verificar',
  auth.verifyToken,
  permisosTransicionesController.verificarPermiso
);

module.exports = router;
