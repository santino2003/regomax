const express = require('express');
const router = express.Router();
const unidadMedidaController = require('../controllers/unidadMedidaController');
const auth = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');
const permissionsMiddleware = require('../middleware/permissions');

// Rutas de API para unidades de medida
router.post(
    '/nuevo',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('unidadMedida:create'),
    historialMiddleware.unidadMedida.crear(),
    unidadMedidaController.nuevaUnidadMedida
);

router.put(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('unidadMedida:edit'),
    historialMiddleware.unidadMedida.editar(),
    unidadMedidaController.modificarUnidadMedida
);

router.delete(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('unidadMedida:delete'),
    historialMiddleware.unidadMedida.eliminar(),
    unidadMedidaController.eliminarUnidadMedida
);

router.get(
    '/',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('unidadMedida:view'),
    unidadMedidaController.obtenerUnidadesMedida
);

module.exports = router;
