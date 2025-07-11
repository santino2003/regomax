const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Rutas públicas
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/logout', authController.logout);

// Rutas protegidas
router.get('/check', authMiddleware.verifyToken, authController.check);

module.exports = router;