/**
 * Lógica de frontend para la página de registro
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

// Función para recoger los permisos seleccionados
function getSelectedPermissions() {
    const permissions = {};
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        // Remover el prefijo "perm_" del ID para obtener el nombre real del permiso
        const permName = checkbox.id.replace('perm_', '');
        permissions[permName] = checkbox.checked;
    });
    
    return permissions;
}

// Inicialización cuando el DOM está cargado
document.addEventListener('DOMContentLoaded', function() {
    // Manejar el registro
    document.getElementById('registerButton').addEventListener('click', async () => {
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const role = document.getElementById('role').value;
        const permissions = getSelectedPermissions();
        
        // Validación simple
        if (!username || !email || !password) {
            showError('Por favor complete todos los campos obligatorios');
            return;
        }

        try {
            // Realizar la solicitud de registro
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    role,
                    permissions
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al registrar usuario');
            }

            // Mostrar mensaje de éxito
            showSuccess('Usuario registrado exitosamente');
            
            // Limpiar el formulario
            document.getElementById('username').value = '';
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
            document.getElementById('role').value = 'user';
            
            // Desmarcar todos los checkboxes
            document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            
            // Redirigir al login después de un breve retraso
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
            
        } catch (error) {
            showError(error.message);
        }
    });
});