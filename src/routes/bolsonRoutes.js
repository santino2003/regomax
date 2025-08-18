const express = require('express');
const router = express.Router();
const bolsonController = require('../controllers/bolsonController');
const auth = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');
const permissionsMiddleware = require('../middleware/permissions');

// Rutas para vistas
router.get('/nuevo', 
    auth.verifyToken, 
    permissionsMiddleware.hasPermission('bolsones:create'),
    bolsonController.vistaNuevoBolson
);

router.get('/listar', 
    auth.verifyToken, 
    permissionsMiddleware.hasPermission('bolsones:view'),
    bolsonController.vistaListarBolsones
);

router.get('/editar/:id', 
    auth.verifyToken, 
    permissionsMiddleware.hasPermission('bolsones:edit'),
    bolsonController.vistaEditarBolson
);

router.get('/despachados', 
    auth.verifyToken, 
    permissionsMiddleware.hasPermission('despachos:view'),
    bolsonController.vistaBolsonesDespachados
);

router.get('/exportar', 
    auth.verifyToken, 
    permissionsMiddleware.hasPermission('bolsones:export'),
    bolsonController.exportarBolsones
);

// Rutas para API con middleware de historial específico para cada tipo de acción
router.post('/nuevo', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bolsones:create'),
    historialMiddleware.bolson.crear(),
    bolsonController.nuevoBolson
);

router.get('/get/:id', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bolsones:view'),
    historialMiddleware.bolson.consultar(),
    bolsonController.obtenerBolson
);

router.put('/actualizar/:id', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bolsones:edit'),
    historialMiddleware.bolson.editar(),
    bolsonController.actualizarBolson
);

router.delete('/eliminar/:id', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bolsones:delete'),
    historialMiddleware.bolson.eliminar(),
    bolsonController.eliminarBolson
);

router.get('/all', 
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bolsones:view'),
    bolsonController.obtenerTodosLosBolsones
);

module.exports = router;