const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');
const auth = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');
const permissionsMiddleware = require('../middleware/permissions');

// Rutas de API para categorias
router.post(
    '/nuevo',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('categoria:create'),
    historialMiddleware.categoria.crear(),
    categoriaController.nuevaCategoria
);

router.put(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('categoria:edit'),
    historialMiddleware.categoria.editar(),
    categoriaController.modificarCategoria
);

router.delete(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('categoria:delete'),
    historialMiddleware.categoria.eliminar(),
    categoriaController.eliminarCategoria
);

router.get(
    '/',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('categoria:view'),
    categoriaController.obtenerCategorias
);

module.exports = router;
