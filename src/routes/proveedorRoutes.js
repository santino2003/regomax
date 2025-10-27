const express = require('express');
const router = express.Router();
const proveedorController = require('../controllers/proveedorController');
const auth = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');
const permissionsMiddleware = require('../middleware/permissions');

// Rutas para API con middleware de historial específico para cada tipo de acción
router.post('/nuevo', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('proveedor:create'),
    historialMiddleware.proveedor.crear(),
    proveedorController.nuevoProveedor
);

// Puedes agregar más rutas aquí si lo necesitas

module.exports = router;