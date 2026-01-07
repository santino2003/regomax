const express = require('express');
const router = express.Router();
const salidaController = require('../controllers/salidaController');
const auth = require('../middleware/auth');
const permissions = require('../middleware/permissions');
const historialMiddleware = require('../middleware/historialMiddleware');

// ===== VISTAS =====
router.get('/salida', 
    auth.verifyToken, 
    permissions.hasPermission('bien:edit'),
    salidaController.vistaNuevaSalida
);

// ===== API ENDPOINTS =====
router.post('/api/salidas/buscar', 
    auth.verifyToken,
    permissions.hasPermission('bien:view'),
    salidaController.buscarPorCodigo
);

router.post('/api/salidas/procesar', 
    auth.verifyToken,
    permissions.hasPermission('bien:edit'),
    historialMiddleware.registrarHistorial('salida', 'salida_stock'),
    salidaController.procesarSalida
);

module.exports = router;
