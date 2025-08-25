$(document).ready(function() {
    // Obtener los parámetros de la URL para mantener el estado de los filtros
    const urlParams = new URLSearchParams(window.location.search);
    
    // Obtener los valores de los filtros desde la URL
    const producto = urlParams.get('producto') || '';
    const codigo = urlParams.get('codigo') || '';
    const precinto = urlParams.get('precinto') || '';
    
    // Establecer los valores en los campos del formulario
    document.getElementById('producto').value = producto;
    document.getElementById('codigo').value = codigo;
    document.getElementById('precinto').value = precinto;
    
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
    
    // Asegurarse de que los parámetros de filtro estén en todas las URLs de paginación
    const actualizarEnlacesPaginacion = () => {
        // Obtener los valores actuales de filtros
        const producto = document.getElementById('producto').value;
        const codigo = document.getElementById('codigo').value;
        const precinto = document.getElementById('precinto').value;
        
        // Seleccionar todos los enlaces de paginación
        const enlacesPaginacion = document.querySelectorAll('.pagination .page-link');
        
        // Actualizar cada enlace para incluir los filtros actuales
        enlacesPaginacion.forEach(enlace => {
            let url = new URL(enlace.href);
            
            // Limpiar parámetros existentes de filtros para evitar duplicados
            url.searchParams.delete('producto');
            url.searchParams.delete('codigo');
            url.searchParams.delete('precinto');
            
            // Añadir solo los filtros que tengan valor
            if (producto) url.searchParams.append('producto', producto);
            if (codigo) url.searchParams.append('codigo', codigo);
            if (precinto) url.searchParams.append('precinto', precinto);
            
            // Actualizar el href del enlace
            enlace.href = url.toString();
        });
    };
    
    // Cuando cambie cualquier campo de filtro, actualizar enlaces de paginación
    $('#producto, #codigo, #precinto').on('change', actualizarEnlacesPaginacion);
    
    // Cuando se envíe el formulario, actualizar enlaces antes de enviarlo
    $('#filtrosForm').on('submit', function() {
        actualizarEnlacesPaginacion();
    });
    
    // Actualizar enlaces de paginación al cargar la página
    actualizarEnlacesPaginacion();
    
    // Manejar el evento de limpieza de filtros
    $('.btn-outline-secondary').on('click', function(e) {
        e.preventDefault();
        window.location.href = '/bolsones';
    });
    
    // Actualizar también los enlaces del selector de límite de página
    $('select[name="limit"]').on('change', function() {
        // Obtener los filtros actuales
        const producto = document.getElementById('producto').value;
        const codigo = document.getElementById('codigo').value;
        const precinto = document.getElementById('precinto').value;
        
        // Obtener el formulario y añadir los filtros como campos ocultos
        const form = $(this).closest('form');
        
        // Eliminar filtros existentes para evitar duplicados
        form.find('input[name="producto"], input[name="codigo"], input[name="precinto"]').remove();
        
        // Añadir los filtros como campos ocultos
        if (producto) {
            form.append(`<input type="hidden" name="producto" value="${producto}">`);
        }
        if (codigo) {
            form.append(`<input type="hidden" name="codigo" value="${codigo}">`);
        }
        if (precinto) {
            form.append(`<input type="hidden" name="precinto" value="${precinto}">`);
        }
    });
});