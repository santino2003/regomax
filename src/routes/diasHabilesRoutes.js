const express = require('express');
const router = express.Router();
const diasHabilesController = require('../controllers/diasHabilesController');
const authMiddleware = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissionsConfig');

// Ruta para mostrar el calendario de días hábiles (protegida por autenticación)
router.get('/dias-habiles', 
    authMiddleware.verifyToken, 
    permissionsMiddleware.hasPermission(PERMISSIONS.DIAS_HABILES.VIEW), 
    diasHabilesController.mostrarCalendario
);

// API para guardar días hábiles (protegida por autenticación)
router.post('/api/dias-habiles', 
    authMiddleware.verifyToken, 
    permissionsMiddleware.hasPermission(PERMISSIONS.DIAS_HABILES.EDIT), 
    diasHabilesController.guardarDiasHabiles
);

// API para obtener días hábiles de un mes específico
router.get('/api/dias-habiles', 
    authMiddleware.verifyToken, 
    permissionsMiddleware.hasPermission(PERMISSIONS.DIAS_HABILES.VIEW), 
    diasHabilesController.obtenerDiasHabiles
);

// API para eliminar días hábiles
router.delete('/api/dias-habiles/:mes/:anio', 
    authMiddleware.verifyToken, 
    permissionsMiddleware.hasPermission(PERMISSIONS.DIAS_HABILES.DELETE), 
    diasHabilesController.eliminarDiasHabiles
);

module.exports = router;