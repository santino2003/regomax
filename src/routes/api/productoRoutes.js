const express = require('express');
const router = express.Router();
const productoController = require('../../controllers/productoController');
const authMiddleware = require('../../middleware/auth');

router.post('/nuevo', authMiddleware.verifyToken, productoController.crearProducto);

// Ruta para obtener todos los productos
router.get('/', authMiddleware.verifyToken, productoController.obtenerProductosAPI);

// Ruta para obtener solo productos con stock para planificación
router.get('/planificacion', authMiddleware.verifyToken, productoController.listarProductosParaPlanificacion);

module.exports = router;