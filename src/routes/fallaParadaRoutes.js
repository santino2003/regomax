const express = require('express');
const router = express.Router();
const fallaParadaController = require('../controllers/fallaParadaController');
const auth = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');

router.get('/exportar-excel', auth.verifyToken, permissionsMiddleware.hasPermission('ordenes_trabajo:view'), fallaParadaController.exportarExcel);
router.post('/', auth.verifyToken, permissionsMiddleware.hasPermission('ordenes_trabajo:create'), fallaParadaController.crear);
router.put('/:id', auth.verifyToken, permissionsMiddleware.hasPermission('ordenes_trabajo:edit'), fallaParadaController.modificar);

module.exports = router;
