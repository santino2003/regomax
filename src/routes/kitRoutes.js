const express = require('express');
const router = express.Router();
const kitController = require('../controllers/kitController');
const auth = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');
const permissionsMiddleware = require('../middleware/permissions');

// Rutas de API para kits
router.post(
    '/nuevo',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bien:create'),
    historialMiddleware.bien.crear(),
    kitController.nuevoKit
);

router.put(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bien:edit'),
    historialMiddleware.bien.editar(),
    kitController.modificarKit
);

router.delete(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bien:delete'),
    historialMiddleware.bien.eliminar(),
    kitController.eliminarKit
);

// Ruta para obtener datos de formulario
router.get(
    '/form/datos',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bien:view'),
    kitController.obtenerDatosFormulario
);

// Ruta para obtener todos los kits (con filtros)
router.get(
    '/',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bien:view'),
    kitController.obtenerKits
);

// Ruta para obtener un kit por ID
router.get(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bien:view'),
    kitController.obtenerKitPorId
);

// Ruta para descontar stock del kit y sus componentes
router.post(
    '/:id/descontar-stock',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bien:edit'),
    historialMiddleware.bien.actualizarStock(),
    kitController.descontarStock
);

// Ruta para incrementar stock del kit y sus componentes
router.post(
    '/:id/incrementar-stock',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bien:edit'),
    historialMiddleware.bien.actualizarStock(),
    kitController.incrementarStock
);

module.exports = router;
