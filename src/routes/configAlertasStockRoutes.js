const express = require('express');
const router = express.Router();
const configAlertasStockController = require('../controllers/configAlertasStockController');
const auth = require('../middleware/auth');
const permissions = require('../middleware/permissions');

// Todas las rutas requieren autenticación y permisos de admin
router.use(auth.verifyToken);

// Mostrar página de configuración
router.get('/', permissions.hasPermission('config'), configAlertasStockController.mostrarConfiguracion);

// Actualizar configuración
router.post('/', permissions.hasPermission('config'), configAlertasStockController.actualizarConfiguracion);

// API: Obtener configuración actual
router.get('/api', permissions.hasPermission('config'), configAlertasStockController.obtenerConfiguracion);

module.exports = router;
