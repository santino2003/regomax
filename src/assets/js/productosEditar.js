$(document).ready(function() {
    const form = $('#formEditarProducto');
    const submitBtn = $('#submitBtn');
    const productoId = form.data('producto-id');

    // Validación de Bootstrap
    form.on('submit', function(event) {
        event.preventDefault();
        event.stopPropagation();

        if (form[0].checkValidity() === false) {
            form.addClass('was-validated');
            return;
        }

        actualizarProducto();
    });

    function actualizarProducto() {
        // Deshabilitar botón mientras se procesa
        submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Actualizando...');

        const productoData = {
            nombre: $('#nombre').val().trim(),
            unidad: $('#unidad').val(),
            enStock: $('#enStock').is(':checked')
        };

        $.ajax({
            url: `/api/productos/${productoId}`,
            method: 'PUT',
            contentType: 'application/json',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            data: JSON.stringify(productoData),
            success: function(response) {
                if (response.success) {
                    mostrarAlerta('Producto actualizado exitosamente', 'success');
                    
                    // Redirigir al listado después de 1.5 segundos
                    setTimeout(function() {
                        window.location.href = '/productos';
                    }, 1500);
                } else {
                    mostrarAlerta('Error: ' + response.message, 'danger');
                    submitBtn.prop('disabled', false).html('<i class="bi bi-save me-2"></i>Actualizar Producto');
                }
            },
            error: function(xhr) {
                let errorMsg = 'Error al actualizar el producto';
                
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                } else if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                } else if (xhr.status === 401) {
                    errorMsg = 'No autorizado. Por favor, inicie sesión nuevamente.';
                } else if (xhr.status === 404) {
                    errorMsg = 'Producto no encontrado';
                }
                
                mostrarAlerta(errorMsg, 'danger');
                submitBtn.prop('disabled', false).html('<i class="bi bi-save me-2"></i>Actualizar Producto');
            }
        });
    }

    function mostrarAlerta(mensaje, tipo) {
        const alertHtml = `
            <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
                <i class="bi bi-${tipo === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
                ${mensaje}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        $('#alertPlaceholder').html(alertHtml);
        
        // Auto-cerrar después de 5 segundos
        setTimeout(function() {
            $('.alert').alert('close');
        }, 5000);
    }
});
