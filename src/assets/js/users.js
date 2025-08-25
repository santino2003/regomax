/**
 * Funcionalidad para la página de gestión de usuarios
 */
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const newUserModal = document.getElementById('newUserModal');
    const editUserModal = document.getElementById('editUserModal');
    const deleteUserModal = document.getElementById('deleteUserModal');
    const newUserForm = document.getElementById('newUserForm');
    const editUserForm = document.getElementById('editUserForm');
    const saveNewUserBtn = document.getElementById('saveNewUser');
    const saveEditUserBtn = document.getElementById('saveEditUser');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const selectAllPermissionsCheckbox = document.getElementById('selectAllPermissions');
    const editSelectAllPermissionsCheckbox = document.getElementById('editSelectAllPermissions');
    
    // Variables para el usuario a eliminar
    let userIdToDelete = null;
    
    /**
     * Maneja la selección de todos los permisos en el formulario de creación
     */
    if (selectAllPermissionsCheckbox) {
        selectAllPermissionsCheckbox.addEventListener('change', (e) => {
            const permissionCheckboxes = document.querySelectorAll('.permission-checkbox');
            const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
            
            permissionCheckboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
            
            categoryCheckboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
        });
    }
    
    /**
     * Maneja la selección de todos los permisos en el formulario de edición
     */
    if (editSelectAllPermissionsCheckbox) {
        editSelectAllPermissionsCheckbox.addEventListener('change', (e) => {
            const permissionCheckboxes = document.querySelectorAll('.edit-permission-checkbox');
            const categoryCheckboxes = document.querySelectorAll('.edit-category-checkbox');
            
            permissionCheckboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
            
            categoryCheckboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
        });
    }
    
    /**
     * Maneja la selección por categoría en el formulario de creación
     */
    document.querySelectorAll('.category-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const category = e.target.dataset.category;
            const permissionCheckboxes = document.querySelectorAll(`.permission-checkbox[data-category="${category}"]`);
            
            permissionCheckboxes.forEach(permCheckbox => {
                permCheckbox.checked = e.target.checked;
            });
            
            // Verificar si todos están seleccionados
            updateSelectAllCheckbox();
        });
    });
    
    /**
     * Maneja la selección por categoría en el formulario de edición
     */
    document.querySelectorAll('.edit-category-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const category = e.target.dataset.category;
            const permissionCheckboxes = document.querySelectorAll(`.edit-permission-checkbox[data-category="${category}"]`);
            
            permissionCheckboxes.forEach(permCheckbox => {
                permCheckbox.checked = e.target.checked;
            });
            
            // Verificar si todos están seleccionados
            updateEditSelectAllCheckbox();
        });
    });
    
    /**
     * Actualiza el estado del checkbox "Seleccionar todos" en creación
     */
    function updateSelectAllCheckbox() {
        const totalPermissions = document.querySelectorAll('.permission-checkbox').length;
        const checkedPermissions = document.querySelectorAll('.permission-checkbox:checked').length;
        
        // Actualizar el checkbox "Seleccionar todos"
        if (selectAllPermissionsCheckbox) {
            selectAllPermissionsCheckbox.checked = (totalPermissions === checkedPermissions);
        }
        
        // Actualizar los checkboxes de categoría
        document.querySelectorAll('.category-checkbox').forEach(categoryCheckbox => {
            const category = categoryCheckbox.dataset.category;
            const categoryPermissions = document.querySelectorAll(`.permission-checkbox[data-category="${category}"]`);
            const checkedCategoryPermissions = document.querySelectorAll(`.permission-checkbox[data-category="${category}"]:checked`);
            
            categoryCheckbox.checked = (categoryPermissions.length === checkedCategoryPermissions.length);
        });
    }
    
    /**
     * Actualiza el estado del checkbox "Seleccionar todos" en edición
     */
    function updateEditSelectAllCheckbox() {
        const totalPermissions = document.querySelectorAll('.edit-permission-checkbox').length;
        const checkedPermissions = document.querySelectorAll('.edit-permission-checkbox:checked').length;
        
        // Actualizar el checkbox "Seleccionar todos"
        if (editSelectAllPermissionsCheckbox) {
            editSelectAllPermissionsCheckbox.checked = (totalPermissions === checkedPermissions);
        }
        
        // Actualizar los checkboxes de categoría
        document.querySelectorAll('.edit-category-checkbox').forEach(categoryCheckbox => {
            const category = categoryCheckbox.dataset.category;
            const categoryPermissions = document.querySelectorAll(`.edit-permission-checkbox[data-category="${category}"]`);
            const checkedCategoryPermissions = document.querySelectorAll(`.edit-permission-checkbox[data-category="${category}"]:checked`);
            
            categoryCheckbox.checked = (categoryPermissions.length === checkedCategoryPermissions.length);
        });
    }
    
    /**
     * Actualiza los checkboxes cuando se selecciona/deselecciona un permiso individual
     */
    document.querySelectorAll('.permission-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectAllCheckbox);
    });
    
    /**
     * Actualiza los checkboxes cuando se selecciona/deselecciona un permiso individual en edición
     */
    document.querySelectorAll('.edit-permission-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateEditSelectAllCheckbox);
    });
    
    /**
     * Recopila los datos del formulario de nuevo usuario
     */
    function getNewUserFormData() {
        const formData = new FormData(newUserForm);
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),  // Corregido: estaba usando 'password' en lugar de 'email'
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            role: formData.get('role'),
            permissions: {}
        };
        
        // Recoger los permisos seleccionados
        document.querySelectorAll('.permission-checkbox:checked').forEach(checkbox => {
            const permissionName = checkbox.id;
            userData.permissions[permissionName] = true;
        });
        
        return userData;
    }
    
    /**
     * Recopila los datos del formulario de edición de usuario
     */
    function getEditUserFormData() {
        const formData = new FormData(editUserForm);
        const userData = {
            id: formData.get('id'),
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            role: formData.get('role'),
            permissions: {}
        };
        
        // Recoger los permisos seleccionados
        document.querySelectorAll('.edit-permission-checkbox:checked').forEach(checkbox => {
            // Eliminar el prefijo "edit_" del id
            const permissionName = checkbox.id.replace('edit_', '');
            userData.permissions[permissionName] = true;
        });
        
        return userData;
    }
    
    /**
     * Valida el formulario de nuevo usuario
     */
    function validateNewUserForm(userData) {
        // Validar campos obligatorios
        if (!userData.username || !userData.email || !userData.password) {
            showAlert('Por favor complete todos los campos obligatorios', 'danger');
            return false;
        }
        
        // Validar que las contraseñas coincidan
        if (userData.password !== userData.confirmPassword) {
            document.getElementById('confirmPassword').classList.add('is-invalid');
            document.getElementById('passwordMismatch').style.display = 'block';
            return false;
        } else {
            document.getElementById('confirmPassword').classList.remove('is-invalid');
            document.getElementById('passwordMismatch').style.display = 'none';
        }
        
        return true;
    }
    
    /**
     * Crea un alerta en la parte superior de la página
     */
    function showAlert(message, type = 'success') {
        const alertContainer = document.createElement('div');
        alertContainer.className = `alert alert-${type} alert-dismissible fade show`;
        alertContainer.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Insertar la alerta al principio del contenedor
        const container = document.querySelector('.container');
        container.insertBefore(alertContainer, container.firstChild);
        
        // Eliminar la alerta después de 5 segundos
        setTimeout(() => {
            if (alertContainer && alertContainer.parentNode) {
                alertContainer.parentNode.removeChild(alertContainer);
            }
        }, 5000);
    }
    
    /**
     * Guarda un nuevo usuario
     */
    if (saveNewUserBtn) {
        saveNewUserBtn.addEventListener('click', async () => {
            const userData = getNewUserFormData();
            
            // Validar formulario
            if (!validateNewUserForm(userData)) {
                return;
            }
            
            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Cerrar el modal y recargar la página
                    const modalInstance = bootstrap.Modal.getInstance(newUserModal);
                    modalInstance.hide();
                    showAlert('Usuario creado exitosamente', 'success');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showAlert(`Error: ${result.message}`, 'danger');
                }
            } catch (error) {
                console.error('Error al crear usuario:', error);
                showAlert('Error al crear usuario. Intente nuevamente.', 'danger');
            }
        });
    }
    
    /**
     * Establece los datos para editar un usuario
     */
    document.querySelectorAll('.edit-user-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Obtener datos del botón
            const userId = button.dataset.id;
            const username = button.dataset.username;
            const email = button.dataset.email;
            const role = button.dataset.role;
            let permissions = {};
            
            try {
                permissions = JSON.parse(button.dataset.permissions);
            } catch (e) {
                console.error('Error al parsear permisos:', e);
                permissions = {};
            }
            
            // Establecer los valores en el formulario
            document.getElementById('editUserId').value = userId;
            document.getElementById('editUsername').value = username;
            document.getElementById('editEmail').value = email;
            document.getElementById('editRole').value = role;
            document.getElementById('editPassword').value = '';
            
            // Resetear todos los checkboxes
            document.querySelectorAll('.edit-permission-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });
            
            // Marcar los permisos del usuario
            for (const [permission, enabled] of Object.entries(permissions)) {
                const checkbox = document.getElementById(`edit_${permission}`);
                if (checkbox && enabled === true) {
                    checkbox.checked = true;
                }
            }
            
            // Actualizar el estado de los checkboxes de categoría
            updateEditSelectAllCheckbox();
        });
    });
    
    /**
     * Guarda los cambios de un usuario
     */
    if (saveEditUserBtn) {
        saveEditUserBtn.addEventListener('click', async () => {
            const userData = getEditUserFormData();
            
            try {
                const response = await fetch(`/api/users/${userData.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Cerrar el modal y recargar la página
                    const modalInstance = bootstrap.Modal.getInstance(editUserModal);
                    modalInstance.hide();
                    showAlert('Usuario actualizado exitosamente', 'success');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showAlert(`Error: ${result.message}`, 'danger');
                }
            } catch (error) {
                console.error('Error al actualizar usuario:', error);
                showAlert('Error al actualizar usuario. Intente nuevamente.', 'danger');
            }
        });
    }
    
    /**
     * Prepara la eliminación de un usuario
     */
    document.querySelectorAll('.delete-user-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Obtener datos del usuario
            userIdToDelete = button.dataset.id;
            const username = button.dataset.username;
            
            // Actualizar el modal de confirmación
            document.getElementById('deleteUserName').textContent = username;
            
            // Mostrar el modal de confirmación
            const deleteModal = new bootstrap.Modal(deleteUserModal);
            deleteModal.show();
        });
    });
    
    /**
     * Confirma la eliminación de un usuario
     */
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!userIdToDelete) return;
            
            try {
                const response = await fetch(`/api/users/${userIdToDelete}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Cerrar el modal y recargar la página
                    const modalInstance = bootstrap.Modal.getInstance(deleteUserModal);
                    modalInstance.hide();
                    showAlert('Usuario eliminado exitosamente', 'success');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showAlert(`Error: ${result.message}`, 'danger');
                }
            } catch (error) {
                console.error('Error al eliminar usuario:', error);
                showAlert('Error al eliminar usuario. Intente nuevamente.', 'danger');
            }
            
            // Resetear el ID
            userIdToDelete = null;
        });
    }
});