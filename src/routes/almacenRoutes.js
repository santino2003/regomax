const express = require('express');
const router = express.Router();
const almacenController = require('../controllers/almacenController');
const auth = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');
const permissionsMiddleware = require('../middleware/permissions');

// Rutas de API para almacenes
router.post(
    '/nuevo',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('almacen:create'),
    historialMiddleware.almacen.crear(),
    almacenController.nuevoAlmacen
);

router.put(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('almacen:edit'),
    historialMiddleware.almacen.editar(),
    almacenController.modificarAlmacen
);

router.delete(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('almacen:delete'),
    historialMiddleware.almacen.eliminar(),
    almacenController.eliminarAlmacen
);

router.get(
    '/',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('almacen:view'),
    almacenController.obtenerAlmacenes
);

module.exports = router;
