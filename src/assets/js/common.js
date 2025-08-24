/**
 * common.js - Funciones compartidas para todas las páginas del sistema
 */

// Función para evitar el caché y prevenir la navegación hacia atrás
function preventBackNavigation() {
    // Prevenir el uso del caché para esta página
    window.onpageshow = function(event) {
        if (event.persisted) {
            // Si la página se carga desde el caché (botón atrás)
            window.location.reload();
        }
    };
    
    // Deshabilitar el caché para todas las páginas protegidas
    window.addEventListener('load', function() {
        if (window.history.state === null) {
            window.history.replaceState({ nocache: true }, document.title, window.location.href);
        }
    });
    
    // Prevenir navegación hacia atrás después de logout
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = function() {
        window.history.pushState(null, null, window.location.href);
    };
    
    // Verificar la autenticación periódicamente
    setInterval(checkSessionStatus, 30000); // Verificar cada 30 segundos
}

// Función para verificar el estado de la sesión
async function checkSessionStatus() {
    try {
        const response = await fetch('/api/auth/check', {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        if (!response.ok) {
            // Si la sesión expiró o el token es inválido, redireccionar al login
            window.location.replace('/login');
        }
    } catch (error) {
        console.error('Error verificando estado de la sesión:', error);
    }
}

// Función para manejar el cierre de sesión
function setupLogout() {
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Mostrar un spinner mientras se procesa el logout
            const originalContent = logoutLink.innerHTML;
            logoutLink.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Cerrando sesión...';
            logoutLink.classList.add('disabled');
            
            // Hacer una petición al servidor para cerrar sesión
            fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'same-origin' // Importante para incluir cookies
            })
            .then(response => {
                if (response.ok) {
                    // Limpiar el caché antes de redireccionar
                    window.location.replace('/login?nocache=' + new Date().getTime());
                } else {
                    throw new Error('Error al cerrar sesión');
                }
            })
            .catch(error => {
                console.error('Error al cerrar sesión:', error);
                // Restaurar el botón en caso de error
                logoutLink.innerHTML = originalContent;
                logoutLink.classList.remove('disabled');
                alert('Error al cerrar sesión. Intente nuevamente.');
            });
        });
    }
}

// Función para configurar el enlace "Ver sitio" para que apunte a la URL actual
function setupViewSiteLink() {
    // Buscar el enlace "Ver sitio" (más compatible con todos los navegadores)
    const navLinks = document.querySelectorAll('.nav-item a.nav-link');
    let viewSiteLink = null;
    
    // Buscar el enlace que contiene el ícono de globo
    for (const link of navLinks) {
        if (link.querySelector('i.bi-globe')) {
            viewSiteLink = link;
            break;
        }
    }
    
    if (viewSiteLink) {
        // Obtener la URL actual completa
        const currentUrl = window.location.href;
        // Actualizar el href del enlace
        viewSiteLink.setAttribute('href', currentUrl);
        // Añadir título descriptivo
        viewSiteLink.setAttribute('title', 'Recargar esta página');
        
        // Añadir manejador de evento para recargar la página sin usar la caché
        viewSiteLink.addEventListener('click', function(e) {
            e.preventDefault();
            // Recargar la página sin usar la caché
            window.location.reload(true);
        });
    }
}

// Inicializar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    // Prevenir navegación hacia atrás
    preventBackNavigation();
    
    // Configurar el evento de logout
    setupLogout();
    
    // Configurar el enlace "Ver sitio"
    setupViewSiteLink();
});