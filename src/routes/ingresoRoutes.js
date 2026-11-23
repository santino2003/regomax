const express = require('express');
const router = express.Router();
const ingresoController = require('../controllers/ingresoController');
const auth = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');

router.use(auth.verifyToken, permissionsMiddleware.hasPermission('ingresos:create'));
router.post('/identificar', ingresoController.identificarPersona);
router.post('/personas', ingresoController.registrarPersona);
router.post('/movimientos', ingresoController.registrarMovimiento);
router.post('/movimientos/:id/egreso', ingresoController.registrarEgreso);

module.exports = router;
