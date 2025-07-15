const express = require('express');
const router = express.Router();
const productoController = require('../../controllers/productoController');
const authMiddleware = require('../../middleware/auth');

router.post('/nuevo', authMiddleware.verifyToken, productoController.crearProducto);
router.get('/', productoController.listarProductos);

module.exports = router;