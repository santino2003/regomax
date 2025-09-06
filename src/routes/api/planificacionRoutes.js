const express = require('express');
const router = express.Router();
const planificacionController = require('../../controllers/planificacionController');
const authMiddleware = require('../../middleware/auth');

// Ruta para obtener planificación de una fecha específica
router.get('/:anio/:mes/:dia', authMiddleware.verifyToken, planificacionController.obtenerPlanificacion);

// Ruta para guardar/actualizar una planificación
router.post('/', authMiddleware.verifyToken, planificacionController.guardarPlanificacion);

// Ruta para eliminar una planificación
router.delete('/:anio/:mes/:dia', authMiddleware.verifyToken, planificacionController.eliminarPlanificacion);

module.exports = router;