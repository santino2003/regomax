const express = require('express');
const router = express.Router();
const ajusteInventarioController = require('../controllers/ajusteInventarioController');
const auth = require('../middleware/auth');
const permissions = require('../middleware/permissions');
const historialMiddleware = require('../middleware/historialMiddleware');

// Vista para nuevo ajuste
router.get('/ajuste-inventario',
    auth.verifyToken,
    permissions.hasPermission('bien:edit'),
    ajusteInventarioController.renderAjusteNuevo
);

// Procesar ajuste
router.post('/api/ajustes-inventario',
    auth.verifyToken,
    permissions.hasPermission('bien:edit'),
    historialMiddleware.registrarHistorial('ajuste_inventario', 'crear'),
    ajusteInventarioController.procesarAjuste
);

// Obtener historial
router.get('/api/ajustes-inventario',
    auth.verifyToken,
    permissions.hasPermission('bien:view'),
    ajusteInventarioController.obtenerHistorial
);

// Vista de historial
router.get('/ajuste-inventario/historial',
    auth.verifyToken,
    permissions.hasPermission('bien:view'),
    ajusteInventarioController.renderHistorial
);

module.exports = router;
