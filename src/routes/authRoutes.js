const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Ruta para login
router.post('/login', authController.login);

// Ruta para registro
router.post('/register', authController.register);

// Ruta protegida de ejemplo (solo usuarios autenticados)
router.get('/me', authMiddleware.verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'Usuario autenticado',
    user: req.user
  });
});

module.exports = router;