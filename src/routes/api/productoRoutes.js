const express = require('express');
const router = express.Router();
const productoController = require('../../controllers/productoController');
const authMiddleware = require('../../middleware/auth');

router.post('/nuevo', authMiddleware.verifyToken, productoController.crearProducto);

// Ruta para obtener todos los productos
router.get('/', authMiddleware.verifyToken, productoController.obtenerProductosAPI);

module.exports = router;