const express = require('express');
const router = express.Router();
const bolsonController = require('../controllers/bolsonController');

// Si usas autenticación, agrega el middleware aquí
const authMiddleware = require('../middleware/auth');

router.post('/nuevo', authMiddleware.verifyToken, bolsonController.nuevoBolson);
router.get('/', authMiddleware.verifyToken, bolsonController.listarBolsones);
router.get('/:id', authMiddleware.verifyToken, bolsonController.obtenerBolson);
router.put('/:id', authMiddleware.verifyToken, bolsonController.actualizarBolson);
router.delete('/:id', authMiddleware.verifyToken, bolsonController.eliminarBolson);

module.exports = router;