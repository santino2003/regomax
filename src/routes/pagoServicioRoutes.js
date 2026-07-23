const express = require('express');
const router = express.Router();
const servicioController = require('../controllers/servicioController');
const authMiddleware = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissionsConfig');

router.use(authMiddleware.verifyToken);

router.get(
    '/nuevo',
    permissionsMiddleware.hasPermission(PERMISSIONS.SERVICIOS.CREATE),
    servicioController.vistaNuevoPagoServicio
);

router.post(
    '/api/nuevo',
    permissionsMiddleware.hasPermission(PERMISSIONS.SERVICIOS.CREATE),
    servicioController.crearPagoServicio
);

module.exports = router;
