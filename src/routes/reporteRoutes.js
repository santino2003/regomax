const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');
const auth = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissionsConfig');

// Ruta para el reporte completo
router.get('/completo',
    auth.verifyToken,
    permissionsMiddleware.hasAnyPermission([PERMISSIONS.REPORTES.VIEW, PERMISSIONS.REPORTES.VIEW_AR]),
    reporteController.generarReporteCompleto
);

module.exports = router;
