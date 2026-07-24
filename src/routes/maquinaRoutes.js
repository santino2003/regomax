const express = require('express');
const router = express.Router();
const maquinaController = require('../controllers/maquinaController');
const auth = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');

router.post(
    '/nuevo',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('maquinas:create'),
    maquinaController.nuevaMaquina
);

router.put(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('maquinas:edit'),
    maquinaController.modificarMaquina
);

router.delete(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('maquinas:delete'),
    maquinaController.eliminarMaquina
);

router.get(
    '/',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('maquinas:view'),
    maquinaController.obtenerMaquinas
);

module.exports = router;
