/**
 * Lógica de frontend para la página de login con Bootstrap 5
 */

// Verificar si el usuario ya está autenticado
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        window.location.replace('/home');
        return true;
    }
    return false;
}

// Función para mostrar mensajes de error
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.querySelector('span').textContent = message;
    errorElement.classList.remove('d-none');
    document.getElementById('successMessage').classList.add('d-none');
}

// Función para mostrar mensajes de éxito
function showSuccess(message) {
    const successElement = document.getElementById('successMessage');
    successElement.querySelector('span').textContent = message;
    successElement.classList.remove('d-none');
    document.getElementById('errorMessage').classList.add('d-none');
}

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('token');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    showSuccess('Sesión cerrada correctamente');
}

// Inicialización cuando el DOM está cargado
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario ya está autenticado
    if (checkAuthStatus()) {
        return; // Detener ejecución si ya está autenticado y redirigiendo
    }
    
    // Bootstrap form validation
    const form = document.getElementById('loginForm');
    
    // Manejar el envío del formulario
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        // Validar el formulario usando Bootstrap validation
        form.classList.add('was-validated');
        
        if (!form.checkValidity()) {
            return;
        }
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        // Deshabilitar el botón durante la solicitud
        const loginButton = document.getElementById('loginButton');
        const originalText = loginButton.innerHTML;
        loginButton.disabled = true;
        loginButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Iniciando sesión...';

        try {
            // Realizar la solicitud de login
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al iniciar sesión');
            }

            // Guardar datos del usuario en localStorage
            localStorage.setItem('token', data.token || 'dummy-token');
            
            // Mostrar mensaje de éxito
            showSuccess('Login exitoso! Redirigiendo...');
            
            // Redirigir al usuario a la página principal después de un breve retraso
            setTimeout(() => {
                window.location.replace('/home'); // Usamos replace en vez de href
            }, 1000);
            
        } catch (error) {
            showError(error.message);
            // Restaurar el botón
            loginButton.disabled = false;
            loginButton.innerHTML = originalText;
        } finally {
            // Si por alguna razón no se redirige, aseguramos que el botón vuelva a su estado normal
            setTimeout(() => {
                if (document.getElementById('loginButton')) {
                    loginButton.disabled = false;
                    loginButton.innerHTML = originalText;
                }
            }, 3000); // Tiempo de seguridad
        }
    });

    // Establecer interceptor para agregar el token a todas las solicitudes
    setAuthInterceptor();
});

// Función para configurar el interceptor de fetch
function setAuthInterceptor() {
    // Guardamos la referencia original de fetch
    const originalFetch = window.fetch;
    
    // Sobreescribimos fetch para incluir el token en todas las solicitudes
    window.fetch = async function(url, options = {}) {
        // Si hay un token en localStorage, lo incluimos en el header
        const token = localStorage.getItem('token');
        
        if (token) {
            // Creamos o extendemos los headers
            options.headers = options.headers || {};
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            };
        }
        
        // Llamamos al fetch original con los headers actualizados
        return originalFetch(url, options);
    };
}