$(document).ready(function() {
    // Inicializar DataTable
    let dataTable = $('#ordenesTable').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
        },
        responsive: true,
        order: [[2, 'desc']], // Ordenar por fecha descendente
        columnDefs: [
            { orderable: false, targets: 5 } // Desactivar ordenamiento en columna de acciones
        ]
    });

    // Filtros por estado
    $('.filter-btn').on('click', function() {
        $('.filter-btn').removeClass('active');
        $(this).addClass('active');
        const estado = $(this).data('filter');
        
        // Filtrar DataTable
        if (estado === 'todos') {
            dataTable.column(3).search('').draw();
        } else {
            // Busca el estado en la columna de estado (ajustar al formato que muestra)
            dataTable.column(3).search(estado.toUpperCase().replace('_', ' ')).draw();
        }
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
                    // Eliminar la fila de la tabla usando DataTable
                    dataTable.row(row).remove().draw();
                    
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

    // Búsqueda personalizada
    $('#searchForm').on('submit', function(e) {
        e.preventDefault();
        dataTable.search($('#searchInput').val()).draw();
    });
});