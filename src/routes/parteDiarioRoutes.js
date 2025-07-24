const express = require('express');
const router = express.Router();
const parteDiarioController = require('../controllers/parteDiarioController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// Rutas de API para Parte Diario
router.post('/nuevo', parteDiarioController.crearParteDiario);
router.get('/', parteDiarioController.listarPartesDiarios);
router.get('/:id', parteDiarioController.obtenerParteDiario);

module.exports = router;