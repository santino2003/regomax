/**
 * Lógica de frontend para la página de login con Bootstrap 5
 */

// Verificar si el usuario ya está autenticado mediante cookies
function checkAuthStatus() {
    // No necesitamos verificar localStorage porque usamos cookies HttpOnly
    // Las cookies son manejadas por el servidor automáticamente
    return false; // Permitir que el formulario se muestre
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
    // Hacer una petición al servidor para eliminar la cookie
    fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include' // 'include' permite enviar cookies en cross-origin
    })
    .then(() => {
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        showSuccess('Sesión cerrada correctamente');
        setTimeout(() => {
            window.location.replace('/login');
        }, 1000);
    })
    .catch(error => {
        console.error('Error al cerrar sesión:', error);
    });
}

// Inicialización cuando el DOM está cargado
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario ya está autenticado
    if (checkAuthStatus()) {
        return; // Detener ejecución si ya está autenticado y redirigiendo
    }
    
    // Bootstrap form validation
    const form = document.getElementById('loginForm');
    
    let captchaRequired = false;
    let widgetId;
    let siteKey = '';
    let loadingCaptcha;
    async function showCaptcha() {
        document.getElementById('captchaContainer').classList.remove('d-none');
        if (widgetId !== undefined) return;
        if (!siteKey) throw new Error('Falta configurar reCAPTCHA en el servidor.');
        if (!loadingCaptcha) {
            loadingCaptcha = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                const timer = setTimeout(() => {
                    reject(new Error('reCAPTCHA tardó demasiado en cargar. Recargá la página.'));
                }, 15000);
                window.onLoginCaptchaLoaded = () => {
                    clearTimeout(timer);
                    resolve();
                };
                script.src = 'https://www.google.com/recaptcha/api.js?onload=onLoginCaptchaLoaded&render=explicit&hl=es';
                script.async = true;
                script.defer = true;
                script.onerror = () => {
                    clearTimeout(timer);
                    reject(new Error('No se pudo cargar reCAPTCHA. Recargá la página.'));
                };
                document.head.appendChild(script);
            });
        }
        await loadingCaptcha;
        if (widgetId === undefined) {
            widgetId = grecaptcha.render('loginCaptcha', {
                sitekey: siteKey,
                size: 'compact',
                'expired-callback': () => showError('El reCAPTCHA venció. Completalo nuevamente.'),
                'error-callback': () => showError('Error de conexión con reCAPTCHA. Intentá nuevamente.')
            });
        }
    }
    const configReady = fetch('/api/auth/captcha-config', { credentials: 'include', cache: 'no-store' })
        .then(async response => {
            if (!response.ok) throw new Error('No se pudo cargar la protección del login. Recargá la página.');
            const config = await response.json();
            siteKey = config.siteKey;
            captchaRequired = config.captchaRequired;
            if (captchaRequired) await showCaptcha();
            return true;
        }).catch(error => { showError(error.message); return false; });

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
        const password = document.getElementById('password').value;
        
        // Deshabilitar el botón durante la solicitud
        const loginButton = document.getElementById('loginButton');
        const originalText = loginButton.innerHTML;
        loginButton.disabled = true;
        loginButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Iniciando sesión...';

        try {
            if (!await configReady) throw new Error('No se pudo cargar la protección del login. Recargá la página.');
            const recaptchaToken = widgetId !== undefined ? grecaptcha.getResponse(widgetId) : '';
            if (captchaRequired && !recaptchaToken) throw new Error('Completá el reCAPTCHA para continuar.');
            // Realizar la solicitud de login incluyendo las cookies
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                credentials: 'include', // 'include' permite enviar cookies en cross-origin
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, recaptchaToken })
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.captchaRequired) {
                    captchaRequired = true;
                    await showCaptcha();
                }
                throw new Error(data.message || 'Error al iniciar sesión');
            }

            // No necesitamos guardar el token en localStorage porque ya está en cookies
            // Las cookies HttpOnly son manejadas automáticamente por el navegador
            
            // Mostrar mensaje de éxito
            showSuccess('Login exitoso! Redirigiendo...');
            
            // Redirigir al usuario a la página principal después de un breve retraso
            setTimeout(() => {
                window.location.replace('/home'); // Usamos replace en vez de href
            }, 1000);
            
        } catch (error) {
            if (widgetId !== undefined) grecaptcha.reset(widgetId);
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
});