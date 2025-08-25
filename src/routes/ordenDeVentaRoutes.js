const express = require('express');
const router = express.Router();
const ordenDeVentaController = require('../controllers/ordenDeVentaController');
const auth = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');
const permissionsMiddleware = require('../middleware/permissions');

// Rutas para API
router.post('/', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes:create'),
    historialMiddleware.orden.crear(), 
    ordenDeVentaController.crearOrdenDeVenta
);

router.post('/nueva', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes:create'),
    historialMiddleware.orden.crear(), 
    ordenDeVentaController.crearOrdenDeVenta
); // Nueva ruta para compatibilidad con el frontend

router.get('/cliente/:clienteId', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes:view'),
    ordenDeVentaController.buscarOrdenesPorCliente
);

router.get('/:id', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes:view'),
    ordenDeVentaController.obtenerOrden
);

router.get('/', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes:view'),
    ordenDeVentaController.listarOrdenes
);

router.put('/:id', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes:edit'),
    historialMiddleware.orden.editar(), 
    ordenDeVentaController.actualizarOrden
);

router.delete('/:id', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes:delete'),
    historialMiddleware.orden.eliminar(), 
    ordenDeVentaController.eliminarOrdenDeVenta
);

module.exports = router;