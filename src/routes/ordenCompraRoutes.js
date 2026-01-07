const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ordenCompraController = require('../controllers/ordenCompraController');
const auth = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');
const permissionsMiddleware = require('../middleware/permissions');

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads/ordenes-compra');
        
        // Crear directorio si no existe
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generar nombre único: timestamp-random-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
    }
});

// Filtro de archivos permitidos
const fileFilter = (req, file, cb) => {
    // Permitir documentos, imágenes y PDFs
    const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo se aceptan imágenes, PDFs y documentos de Office.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Límite de 10MB
    }
});

// Rutas de API para ordenes de compra

// Crear nueva orden de compra
router.post(
    '/nuevo',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes_compra:create'),
    upload.single('archivo'),
    historialMiddleware.ordenCompra?.crear() || ((req, res, next) => next()),
    ordenCompraController.nuevaOrdenCompra
);

// Modificar orden de compra
router.put(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes_compra:edit'),
    upload.single('archivo'),
    historialMiddleware.ordenCompra?.editar() || ((req, res, next) => next()),
    ordenCompraController.modificarOrdenCompra
);

// Eliminar orden de compra
router.delete(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes_compra:delete'),
    historialMiddleware.ordenCompra?.eliminar() || ((req, res, next) => next()),
    ordenCompraController.eliminarOrdenCompra
);

// Obtener datos del formulario (antes de las rutas con parámetros)
router.get(
    '/form/datos',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes_compra:view'),
    ordenCompraController.obtenerDatosFormulario
);

// Obtener estadísticas
router.get(
    '/estadisticas',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes_compra:view'),
    ordenCompraController.obtenerEstadisticas
);

// Cambiar estado de una orden
// NOTA: No se valida permiso aquí porque la validación de transiciones específicas
// se hace en el servicio (ordenCompraService.cambiarEstado)
router.patch(
    '/:id/estado',
    auth.verifyToken,
    historialMiddleware.ordenCompra?.cambiarEstado() || ((req, res, next) => next()),
    ordenCompraController.cambiarEstado
);

// Actualizar cantidad recibida de un item
router.patch(
    '/:id/items/:itemId/cantidad-recibida',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes_compra:edit'),
    historialMiddleware.ordenCompra?.actualizarCantidadRecibida() || ((req, res, next) => next()),
    ordenCompraController.actualizarCantidadRecibida
);

// Subir archivo adjunto
router.post(
    '/:id/archivos',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes_compra:edit'),
    upload.single('archivo'),
    historialMiddleware.ordenCompra?.subirArchivo() || ((req, res, next) => next()),
    ordenCompraController.subirArchivo
);

// Eliminar archivo adjunto
router.delete(
    '/:id/archivos',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes_compra:edit'),
    historialMiddleware.ordenCompra?.eliminarArchivo() || ((req, res, next) => next()),
    ordenCompraController.eliminarArchivo
);

// Exportar orden de compra a PDF
router.get(
    '/:id/exportar-pdf',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes_compra:view'),
    ordenCompraController.exportarPDF
);

// Obtener todas las ordenes de compra (con filtros)
router.get(
    '/',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes_compra:view'),
    ordenCompraController.obtenerOrdenesCompra
);

// Obtener una orden de compra por ID
router.get(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('ordenes_compra:view'),
    ordenCompraController.obtenerOrdenCompraPorId
);

module.exports = router;
