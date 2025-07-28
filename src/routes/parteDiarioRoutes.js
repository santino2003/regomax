const express = require('express');
const router = express.Router();
const parteDiarioController = require('../controllers/parteDiarioController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// Rutas de API para Parte Diario
router.post('/nuevo',authMiddleware.verifyToken ,parteDiarioController.crearParteDiario);
router.get('/', authMiddleware.verifyToken,parteDiarioController.listarPartesDiarios);
router.get('/:id', authMiddleware.verifyToken,parteDiarioController.obtenerParteDiario);

module.exports = router;