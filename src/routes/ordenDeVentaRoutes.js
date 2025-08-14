const express = require('express');
const router = express.Router();
const ordenDeVentaController = require('../controllers/ordenDeVentaController');
const auth = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');

// Rutas para API
router.post('/', 
    auth.verifyToken, 
    historialMiddleware.orden.crear(), 
    ordenDeVentaController.crearOrdenDeVenta
);

router.post('/nueva', 
    auth.verifyToken, 
    historialMiddleware.orden.crear(), 
    ordenDeVentaController.crearOrdenDeVenta
); // Nueva ruta para compatibilidad con el frontend

router.get('/cliente/:clienteId', 
    auth.verifyToken, 
    ordenDeVentaController.buscarOrdenesPorCliente
);

router.get('/:id', 
    auth.verifyToken, 
    historialMiddleware.orden.consultar(), 
    ordenDeVentaController.obtenerOrden
);

router.get('/', 
    auth.verifyToken, 
    ordenDeVentaController.listarOrdenes
);

router.put('/:id', 
    auth.verifyToken, 
    historialMiddleware.orden.editar(), 
    ordenDeVentaController.actualizarOrden
);

router.delete('/:id', 
    auth.verifyToken, 
    historialMiddleware.orden.eliminar(), 
    ordenDeVentaController.eliminarOrdenDeVenta
);

module.exports = router;