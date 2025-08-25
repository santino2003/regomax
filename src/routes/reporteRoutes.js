const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');
const authMiddleware = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');

// Rutas para guardar días hábiles y datos NFU
router.post('/dias-habiles', [
    authMiddleware.verifyToken,
    permissionsMiddleware.hasPermission('reportes:edit')
], reporteController.guardarDiasHabiles);

router.post('/nfu', [
    authMiddleware.verifyToken,
    permissionsMiddleware.hasPermission('reportes:edit')
], reporteController.guardarDatosNFU);

module.exports = router;