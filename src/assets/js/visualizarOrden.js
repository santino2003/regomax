/**
 * Funcionalidades para la vista de visualización de órdenes de venta
 */
document.addEventListener('DOMContentLoaded', function() {
    // Referencia al botón de eliminar y el modal
    const deleteButtons = document.querySelectorAll('.btn-delete');
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    
    // Variable para almacenar el ID de la orden a eliminar
    let ordenIdToDelete = null;
    
    // Manejar clic en botón de eliminar
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            ordenIdToDelete = this.getAttribute('data-id');
            deleteModal.show();
        });
    });
    
    // Manejar confirmación de eliminación
    confirmDeleteBtn.addEventListener('click', function() {
        if (ordenIdToDelete) {
            eliminarOrden(ordenIdToDelete);
        }
    });
    
    /**
     * Función para eliminar una orden mediante API
     * @param {string|number} id - ID de la orden a eliminar
     */
    function eliminarOrden(id) {
        // Mostrar indicador de carga
        confirmDeleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Eliminando...';
        confirmDeleteBtn.disabled = true;
        
        fetch(`/api/ordenes/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Éxito - redirigir a la lista de órdenes
                window.location.href = '/ordenes?deleted=true';
            } else {
                // Error - mostrar mensaje
                alert('Error al eliminar la orden: ' + data.message);
                deleteModal.hide();
                confirmDeleteBtn.innerHTML = 'Eliminar';
                confirmDeleteBtn.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error al eliminar la orden:', error);
            alert('Error al procesar la solicitud. Por favor, inténtelo de nuevo.');
            deleteModal.hide();
            confirmDeleteBtn.innerHTML = 'Eliminar';
            confirmDeleteBtn.disabled = false;
        });
    }
});