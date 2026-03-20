const express = require('express');
const router = express.Router();
const pagoController = require('../controllers/pagoController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware.verifyToken);

// Ruta para mostrar el listado de pagos
router.get('/listar', pagoController.mostrarListado);

// Ruta para marcar un pago como pagado
router.post('/:id/marcar-pagado', pagoController.marcarComoPagado);

// Ruta para refinanciar un pago
router.post('/:id/refinanciar', pagoController.refinanciarPago);

// Ruta para mostrar detalle de un pago
router.get('/:id', pagoController.mostrarDetalle);

// Ruta para obtener resumen de pagos (API)
router.get('/api/resumen', pagoController.obtenerResumen);

// Ruta para exportar pagos
router.get('/exportar', pagoController.exportarExcel);

module.exports = router;
