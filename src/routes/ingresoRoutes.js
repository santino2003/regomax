const express = require('express');
const router = express.Router();
const ingresoController = require('../controllers/ingresoController');
const movimientoIngresoController = require('../controllers/movimientoIngresoController');
const auth = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');

router.use(auth.verifyToken, permissionsMiddleware.hasPermission('ingresos:create'));
router.post('/identificar', ingresoController.identificarPersona);
router.post('/personas', ingresoController.registrarPersona);
router.post('/movimientos', movimientoIngresoController.registrar);

module.exports = router;
