const express = require('express');
const router = express.Router();
const centroCostoController = require('../controllers/centroCostoController');
const auth = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');
const permissionsMiddleware = require('../middleware/permissions');

// Rutas para API con middleware de historial específico para cada tipo de acción
router.post('/nuevo', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('centro_costo:create'),
    historialMiddleware.centroCosto.crear(),
    centroCostoController.nuevo
);

router.put('/:id', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('centro_costo:edit'),
    historialMiddleware.centroCosto.editar(),
    centroCostoController.modificar
);

router.delete('/:id', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('centro_costo:delete'),
    historialMiddleware.centroCosto.eliminar(),
    centroCostoController.eliminar
);

router.get('/', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('centro_costo:view'),
    centroCostoController.obtenerTodos
);

module.exports = router;
