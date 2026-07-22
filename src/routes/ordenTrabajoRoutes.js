const express = require('express');
const router = express.Router();
const ordenTrabajoController = require('../controllers/ordenTrabajoController');
const authMiddleware = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissionsConfig');

router.use(authMiddleware.verifyToken);

router.get(
    '/',
    permissionsMiddleware.hasPermission(PERMISSIONS.ORDENES_TRABAJO.VIEW),
    ordenTrabajoController.obtenerTodos
);

router.post(
    '/',
    permissionsMiddleware.hasPermission(PERMISSIONS.ORDENES_TRABAJO.CREATE),
    ordenTrabajoController.crear
);

module.exports = router;
