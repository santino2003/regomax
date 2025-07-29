const express = require('express');
const router = express.Router();
const despachoController = require('../controllers/despachoController');
const authMiddleware = require('../middleware/auth');

// Rutas API
router.post('/nuevo', authMiddleware.verifyToken, despachoController.nuevoDespacho);
router.post('/manual/:ordenId', authMiddleware.verifyToken, despachoController.despachoManual);
router.get('/orden/:ordenId', authMiddleware.verifyToken, despachoController.obtenerDespachosPorOrden);
router.get('/verificar-bolson/:codigo', authMiddleware.verifyToken, despachoController.verificarBolson);
router.get('/bolsones-despachados', authMiddleware.verifyToken, despachoController.listarBolsonesDespachados);
router.get('/exportar-despachados', authMiddleware.verifyToken, despachoController.exportarBolsonesDespachados);

module.exports = router;