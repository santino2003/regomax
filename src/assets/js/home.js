/**
 * Lógica de frontend para la página de home
 */

// // Función para cerrar sesión
// function logout() {
//     localStorage.removeItem('token');
//     window.location.href = '/login';
// }

// Verificar autenticación cada vez que la página se muestra
function checkAuthentication() {
    if (!localStorage.getItem('token')) {
        window.location.replace('/login');
        return false;
    }
    return true;
}

// Inicialización cuando el DOM está cargado
document.addEventListener('DOMContentLoaded', function() {
    // Verificar token en localStorage
    if (!checkAuthentication()) return;
    
    // Configurar eventos
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('token'); // Eliminar el token del localStorage
            window.location.href = '/logout';
        });
    }
    
    // Prevenir navegación hacia atrás después del logout
    window.addEventListener('pageshow', function(event) {
        // Esto se dispara cuando la página se muestra, incluso desde el caché (botón atrás)
        checkAuthentication();
    });
    
    // Deshabilitar caché para esta página
    window.onunload = function(){};  // Esto ayuda a prevenir el cacheo en algunos navegadores
});

// Agregar protección contra el botón de retroceso
history.pushState(null, null, location.href);
window.onpopstate = function() {
    history.go(1);
    // Verificar autenticación cuando el usuario intenta ir atrás
    checkAuthentication();
};