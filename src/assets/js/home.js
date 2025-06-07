/**
 * Lógica de frontend para la página de home
 */

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
}

// Inicialización cuando el DOM está cargado
document.addEventListener('DOMContentLoaded', function() {
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/logout';
        });
    }
});