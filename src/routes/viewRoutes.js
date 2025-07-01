const express = require('express');
const router = express.Router();
const path = require('path');
const authMiddleware = require('../middleware/auth');
const bolsonController = require('../controllers/bolsonController');
const OVController = require('../controllers/ordenDeVentaController');

// Ruta base - redirigir a login
router.get('/', (req, res) => {
    res.redirect('/login');
});

// Ruta para login
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/login.html'));
});

// Ruta para home
router.get('/home', authMiddleware.verifyToken, (req, res) => {
    console.log('Username en cookie:', req.user.username);
    res.render('home', { username: req.user.username });
});

// Rutas de vistas para bolsones
router.get('/bolsones', authMiddleware.verifyToken, bolsonController.vistaListarBolsones);
router.get('/bolsones/nuevo', authMiddleware.verifyToken, bolsonController.vistaNuevoBolson);
router.get('/bolsones/:id', authMiddleware.verifyToken, bolsonController.vistaEditarBolson);

router.get('/ordenes', authMiddleware.verifyToken, OVController.vistaListarOrdenes);


// Endpoint de logout
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

module.exports = router;