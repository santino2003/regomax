const express = require('express');
const router = express.Router();
const ordenTrabajoController = require('../controllers/ordenTrabajoController');
const authMiddleware = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');
const historialMiddleware = require('../middleware/historialMiddleware');
const { PERMISSIONS } = require('../config/permissionsConfig');

router.use(authMiddleware.verifyToken);

router.get(
    '/',
    permissionsMiddleware.hasPermission(PERMISSIONS.ORDENES_TRABAJO.VIEW),
    ordenTrabajoController.obtenerTodos
);

router.get(
    '/exportar-excel',
    permissionsMiddleware.hasPermission(PERMISSIONS.ORDENES_TRABAJO.VIEW),
    ordenTrabajoController.exportarExcel
);

router.get(
    '/:id',
    permissionsMiddleware.hasPermission(PERMISSIONS.ORDENES_TRABAJO.VIEW),
    ordenTrabajoController.obtenerPorId
);

router.post(
    '/',
    permissionsMiddleware.hasPermission(PERMISSIONS.ORDENES_TRABAJO.CREATE),
    historialMiddleware.ordenTrabajo.crear(),
    ordenTrabajoController.crear
);

router.put(
    '/:id',
    permissionsMiddleware.hasPermission(PERMISSIONS.ORDENES_TRABAJO.EDIT),
    historialMiddleware.ordenTrabajo.editar(),
    ordenTrabajoController.modificar
);

module.exports = router;
