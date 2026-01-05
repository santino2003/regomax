const express = require('express');
const router = express.Router();
const ajusteInventarioController = require('../controllers/ajusteInventarioController');
const auth = require('../middleware/auth');
const permissions = require('../middleware/permissions');
const historialMiddleware = require('../middleware/historialMiddleware');

// Vista para nuevo ajuste
router.get('/ajuste-inventario',
    auth.verifyToken,
    permissions.hasPermission('bienes', 'editar'),
    ajusteInventarioController.renderAjusteNuevo
);

// Procesar ajuste
router.post('/api/ajustes-inventario',
    auth.verifyToken,
    permissions.hasPermission('bienes', 'editar'),
    historialMiddleware.registrarHistorial('ajuste_inventario', 'crear'),
    ajusteInventarioController.procesarAjuste
);

// Obtener historial
router.get('/api/ajustes-inventario',
    auth.verifyToken,
    permissions.hasPermission('bienes', 'ver'),
    ajusteInventarioController.obtenerHistorial
);

// Vista de historial
router.get('/ajuste-inventario/historial',
    auth.verifyToken,
    permissions.hasPermission('bienes', 'ver'),
    ajusteInventarioController.renderHistorial
);

module.exports = router;
