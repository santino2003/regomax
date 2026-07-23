const express = require('express');
const router = express.Router();
const servicioController = require('../controllers/servicioController');
const authMiddleware = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissionsConfig');
const { servicio: historialServicio } = require('../middleware/historialMiddleware');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// Vistas de servicios dentro de pagos
router.get(
	'/',
	permissionsMiddleware.hasPermission(PERMISSIONS.SERVICIOS.VIEW),
	servicioController.vistaListarServicios
);

router.get(
	'/nuevo',
	permissionsMiddleware.hasPermission(PERMISSIONS.SERVICIOS.CREATE),
	servicioController.vistaNuevoServicio
);

router.get(
	'/editar/:id',
	permissionsMiddleware.hasPermission(PERMISSIONS.SERVICIOS.EDIT),
	servicioController.vistaEditarServicio
);

// API de servicios
router.post(
	'/api/nuevo',
	permissionsMiddleware.hasPermission(PERMISSIONS.SERVICIOS.CREATE),
	historialServicio.crear(),
	servicioController.nuevoServicio
);

router.put(
	'/api/:id',
	permissionsMiddleware.hasPermission(PERMISSIONS.SERVICIOS.EDIT),
	historialServicio.editar(),
	servicioController.modificarServicio
);

router.delete(
	'/api/:id',
	permissionsMiddleware.hasPermission(PERMISSIONS.SERVICIOS.DELETE),
	historialServicio.eliminar(),
	servicioController.eliminarServicio
);

router.get(
	'/api/listar',
	permissionsMiddleware.hasPermission(PERMISSIONS.SERVICIOS.VIEW),
	servicioController.obtenerServicios
);

router.get(
	'/:id',
	permissionsMiddleware.hasPermission(PERMISSIONS.SERVICIOS.VIEW),
	servicioController.vistaVerServicio
);

module.exports = router;
