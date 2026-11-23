const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { getUploadPath, ensureUploadDir } = require('../config/uploads');

const upload = multer({
    storage: multer.diskStorage({
        destination(req, file, callback) {
            try {
                ensureUploadDir('ingresos');
                callback(null, getUploadPath('ingresos'));
            } catch (error) {
                callback(error);
            }
        },
        filename(req, file, callback) {
            const extension = path.extname(file.originalname).toLowerCase() === '.pdf' ? '.pdf' : '.jpg';
            callback(null, `${randomUUID()}${extension}`);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 20 },
    fileFilter(req, file, callback) {
        const extension = path.extname(file.originalname).toLowerCase();
        const permitido = extension === '.pdf' ? file.mimetype === 'application/pdf'
            : ['.jpg', '.jpeg'].includes(extension) && ['image/jpeg', 'image/jpg'].includes(file.mimetype);
        if (!permitido) {
            return callback(Object.assign(new Error('Solo se permite un archivo JPG, JPEG o PDF.'), { status: 400 }));
        }
        callback(null, true);
    }
}).single('archivo_jpg');

module.exports = function ingresoUpload(req, res, next) {
    upload(req, res, async error => {
        try {
            if (error) throw error;
            if (req.file) {
                const archivo = await fs.open(req.file.path, 'r');
                try {
                    const firma = req.file.filename.endsWith('.pdf') ? Buffer.from('%PDF-') : Buffer.from([0xff, 0xd8, 0xff]);
                    const cabecera = Buffer.alloc(firma.length);
                    const { bytesRead } = await archivo.read(cabecera, 0, firma.length, 0);
                    if (bytesRead !== firma.length || !cabecera.equals(firma)) {
                        throw Object.assign(new Error('El contenido del archivo no corresponde a un JPG o PDF válido.'), { status: 400 });
                    }
                } finally {
                    await archivo.close();
                }
            }
        } catch (error) {
            if (req.file) {
                await fs.unlink(req.file.path).catch(fallo => {
                    if (fallo.code !== 'ENOENT') console.error('No se pudo limpiar el adjunto rechazado:', fallo);
                });
            }
            const esLimite = error instanceof multer.MulterError;
            const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : error.status || (esLimite ? 400 : 500);
            const mensaje = error.code === 'LIMIT_FILE_SIZE' ? 'El archivo no puede superar los 10 MB.'
                : esLimite ? 'Adjunte un solo archivo JPG o PDF en el campo correspondiente.'
                : error.status ? error.message : 'No se pudo guardar el archivo. Intente nuevamente.';
            if (status === 500) console.error('Error al subir el adjunto del ingreso:', error);
            return res.status(status).json({ success: false, error: mensaje });
        }
        next();
    });
};
