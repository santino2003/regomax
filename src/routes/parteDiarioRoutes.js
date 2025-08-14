const express = require('express');
const router = express.Router();
const parteDiarioController = require('../controllers/parteDiarioController');
const authMiddleware = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// Rutas de API para Parte Diario
router.post('/nuevo', 
    authMiddleware.verifyToken, 
    historialMiddleware.parteDiario.crear(),
    parteDiarioController.crearParteDiario
);

router.get('/', 
    authMiddleware.verifyToken,
    parteDiarioController.listarPartesDiarios
);

router.get('/:id', 
    authMiddleware.verifyToken,
    historialMiddleware.parteDiario.consultar(),
    parteDiarioController.obtenerParteDiario
);

router.put('/:id', 
    authMiddleware.verifyToken, 
    historialMiddleware.parteDiario.editar(),
    parteDiarioController.actualizarParteDiario
);

router.delete('/:id', 
    authMiddleware.verifyToken, 
    historialMiddleware.parteDiario.eliminar(),
    parteDiarioController.eliminarParteDiario
);

module.exports = router;