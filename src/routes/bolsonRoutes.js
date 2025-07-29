const express = require('express');
const router = express.Router();
const bolsonController = require('../controllers/bolsonController');
const auth = require('../middleware/auth');


// Rutas para vistas
router.get('/nuevo', auth.verifyToken, bolsonController.vistaNuevoBolson);
router.get('/listar', auth.verifyToken, bolsonController.vistaListarBolsones);
router.get('/editar/:id', auth.verifyToken, bolsonController.vistaEditarBolson);
router.get('/despachados', auth.verifyToken, bolsonController.vistaBolsonesDespachados);
router.get('/exportar', auth.verifyToken, bolsonController.exportarBolsones);

// Rutas para API
router.post('/nuevo', auth.verifyToken, bolsonController.nuevoBolson);
router.get('/get/:id', auth.verifyToken, bolsonController.obtenerBolson);
router.put('/actualizar/:id', auth.verifyToken, bolsonController.actualizarBolson);
router.delete('/eliminar/:id', auth.verifyToken, bolsonController.eliminarBolson);
router.get('/all', auth.verifyToken, bolsonController.obtenerTodosLosBolsones);

module.exports = router;