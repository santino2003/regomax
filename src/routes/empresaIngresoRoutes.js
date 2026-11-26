const router = require('express').Router();
const controlador = require('../controllers/empresaIngresoController');
const auth = require('../middleware/auth');
const permisos = require('../middleware/permissions');
router.use(auth.verifyToken, permisos.hasPermission('ingresos:create'));
router.post('/', controlador.guardar);
router.put('/:id', controlador.guardar);
router.delete('/:id', controlador.eliminar);
module.exports = router;
