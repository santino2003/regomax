const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');

// Rutas públicas con registro en historial
router.post('/login', historialMiddleware.registrarLogin(), authController.login);
router.post('/register', authController.register);
router.post('/logout', authMiddleware.verifyToken, historialMiddleware.registrarLogout(), authController.logout);

// Rutas protegidas
router.get('/check', authMiddleware.verifyToken, authController.check);

module.exports = router;