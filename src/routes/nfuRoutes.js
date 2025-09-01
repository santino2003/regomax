const express = require('express');
const router = express.Router();
const nfuController = require('../controllers/nfuController');
const authMiddleware = require('../middleware/auth');

// Rutas API para NFU con autenticación
router.get('/api/nfu/kg-por-dia', authMiddleware.verifyToken, nfuController.obtenerKgPorDia);
router.get('/api/nfu/stock-mes', authMiddleware.verifyToken, nfuController.obtenerStockAcumuladoDelMes);
router.get('/api/nfu/stock-hasta-fecha', authMiddleware.verifyToken, nfuController.obtenerStockAcumuladoHastaFecha);

module.exports = router;