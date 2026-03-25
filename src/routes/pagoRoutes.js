const express = require('express');
const router = express.Router();
const pagoController = require('../controllers/pagoController');
const authMiddleware = require('../middleware/auth');
const permissionsMiddleware = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissionsConfig');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// Ruta para obtener cuotas de contrafactura de una orden de compra
router.get(
	'/orden/:ordenId/cuotas-contrafactura',
	permissionsMiddleware.hasPermission(PERMISSIONS.PAGOS.VIEW),
	pagoController.obtenerCuotasOrdenCompra
);

// Ruta para mostrar el listado de pagos
router.get(
	'/listar',
	permissionsMiddleware.hasPermission(PERMISSIONS.PAGOS.VIEW),
	pagoController.mostrarListado
);

// Ruta para marcar un pago como pagado
router.post(
	'/:id/marcar-pagado',
	permissionsMiddleware.hasPermission(PERMISSIONS.PAGOS.MARK_PAID),
	pagoController.marcarComoPagado
);

// Ruta para refinanciar un pago
router.post(
	'/:id/refinanciar',
	permissionsMiddleware.hasPermission(PERMISSIONS.PAGOS.EDIT),
	pagoController.refinanciarPago
);

// Ruta para mostrar detalle de un pago
router.get(
	'/:id',
	permissionsMiddleware.hasPermission(PERMISSIONS.PAGOS.VIEW),
	pagoController.mostrarDetalle
);

// Ruta para obtener resumen de pagos (API)
router.get(
	'/api/resumen',
	permissionsMiddleware.hasPermission(PERMISSIONS.PAGOS.SUMMARY),
	pagoController.obtenerResumen
);

// Ruta para exportar pagos
router.get(
	'/exportar',
	permissionsMiddleware.hasPermission(PERMISSIONS.PAGOS.EXPORT),
	pagoController.exportarExcel
);

module.exports = router;
