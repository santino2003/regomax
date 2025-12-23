const express = require('express');
const router = express.Router();
const familiaController = require('../controllers/familiaController');
const auth = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');
const permissionsMiddleware = require('../middleware/permissions');

// Rutas para API con middleware de historial específico para cada tipo de acción
router.post('/nuevo', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('familia:create'),
    historialMiddleware.familia.crear(),
    familiaController.nuevaFamilia
);

// Ruta para actualizar familia
router.put('/:id', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('familia:edit'),
    historialMiddleware.familia.editar(),
    familiaController.modificarFamilia
);

// Ruta para eliminar familia
router.delete('/:id', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('familia:delete'),
    historialMiddleware.familia.eliminar(),
    familiaController.eliminarFamilia
);

// Ruta para obtener todas las familias
router.get('/', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('familia:view'),
    familiaController.obtenerFamilias
);

module.exports = router;
