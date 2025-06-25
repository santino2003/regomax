const express = require('express');
const router = express.Router();
const bolsonController = require('../controllers/bolsonController');

// Si usas autenticación, agrega el middleware aquí
// const authMiddleware = require('../middleware/auth');
// router.post('/nuevo', authMiddleware, bolsonController.nuevoBolson);

router.post('/nuevo', bolsonController.nuevoBolson);

module.exports = router;