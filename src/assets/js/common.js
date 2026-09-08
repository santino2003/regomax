/**
 * common.js - Funciones compartidas para todas las páginas del sistema
 */

// Alert helper for pages that don't define their own showAlert.
if (typeof window.showAlert !== 'function') {
    window.showAlert = function(message, type = 'success') {
        const placeholder = document.getElementById('alertPlaceholder');
        if (!placeholder) {
            alert(message);
            return;
        }

        placeholder.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;

        if (type === 'success') {
            setTimeout(() => {
                const alertEl = placeholder.querySelector('.alert');
                if (!alertEl) {
                    return;
                }
                if (window.bootstrap && window.bootstrap.Alert) {
                    const bsAlert = new window.bootstrap.Alert(alertEl);
                    bsAlert.close();
                } else {
                    alertEl.remove();
                }
            }, 5000);
        }
    };
}

// Función para evitar el caché y prevenir la navegación hacia atrás
function preventBackNavigation() {
    // Algunas pantallas conservan su estado en la URL y necesitan permitir
    // la navegación normal con Atrás/Adelante.
    const statefulWarehousePaths = [
        '/familias', '/categorias', '/centros-costo', '/unidades-medida',
        '/almacenes', '/bienes', '/kits', '/salida', '/config-alertas-stock', '/ajuste-inventario',
        '/users', '/historial', '/ordenes', '/despachos', '/nfu', '/clientes-nfu',
        '/productos', '/bolsones', '/bolsones-despachados', '/partes-diarios',
        '/reporte-general', '/reporte-ar', '/dias-habiles', '/fallas'
    ];
    const allowBackNavigation = document.body.dataset.allowBackNavigation === 'true'
        || statefulWarehousePaths.some((path) => window.location.pathname === path || window.location.pathname.startsWith(`${path}/`));

    // En las pantallas con estado en URL se permite restaurar la página desde
    // el back/forward cache. Así Volver no repite el render ni las consultas.
    window.onpageshow = function(event) {
        if (event.persisted && !allowBackNavigation) {
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
    
    if (!allowBackNavigation) {
        window.history.pushState(null, null, window.location.href);
        window.onpopstate = function() {
            window.history.pushState(null, null, window.location.href);
        };
    }
    
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
                    window.location.replace('/login?nocache=' + Date.now()); // Usamos Date.now() que es más eficiente que new Date().getTime()
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

// Conserva la URL completa del listado (página y filtros) al navegar a
// pantallas relacionadas. Las vistas activan este comportamiento con data-*.
function setupListStateNavigation() {
    const warehouseModules = [
        { listPath: '/familias', prefixes: ['/familias'] },
        { listPath: '/categorias', prefixes: ['/categorias'] },
        { listPath: '/centros-costo/listar', prefixes: ['/centros-costo'] },
        { listPath: '/unidades-medida', prefixes: ['/unidades-medida'] },
        { listPath: '/almacenes', prefixes: ['/almacenes'] },
        { listPath: '/bienes', prefixes: ['/bienes', '/salida', '/config-alertas-stock'] },
        { listPath: '/kits', prefixes: ['/kits'] },
        { listPath: '/ajuste-inventario/historial', prefixes: ['/ajuste-inventario'] },
        { listPath: '/users', prefixes: ['/users'] },
        { listPath: '/historial', prefixes: ['/historial'] },
        { listPath: '/ordenes', prefixes: ['/ordenes'] },
        { listPath: '/nfu', prefixes: ['/nfu'] },
        { listPath: '/clientes-nfu', prefixes: ['/clientes-nfu'] },
        { listPath: '/productos', prefixes: ['/productos'] },
        { listPath: '/bolsones', prefixes: ['/bolsones'] },
        { listPath: '/bolsones-despachados', prefixes: ['/bolsones-despachados'] },
        {
            listPath: '/partes-diarios',
            prefixes: ['/partes-diarios'],
            isListPath: (path) => path === '/partes-diarios' || path.startsWith('/partes-diarios/estado/')
        },
        { listPath: '/reporte-general', prefixes: ['/reporte-general', '/reporte-ar'] },
        { listPath: '/dias-habiles', prefixes: ['/dias-habiles'] },
        { listPath: '/fallas', prefixes: ['/fallas'] }
    ];
    const inferredModule = warehouseModules.find((module) =>
        module.prefixes.some((prefix) => window.location.pathname === prefix || window.location.pathname.startsWith(`${prefix}/`))
    );
    const isCurrentListPath = inferredModule
        && (inferredModule.isListPath
            ? inferredModule.isListPath(window.location.pathname)
            : window.location.pathname === inferredModule.listPath);
    const listPath = document.body.dataset.stateListPath
        || (isCurrentListPath ? window.location.pathname : null);
    const returnListPath = document.body.dataset.returnListPath
        || (inferredModule && !isCurrentListPath ? inferredModule.listPath : null);

    if (listPath && window.location.pathname === listPath) {
        const returnTo = window.location.pathname + window.location.search;
        const links = document.querySelectorAll('[data-preserve-list-state], a[href]');
        links.forEach((link) => {
            const url = new URL(link.href, window.location.origin);
            const belongsToModule = inferredModule?.prefixes.some((prefix) =>
                url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
            );
            if (!link.hasAttribute('data-preserve-list-state')
                && (!belongsToModule || url.pathname === listPath)) return;
            url.searchParams.set('returnTo', returnTo);
            link.href = url.pathname + url.search;
        });
    }

    if (returnListPath) {
        const requestedReturnTo = new URLSearchParams(window.location.search).get('returnTo');
        let requestedReturnPath = null;
        let requestedReturnOrigin = null;
        try {
            const requestedUrl = requestedReturnTo
                ? new URL(requestedReturnTo, window.location.origin)
                : null;
            requestedReturnPath = requestedUrl?.pathname || null;
            requestedReturnOrigin = requestedUrl?.origin || null;
        } catch (error) {
            requestedReturnPath = null;
        }
        const validReturnTo = requestedReturnTo
            && requestedReturnOrigin === window.location.origin
            && requestedReturnTo.startsWith('/')
            && !requestedReturnTo.startsWith('//')
            && (inferredModule?.isListPath
                ? inferredModule.isListPath(requestedReturnPath)
                : requestedReturnPath === returnListPath);
        const returnTo = validReturnTo ? requestedReturnTo : returnListPath;
        window.listReturnTo = returnTo;

        document.querySelectorAll('[data-return-to-list]').forEach((link) => {
            link.href = returnTo;
        });
        document.querySelectorAll('[data-preserve-return-to]').forEach((link) => {
            const url = new URL(link.href, window.location.origin);
            url.searchParams.set('returnTo', returnTo);
            link.href = url.pathname + url.search;
        });

        if (inferredModule) {
            document.querySelectorAll('a[href]').forEach((link) => {
                const url = new URL(link.href, window.location.origin);
                const belongsToModule = inferredModule.prefixes.some((prefix) =>
                    url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
                );
                if (!belongsToModule) return;
                if (url.pathname === returnListPath) {
                    link.href = returnTo;
                    return;
                }
                url.searchParams.set('returnTo', returnTo);
                link.href = url.pathname + url.search;
            });
        }

        // Si el usuario llegó directamente desde ese listado, Volver usa la
        // entrada previa del historial para recuperar el DOM ya renderizado.
        let previousUrl = null;
        try {
            previousUrl = document.referrer ? new URL(document.referrer) : null;
        } catch (error) {
            previousUrl = null;
        }
        if (previousUrl
            && previousUrl.origin === window.location.origin
            && previousUrl.pathname + previousUrl.search === returnTo) {
            document.querySelectorAll('a[href]').forEach((link) => {
                const url = new URL(link.href, window.location.origin);
                if (url.pathname + url.search !== returnTo) return;
                link.addEventListener('click', function(event) {
                    event.preventDefault();
                    window.history.back();
                });
            });
        }
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

    setupListStateNavigation();
});
