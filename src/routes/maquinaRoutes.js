const express = require('express');
const router = express.Router();
const maquinaController = require('../controllers/maquinaController');
const auth = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');
const historialMiddleware = require('../middleware/historialMiddleware');

router.post(
    '/nuevo',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('maquinas:create'),
    historialMiddleware.maquina.crear(),
    maquinaController.nuevaMaquina
);

router.put(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('maquinas:edit'),
    historialMiddleware.maquina.editar(),
    maquinaController.modificarMaquina
);

router.delete(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('maquinas:delete'),
    historialMiddleware.maquina.eliminar(),
    maquinaController.eliminarMaquina
);

router.get(
    '/',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('maquinas:view'),
    maquinaController.obtenerMaquinas
);

module.exports = router;
