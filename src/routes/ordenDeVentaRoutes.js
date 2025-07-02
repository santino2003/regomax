const express = require('express');
const router = express.Router();
const OVController = require('../controllers/ordenDeVentaController');
const authMiddleware = require('../middleware/auth');

// Si usas autenticación
// const authMiddleware = require('../middleware/auth');
// router.post('/nueva', authMiddleware, OVController.crearOrdenDeVenta);

router.post('/nueva',authMiddleware.verifyToken, OVController.crearOrdenDeVenta);
router.get('/', OVController.listarOrdenes);
router.get('/:id', OVController.obtenerOrden);

module.exports = router;