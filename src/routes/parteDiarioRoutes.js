const express = require('express');
const router = express.Router();
const parteDiarioController = require('../controllers/parteDiarioController');
const authMiddleware = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');
const permissionsMiddleware = require('../middleware/permissions');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// Rutas de API para Parte Diario
router.post('/nuevo', 
    authMiddleware.verifyToken, 
    permissionsMiddleware.hasPermission('partes_diarios:create'),
    historialMiddleware.parteDiario.crear(),
    parteDiarioController.crearParteDiario
);

router.get('/', 
    authMiddleware.verifyToken,
    permissionsMiddleware.hasPermission('partes_diarios:view'),
    parteDiarioController.listarPartesDiarios
);

// Ruta para listar partes diarios por estado
router.get('/estado/:estado',
    authMiddleware.verifyToken,
    permissionsMiddleware.hasPermission('partes_diarios:view'),
    parteDiarioController.listarPartesDiariosPorEstado
);

router.get('/:id', 
    authMiddleware.verifyToken,
    permissionsMiddleware.hasPermission('partes_diarios:view'),
    historialMiddleware.parteDiario.consultar(),
    parteDiarioController.obtenerParteDiario
);

// Ruta para aprobar un parte diario
router.post('/:id/aprobar',
    authMiddleware.verifyToken,
    permissionsMiddleware.hasPermission('partes_diarios:approve'),
    historialMiddleware.parteDiario.editar(),
    parteDiarioController.aprobarParteDiario
);

router.put('/:id', 
    authMiddleware.verifyToken, 
    permissionsMiddleware.hasPermission('partes_diarios:edit'),
    historialMiddleware.parteDiario.editar(),
    parteDiarioController.actualizarParteDiario
);

router.delete('/:id', 
    authMiddleware.verifyToken, 
    permissionsMiddleware.hasPermission('partes_diarios:delete'),
    historialMiddleware.parteDiario.eliminar(),
    parteDiarioController.eliminarParteDiario
);

// Rutas para gestionar bolsones en partes diarios
router.post('/:id/bolsones',
    authMiddleware.verifyToken,
    permissionsMiddleware.hasPermission('partes_diarios:edit'),
    historialMiddleware.parteDiario.editar(),
    parteDiarioController.asociarBolsonAParteDiario
);

router.delete('/:id/bolsones/:bolsonId',
    authMiddleware.verifyToken,
    permissionsMiddleware.hasPermission('partes_diarios:edit'),
    historialMiddleware.parteDiario.editar(),
    parteDiarioController.desasociarBolsonDeParteDiario
);

module.exports = router;