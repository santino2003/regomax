const express = require('express');
const router = express.Router();
const reporteARController = require('../controllers/reporteARController');
const auth = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissionsConfig');

// Ruta para generar el reporte AR
// GET /api/reportear?fecha=YYYY-MM-DD
router.get('/',
    auth.verifyToken,
    permissionsMiddleware.hasPermission(PERMISSIONS.REPORTES.VIEW_AR),
    reporteARController.generarReporteAR
);

module.exports = router;
