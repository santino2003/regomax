const express = require('express');
const router = express.Router();
const fallaController = require('../controllers/fallaController');
const auth = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');
const historialMiddleware = require('../middleware/historialMiddleware');

router.post('/nuevo', auth.verifyToken, permissionsMiddleware.hasPermission('fallas:create'), historialMiddleware.falla.crear(), fallaController.nuevaFalla);
router.put('/:id', auth.verifyToken, permissionsMiddleware.hasPermission('fallas:edit'), historialMiddleware.falla.editar(), fallaController.modificarFalla);
router.delete('/:id', auth.verifyToken, permissionsMiddleware.hasPermission('fallas:delete'), historialMiddleware.falla.eliminar(), fallaController.eliminarFalla);
router.get('/', auth.verifyToken, permissionsMiddleware.hasPermission('fallas:view'), fallaController.obtenerFallas);

module.exports = router;
