$(document).ready(function() {
    let productoIdToDelete = null;
    let productoNombreToDelete = '';

    // Manejar clic en el botón de eliminar
    $('.btn-delete').on('click', function() {
        productoIdToDelete = $(this).data('id');
        productoNombreToDelete = $(this).data('nombre');
        
        $('#productoNombre').text(productoNombreToDelete);
        $('#deleteModal').modal('show');
    });

    // Confirmar eliminación
    $('#confirmDelete').on('click', function() {
        if (productoIdToDelete) {
            eliminarProducto(productoIdToDelete);
        }
    });

    // Función para eliminar producto
    function eliminarProducto(id) {
        // Deshabilitar el botón mientras se procesa
        $('#confirmDelete').prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Eliminando...');

        $.ajax({
            url: `/api/productos/${id}`,
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            success: function(response) {
                if (response.success) {
                    // Cerrar modal
                    $('#deleteModal').modal('hide');
                    
                    // Mostrar mensaje de éxito
                    mostrarAlerta('Producto eliminado exitosamente', 'success');
                    
                    // Recargar la página después de 1.5 segundos
                    setTimeout(function() {
                        window.location.reload();
                    }, 1500);
                } else {
                    mostrarAlerta('Error al eliminar el producto: ' + response.message, 'danger');
                    $('#deleteModal').modal('hide');
                }
            },
            error: function(xhr) {
                let errorMsg = 'Error al eliminar el producto';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                } else if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                }
                
                mostrarAlerta(errorMsg, 'danger');
                $('#deleteModal').modal('hide');
            },
            complete: function() {
                // Re-habilitar el botón
                $('#confirmDelete').prop('disabled', false).html('Eliminar');
                productoIdToDelete = null;
                productoNombreToDelete = '';
            }
        });
    }

    // Función para mostrar alertas
    function mostrarAlerta(mensaje, tipo) {
        const alertHtml = `
            <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
                <i class="bi bi-${tipo === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
                ${mensaje}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        $('#alertContainer').html(alertHtml);
        
        // Auto-cerrar después de 5 segundos
        setTimeout(function() {
            $('.alert').alert('close');
        }, 5000);
    }
});
