const path = require('path');
const fs = require('fs');

/**
 * Configuración centralizada para la gestión de archivos subidos
 */

// Obtener la ruta base de uploads desde variable de entorno o usar default
const UPLOADS_BASE_PATH = process.env.UPLOADS_PATH 
  ? path.resolve(process.env.UPLOADS_PATH) 
  : path.join(__dirname, '../../uploads');

/**
 * Obtiene la ruta completa para un subdirectorio de uploads
 * @param {string} subDir - Subdirectorio (ej: 'bienes', 'ordenes-compra')
 * @returns {string} - Ruta completa
 */
function getUploadPath(subDir) {
  return path.join(UPLOADS_BASE_PATH, subDir);
}

/**
 * Asegura que un directorio de uploads exista
 * @param {string} subDir - Subdirectorio a crear
 */
function ensureUploadDir(subDir) {
  const uploadPath = getUploadPath(subDir);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log(`📁 Directorio creado: ${uploadPath}`);
  }
}

/**
 * Inicializa todos los directorios de uploads necesarios
 */
function initializeUploadDirs() {
  const dirs = ['bienes', 'ordenes-compra'];
  
  console.log(`📂 Inicializando directorios de uploads en: ${UPLOADS_BASE_PATH}`);
  
  dirs.forEach(dir => {
    ensureUploadDir(dir);
  });
}

module.exports = {
  UPLOADS_BASE_PATH,
  getUploadPath,
  ensureUploadDir,
  initializeUploadDirs
};
