const express = require('express');
const router = express.Router();
const bolsonController = require('../controllers/bolsonController');
const auth = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');

// Rutas para vistas
router.get('/nuevo', auth.verifyToken, bolsonController.vistaNuevoBolson);
router.get('/listar', auth.verifyToken, bolsonController.vistaListarBolsones);
router.get('/editar/:id', auth.verifyToken, bolsonController.vistaEditarBolson);
router.get('/despachados', auth.verifyToken, bolsonController.vistaBolsonesDespachados);
router.get('/exportar', auth.verifyToken, bolsonController.exportarBolsones);

// Rutas para API con middleware de historial específico para cada tipo de acción
router.post('/nuevo', 
    auth.verifyToken, 
    historialMiddleware.bolson.crear(),
    bolsonController.nuevoBolson
);

router.get('/get/:id', 
    auth.verifyToken, 
    historialMiddleware.bolson.consultar(),
    bolsonController.obtenerBolson
);

router.put('/actualizar/:id', 
    auth.verifyToken, 
    historialMiddleware.bolson.editar(),
    bolsonController.actualizarBolson
);

router.delete('/eliminar/:id', 
    auth.verifyToken, 
    historialMiddleware.bolson.eliminar(),
    bolsonController.eliminarBolson
);

router.get('/all', 
    auth.verifyToken, 
    bolsonController.obtenerTodosLosBolsones
);

module.exports = router;