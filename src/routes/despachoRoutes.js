const express = require('express');
const router = express.Router();
const despachoController = require('../controllers/despachoController');
const auth = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');

// Rutas API
router.post('/nuevo', 
    auth.verifyToken, 
    historialMiddleware.despacho.despacharBolson(),  // Usamos el middleware específico para despachar bolsones
    despachoController.nuevoDespacho
);

router.post('/manual/:ordenId', 
    auth.verifyToken, 
    historialMiddleware.despacho.despacharBolson(),  // Usamos el middleware específico para despachar bolsones
    despachoController.despachoManual
);

router.get('/orden/:ordenId', 
    auth.verifyToken, 
    historialMiddleware.despacho.consultar(),
    despachoController.obtenerDespachosPorOrden
);

router.get('/verificar-bolson/:codigo', 
    auth.verifyToken, 
    despachoController.verificarBolson
);

router.get('/bolsones-despachados', 
    auth.verifyToken, 
    despachoController.listarBolsonesDespachados
);

router.get('/exportar-despachados', 
    auth.verifyToken, 
    despachoController.exportarBolsonesDespachados
);

module.exports = router;