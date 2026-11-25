const express = require('express');
const router = express.Router();
const planificacionController = require('../../controllers/planificacionController');
const authMiddleware = require('../../middleware/auth');
const permissionsMiddleware = require('../../middleware/permissions');
const { PERMISSIONS } = require('../../config/permissionsConfig');

// Ruta para obtener planificación de una fecha específica
router.get('/:anio/:mes/:dia',
    authMiddleware.verifyToken,
    permissionsMiddleware.hasPermission(PERMISSIONS.DIAS_HABILES.VIEW),
    planificacionController.obtenerPlanificacion
);

// Ruta para guardar/actualizar una planificación
router.post('/',
    authMiddleware.verifyToken,
    permissionsMiddleware.hasPermission(PERMISSIONS.DIAS_HABILES.EDIT),
    planificacionController.guardarPlanificacion
);

// Ruta para eliminar una planificación
router.delete('/:anio/:mes/:dia',
    authMiddleware.verifyToken,
    permissionsMiddleware.hasPermission(PERMISSIONS.DIAS_HABILES.DELETE),
    planificacionController.eliminarPlanificacion
);

module.exports = router;
