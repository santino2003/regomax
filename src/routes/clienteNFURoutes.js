const express = require('express');
const router = express.Router();
const clienteNFUController = require('../controllers/clienteNFUController');
const auth = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');
const historialMiddleware = require('../middleware/historialMiddleware');

// Ruta para exportar a CSV
router.get('/exportar-csv', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('clientes_nfu:view'),
    clienteNFUController.exportarCSV
);

// Rutas para API
router.post('/nuevo', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('clientes_nfu:create'),
    historialMiddleware.clienteNFU.crear(),
    clienteNFUController.nuevoCliente
);

router.get('/:id', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('clientes_nfu:view'),
    clienteNFUController.obtenerCliente
);

router.put('/:id', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('clientes_nfu:edit'),
    historialMiddleware.clienteNFU.editar(),
    clienteNFUController.actualizarCliente
);

router.delete('/:id', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('clientes_nfu:delete'),
    historialMiddleware.clienteNFU.eliminar(),
    clienteNFUController.eliminarCliente
);

module.exports = router;
