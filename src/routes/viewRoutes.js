const express = require('express');
const router = express.Router();
const path = require('path');
const authMiddleware = require('../middleware/auth');
const noCacheMiddleware = require('../middleware/noCacheMiddleware');
const bolsonController = require('../controllers/bolsonController');
const OVController = require('../controllers/ordenDeVentaController');
const productoController = require('../controllers/productoController');
const despachoController = require('../controllers/despachoController');

// Ruta base - redirigir a login
router.get('/', (req, res) => {
    res.redirect('/login');
});

// Ruta para login
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/login.html'));
});

// Ruta para home - añadiendo noCacheMiddleware
router.get('/home', [authMiddleware.verifyToken, noCacheMiddleware], (req, res) => {
    console.log('Username en cookie:', req.user.username);
    res.render('home', { username: req.user.username });
});

// Rutas de vistas para bolsones - añadiendo noCacheMiddleware
router.get('/bolsones', [authMiddleware.verifyToken, noCacheMiddleware], bolsonController.vistaListarBolsones);
router.get('/bolsones/nuevo', [authMiddleware.verifyToken, noCacheMiddleware], bolsonController.vistaNuevoBolson);
router.get('/bolsones/:id', [authMiddleware.verifyToken, noCacheMiddleware], bolsonController.vistaEditarBolson);

// Rutas de órdenes - añadiendo noCacheMiddleware
router.get('/ordenes', [authMiddleware.verifyToken, noCacheMiddleware], OVController.vistaListarOrdenes);
router.get('/ordenes/nueva', [authMiddleware.verifyToken, noCacheMiddleware], OVController.vistaNuevaOrden);
router.get('/ordenes/editar/:id', [authMiddleware.verifyToken, noCacheMiddleware], OVController.vistaEditarOrden);
router.get('/ordenes/:id', [authMiddleware.verifyToken, noCacheMiddleware], OVController.vistaVisualizarOrden);

// Rutas de productos
router.get('/productos/nuevo', [authMiddleware.verifyToken, noCacheMiddleware], productoController.vistaNuevoProducto);

// Rutas de despachos
router.get('/despachos/nuevo', [authMiddleware.verifyToken, noCacheMiddleware], despachoController.vistaCrearDespacho);
router.get('/despachos/orden/:ordenId', [authMiddleware.verifyToken, noCacheMiddleware], despachoController.vistaVerDespachos);
router.get('/bolsones-despachados', [authMiddleware.verifyToken, noCacheMiddleware], despachoController.vistaListarBolsonesDespachados);

// Endpoint de logout
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

module.exports = router;