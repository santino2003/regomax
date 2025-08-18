const express = require('express');
const router = express.Router();
const despachoController = require('../controllers/despachoController');
const auth = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');
const permissionsMiddleware = require('../middleware/permissions');

// Rutas API
router.post('/nuevo', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('despachos:create'),
    historialMiddleware.despacho.despacharBolson(),
    despachoController.nuevoDespacho
);

router.post('/manual/:ordenId', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('despachos:create'),
    historialMiddleware.despacho.despacharBolson(),
    despachoController.despachoManual
);

router.get('/orden/:ordenId', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('despachos:view'),
    historialMiddleware.despacho.consultar(),
    despachoController.obtenerDespachosPorOrden
);

router.get('/verificar-bolson/:codigo', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('despachos:view'),
    despachoController.verificarBolson
);

router.get('/bolsones-despachados', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('despachos:view'),
    despachoController.listarBolsonesDespachados
);

router.get('/exportar-despachados', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('despachos:export'),
    despachoController.exportarBolsonesDespachados
);

module.exports = router;