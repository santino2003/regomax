const express = require('express');
const router = express.Router();
const nfuController = require('../controllers/nfuController');
const authMiddleware = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');

// Ruta para exportar a CSV (debe ir primero para evitar conflictos con rutas dinámicas)
router.get('/api/nfu/exportar-csv', authMiddleware.verifyToken, nfuController.exportarCSV);

// Rutas API para NFU con autenticación
router.get('/api/nfu/kg-por-dia', authMiddleware.verifyToken, nfuController.obtenerKgPorDia);
router.get('/api/nfu/stock-mes', authMiddleware.verifyToken, nfuController.obtenerStockAcumuladoDelMes);
router.get('/api/nfu/stock-hasta-fecha', authMiddleware.verifyToken, nfuController.obtenerStockAcumuladoHastaFecha);

// Ruta para registrar nuevo ingreso NFU - Quitando el middleware de historial
router.post('/api/nfu', 
  authMiddleware.verifyToken,
  (req, res, next) => {
    console.log('🔑 Usuario autenticado:', req.user ? req.user.username : 'undefined');
    next();
  },
  nfuController.registrarIngresoNFU
);

module.exports = router;