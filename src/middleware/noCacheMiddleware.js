/**
 * Middleware para prevenir el caché de páginas protegidas
 * Evita que los usuarios puedan ver contenido después de cerrar sesión usando el botón atrás
 */
function noCacheMiddleware(req, res, next) {
    // Establecer cabeceras para evitar el caché
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    next();
}

module.exports = noCacheMiddleware;