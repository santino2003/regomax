const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historialController');
const authMiddleware = require('../middleware/auth');

// Rutas protegidas por autenticación
router.get('/listar', authMiddleware.verifyToken, historialController.mostrarHistorial);
router.get('/exportar', authMiddleware.verifyToken, historialController.exportarHistorial);

module.exports = router;