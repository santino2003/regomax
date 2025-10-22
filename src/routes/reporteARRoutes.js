const express = require('express');
const router = express.Router();
const reporteARController = require('../controllers/reporteARController');
const auth = require('../middleware/auth');

// Ruta para generar el reporte AR
// GET /api/reportear?fecha=YYYY-MM-DD
router.get('/', auth.verifyToken, reporteARController.generarReporteAR);

module.exports = router;