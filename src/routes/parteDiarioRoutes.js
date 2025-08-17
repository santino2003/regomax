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

// Ruta para listar partes diarios por estado
router.get('/estado/:estado',
    authMiddleware.verifyToken,
    parteDiarioController.listarPartesDiariosPorEstado
);

router.get('/:id', 
    authMiddleware.verifyToken,
    historialMiddleware.parteDiario.consultar(),
    parteDiarioController.obtenerParteDiario
);

// Ruta para aprobar un parte diario
router.post('/:id/aprobar',
    authMiddleware.verifyToken,
    historialMiddleware.parteDiario.editar(),
    parteDiarioController.aprobarParteDiario
);

// Ruta para rechazar un parte diario
router.post('/:id/rechazar',
    authMiddleware.verifyToken,
    historialMiddleware.parteDiario.editar(),
    parteDiarioController.rechazarParteDiario
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