/**
 * Lógica de frontend para la página de login
 */

// Función para mostrar mensajes de error
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    document.getElementById('successMessage').style.display = 'none';
}

// Función para mostrar mensajes de éxito
function showSuccess(message) {
    const successElement = document.getElementById('successMessage');
    successElement.textContent = message;
    successElement.style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
}

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('token');
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    showSuccess('Sesión cerrada correctamente');
}

// Inicialización cuando el DOM está cargado
document.addEventListener('DOMContentLoaded', function() {
    // Manejar el inicio de sesión
    document.getElementById('loginButton').addEventListener('click', async () => {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        // Validación simple
        if (!username || !password) {
            showError('Por favor ingrese usuario y contraseña');
            return;
        }

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

            // Mostrar mensaje de éxito
            showSuccess('Login exitoso');
            
            // Redirigir al usuario a la página principal después de un breve retraso
            setTimeout(() => {
                window.location.href = '/home';
            }, 1000);
            
        } catch (error) {
            showError(error.message);
        }
    });

    // Si existe el botón de logout, agregar el evento
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

    // Establecer interceptor para agregar el token a todas las solicitudes
    // Esta función se ejecuta cuando se carga la página
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