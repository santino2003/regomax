const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bienController = require('../controllers/bienController');
const auth = require('../middleware/auth');
const historialMiddleware = require('../middleware/historialMiddleware');
const permissionsMiddleware = require('../middleware/permissions');

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads/bienes');
        
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
    // Permitir documentos, imágenes, PDFs y archivos DWG
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
        'text/plain',
        'application/acad',
        'application/x-acad',
        'application/autocad_dwg',
        'image/x-dwg',
        'application/dwg',
        'application/x-dwg',
        'application/x-autocad',
        'image/vnd.dwg',
        'drawing/x-dwg'
    ];
    
    // También permitir archivos con extensión .dwg aunque el mimetype no coincida
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimes.includes(file.mimetype) || ext === '.dwg') {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo se aceptan imágenes, PDFs, documentos de Office y archivos DWG.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Límite de 10MB
    }
});

// Rutas de API para bienes
router.post(
    '/nuevo',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bien:create'),
    historialMiddleware.bien.crear(),
    bienController.nuevoBien
);

router.put(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bien:edit'),
    historialMiddleware.bien.editar(),
    bienController.modificarBien
);

router.delete(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bien:delete'),
    historialMiddleware.bien.eliminar(),
    bienController.eliminarBien
);

// IMPORTANTE: Las rutas más específicas deben ir ANTES de las genéricas
// Ruta para obtener datos de formulario
router.get(
    '/form/datos',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bien:view'),
    bienController.obtenerDatosFormulario
);

// Ruta para obtener todos los bienes (con filtros)
router.get(
    '/',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bien:view'),
    bienController.obtenerBienes
);

// Ruta para obtener un bien por ID
router.get(
    '/:id',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bien:view'),
    bienController.obtenerBienPorId
);

// Ruta para actualizar stock
router.patch(
    '/:id/stock',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bien:edit'),
    historialMiddleware.bien.actualizarStock(),
    bienController.actualizarStock
);

// Ruta para subir archivo
router.post(
    '/:id/archivos',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bien:edit'),
    upload.single('archivo'),
    historialMiddleware.bien.subirArchivo(),
    bienController.subirArchivo
);

// Ruta para eliminar archivo
router.delete(
    '/:id/archivos/:archivoId',
    auth.verifyToken,
    permissionsMiddleware.hasPermission('bien:edit'),
    historialMiddleware.bien.eliminarArchivo(),
    bienController.eliminarArchivo
);

module.exports = router;
