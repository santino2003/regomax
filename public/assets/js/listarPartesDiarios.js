/**
 * listarPartesDiarios.js - Funcionalidades específicas para la página de listado de partes diarios
 */

document.addEventListener('DOMContentLoaded', function() {
    // Manejar el evento de eliminación de parte diario
    setupDeleteButtons();
    
    // Manejar los eventos de aprobación y rechazo
    setupApproveButtons();
    setupRejectButtons();
});

/**
 * Configurar los botones de eliminar parte diario
 */
function setupDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.btn-delete');
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const parteDiarioId = this.getAttribute('data-id');
            
            if (confirm('¿Está seguro que desea eliminar este parte diario?')) {
                // Deshabilitar el botón mientras se procesa
                this.disabled = true;
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
                
                // Enviar petición para eliminar el parte diario
                fetch(`/api/partes-diarios/${parteDiarioId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Parte diario eliminado exitosamente');
                        // Recargar la página para actualizar la lista
                        window.location.reload();
                    } else {
                        alert(`Error: ${data.message || 'No se pudo eliminar el parte diario'}`);
                        // Restaurar el botón
                        this.disabled = false;
                        this.innerHTML = '<i class="bi bi-trash"></i>';
                    }
                })
                .catch(error => {
                    console.error('Error al eliminar parte diario:', error);
                    alert('Error al eliminar parte diario. Intente nuevamente.');
                    // Restaurar el botón
                    this.disabled = false;
                    this.innerHTML = '<i class="bi bi-trash"></i>';
                });
            }
        });
    });
}

/**
 * Configurar los botones de aprobar parte diario
 */
function setupApproveButtons() {
    const approveButtons = document.querySelectorAll('.btn-aprobar');
    
    approveButtons.forEach(button => {
        button.addEventListener('click', function() {
            const parteDiarioId = this.getAttribute('data-id');
            
            if (confirm('¿Está seguro que desea APROBAR este parte diario?')) {
                // Deshabilitar el botón mientras se procesa
                this.disabled = true;
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
                
                // Enviar petición para aprobar el parte diario
                fetch(`/api/partes-diarios/${parteDiarioId}/aprobar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Parte diario aprobado exitosamente');
                        // Recargar la página para actualizar la lista
                        window.location.reload();
                    } else {
                        alert(`Error: ${data.message || 'No se pudo aprobar el parte diario'}`);
                        // Restaurar el botón
                        this.disabled = false;
                        this.innerHTML = '<i class="bi bi-check-circle"></i>';
                    }
                })
                .catch(error => {
                    console.error('Error al aprobar parte diario:', error);
                    alert('Error al aprobar parte diario. Intente nuevamente.');
                    // Restaurar el botón
                    this.disabled = false;
                    this.innerHTML = '<i class="bi bi-check-circle"></i>';
                });
            }
        });
    });
}

/**
 * Configurar los botones de rechazar parte diario
 */
function setupRejectButtons() {
    const rejectButtons = document.querySelectorAll('.btn-rechazar');
    
    rejectButtons.forEach(button => {
        button.addEventListener('click', function() {
            const parteDiarioId = this.getAttribute('data-id');
            
            if (confirm('¿Está seguro que desea RECHAZAR este parte diario?')) {
                // Deshabilitar el botón mientras se procesa
                this.disabled = true;
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
                
                // Enviar petición para rechazar el parte diario
                fetch(`/api/partes-diarios/${parteDiarioId}/rechazar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Parte diario rechazado exitosamente');
                        // Recargar la página para actualizar la lista
                        window.location.reload();
                    } else {
                        alert(`Error: ${data.message || 'No se pudo rechazar el parte diario'}`);
                        // Restaurar el botón
                        this.disabled = false;
                        this.innerHTML = '<i class="bi bi-x-circle"></i>';
                    }
                })
                .catch(error => {
                    console.error('Error al rechazar parte diario:', error);
                    alert('Error al rechazar parte diario. Intente nuevamente.');
                    // Restaurar el botón
                    this.disabled = false;
                    this.innerHTML = '<i class="bi bi-x-circle"></i>';
                });
            }
        });
    });
}