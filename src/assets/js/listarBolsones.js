$(document).ready(function() {
    // Manejar exportación de bolsones
    $('#exportar-bolsones').on('click', function() {
        const $button = $(this);
        
        // Cambiar el estado del botón para mostrar que está procesando
        $button.prop('disabled', true)
               .html('<i class="bi bi-hourglass-split me-2"></i>Exportando...');
        
        // Redirigir a la ruta de exportación
        window.location.href = '/bolsones/exportar';
        
        // Restaurar el botón después de un tiempo
        setTimeout(function() {
            $button.prop('disabled', false)
                  .html('<i class="bi bi-file-earmark-excel me-2"></i>Exportar');
        }, 3000);
    });

    // Manejar eliminación de bolsones
    $('.btn-delete').on('click', function() {
        const id = $(this).data('id');
        const row = $(this).closest('tr');
        const $button = $(this); // Guardar referencia al botón
        
        if(confirm('¿Está seguro que desea eliminar este bolsón?')) {
            // Deshabilitar el botón durante la operación
            $button.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i>');
            
            fetch(`/api/bolsones/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Eliminar la fila de la tabla
                    row.fadeOut(300, function() {
                        $(this).remove();
                        
                        // Si era el último elemento de la página, recargar la página
                        if ($('tbody tr').length === 0) {
                            window.location.reload();
                        }
                    });
                    
                    // Mostrar mensaje de éxito
                    alert('Bolsón eliminado correctamente');
                } else {
                    alert('Error: ' + data.message);
                    // Rehabilitar el botón
                    $button.prop('disabled', false).html('<i class="bi bi-trash"></i>');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error al eliminar el bolsón');
                // Rehabilitar el botón
                $button.prop('disabled', false).html('<i class="bi bi-trash"></i>');
            });
        }   
    });
});