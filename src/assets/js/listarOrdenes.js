$(document).ready(function() {
    // Manejar los filtros por estado
    $('.filter-btn').on('click', function() {
        $('.filter-btn').removeClass('active');
        $(this).addClass('active');
        const estado = $(this).data('filter');
        
        // Redirigir a la misma página con el filtro como parámetro de consulta
        let url = new URL(window.location.href);
        if (estado === 'todos') {
            url.searchParams.delete('estado');
        } else {
            url.searchParams.set('estado', estado);
        }
        url.searchParams.set('page', '1'); // Resetear a la primera página al filtrar
        window.location.href = url.toString();
    });
    
    // Manejar eliminación de órdenes
    $('.btn-delete').on('click', function() {
        const id = $(this).data('id');
        const row = $(this).closest('tr');
        const $button = $(this); // Guardar referencia al botón
        
        if(confirm('¿Está seguro que desea eliminar esta orden?')) {
            // Deshabilitar el botón durante la operación
            $button.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i>');
            
            fetch(`/api/ordenes/${id}`, {
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
                    alert('Orden eliminada correctamente');
                } else {
                    alert('Error: ' + data.message);
                    // Rehabilitar el botón
                    $button.prop('disabled', false).html('<i class="bi bi-trash"></i>');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error al eliminar la orden');
                // Rehabilitar el botón
                $button.prop('disabled', false).html('<i class="bi bi-trash"></i>');
            });
        }   
    });
    
    // Búsqueda personalizada ya maneja el formulario directamente a través del método GET
    // No necesita código JavaScript adicional para la búsqueda
});