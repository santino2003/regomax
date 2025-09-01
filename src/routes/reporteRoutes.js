const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');
const auth = require('../middleware/auth');

// Ruta para el reporte completo
router.get('/completo', auth.verifyToken, reporteController.generarReporteCompleto);

module.exports = router;