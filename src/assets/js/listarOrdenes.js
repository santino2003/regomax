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
    
    // Cambiar el placeholder según el tipo de búsqueda seleccionado
    $('#searchType').on('change', function() {
        const searchType = $(this).val();
        let placeholder = 'Buscar...';
        
        switch(searchType) {
            case 'cliente':
                placeholder = 'Buscar por cliente...';
                break;
            case 'clienteFinal':
                placeholder = 'Buscar por cliente final...';
                break;
            case 'id':
                placeholder = 'Buscar por ID...';
                break;
            default:
                placeholder = 'Buscar en todos los campos...';
        }
        
        $('#searchInput').attr('placeholder', placeholder);
    });
    
    // Trigger inicial para establecer el placeholder correcto al cargar la página
    $('#searchType').trigger('change');
    
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
    
    // Manejar selección de todas las órdenes
    $('#selectAll').on('change', function() {
        const isChecked = $(this).prop('checked');
        $('.orden-checkbox').prop('checked', isChecked);
        updateExportSelectedButton();
    });
    
    // Manejar selección individual de órdenes
    $('.orden-checkbox').on('change', function() {
        // Si deseleccionamos una casilla, deseleccionamos "Seleccionar todo"
        if (!$(this).prop('checked')) {
            $('#selectAll').prop('checked', false);
        }
        // Si todas las casillas están seleccionadas, seleccionamos "Seleccionar todo"
        else if ($('.orden-checkbox:checked').length === $('.orden-checkbox').length) {
            $('#selectAll').prop('checked', true);
        }
        
        updateExportSelectedButton();
    });
    
    // Función para actualizar el estado del botón de exportar seleccionadas
    function updateExportSelectedButton() {
        const selectedCount = $('.orden-checkbox:checked').length;
        $('#btnExportExcelSelected').prop('disabled', selectedCount === 0);
        
        // Actualizar texto del botón para mostrar cantidad de órdenes seleccionadas
        if (selectedCount > 0) {
            $('#btnExportExcelSelected').html(`<i class="bi bi-file-earmark-excel me-1"></i>Exportar (${selectedCount})`);
        } else {
            $('#btnExportExcelSelected').html('<i class="bi bi-file-earmark-excel me-1"></i>Exportar Seleccionadas');
        }
    }
    
    // Manejar exportación de todas las órdenes a Excel
    $('#btnExportExcel').on('click', function() {
        // Obtener los parámetros de búsqueda y filtro actuales
        let url = new URL(window.location.href);
        const currentSearch = url.searchParams.get('search') || '';
        const currentEstado = url.searchParams.get('estado') || '';
        const searchType = url.searchParams.get('searchType') || '';
        
        // Construir la URL para la exportación
        let exportUrl = '/ordenes/exportar-excel';
        let params = [];
        
        if (currentSearch) {
            params.push(`search=${encodeURIComponent(currentSearch)}`);
        }
        
        if (currentEstado) {
            params.push(`estado=${encodeURIComponent(currentEstado)}`);
        }
        
        if (searchType) {
            params.push(`searchType=${encodeURIComponent(searchType)}`);
        }
        
        if (params.length > 0) {
            exportUrl += '?' + params.join('&');
        }
        
        // Redirigir a la URL de exportación
        window.location.href = exportUrl;
    });
    
    // Manejar exportación de órdenes seleccionadas a Excel
    $('#btnExportExcelSelected').on('click', function() {
        // Obtener IDs de las órdenes seleccionadas
        const selectedIds = [];
        $('.orden-checkbox:checked').each(function() {
            selectedIds.push($(this).val());
        });
        
        if (selectedIds.length === 0) {
            alert('Por favor seleccione al menos una orden para exportar.');
            return;
        }
        
        // Construir la URL para la exportación con IDs seleccionados
        let exportUrl = '/ordenes/exportar-excel?ids=' + selectedIds.join(',');
        
        // Redirigir a la URL de exportación
        window.location.href = exportUrl;
    });
});