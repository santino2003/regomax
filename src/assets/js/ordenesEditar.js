// ordenesEditar.js - Lógica para agregar/eliminar productos en la edición de OV
$(document).ready(function() {
    let idx = $("#tablaProductos tbody tr").length;
    const ordenId = window.location.pathname.split('/').pop();
    
    // Abrir modal para agregar producto
    $('#btnAgregarProducto').on('click', function() {
        $('#nuevoProducto').val('');
        $('#nuevaCantidadInicial').val('');
        $('#nuevaCantidad').val('');
        $('#modalAgregarProducto').modal('show');
    });
    
    // Al cambiar la cantidad inicial en el modal, actualizar automáticamente la cantidad restante
    $('#nuevaCantidadInicial').on('input', function() {
        $('#nuevaCantidad').val($(this).val());
    });

    // Guardar producto del modal
    $('#btnGuardarProducto').on('click', function() {
        const producto = $('#nuevoProducto').val().trim();
        const productoTexto = $('#nuevoProducto option:selected').text().trim();
        const cantidadInicial = $('#nuevaCantidadInicial').val();
        const cantidad = cantidadInicial; // La cantidad restante siempre igual a la inicial para nuevos productos
        
        if (!producto || cantidadInicial === '') {
            alert('Complete todos los campos del producto');
            return;
        }
        
        // Eliminar fila vacía si existe
        $('#filaVacia').remove();
        
        // Obtener todas las opciones de producto disponibles para generar el select
        const opcionesProducto = $('#nuevoProducto').html();
        
        // Agregar fila a la tabla con un select precargado con la opción seleccionada
        $('#tablaProductos tbody').append(`
            <tr>
                <td>
                    <select name="productos[${idx}][producto]" class="form-control producto-select" required>
                        ${opcionesProducto}
                    </select>
                </td>
                <td><input type="number" step="0.01" name="productos[${idx}][cantidad_inicial]" class="form-control" value="${cantidadInicial}" required></td>
                <td><input type="number" step="0.01" name="productos[${idx}][cantidad]" class="form-control" value="${cantidad}" readonly></td>
                <td>
                    <button type="button" class="btn btn-danger btn-sm btn-eliminar-producto"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `);
        
        // Seleccionar el producto correcto en el select recién creado
        $(`select[name="productos[${idx}][producto]"]`).val(producto);
        
        // Guardar el valor inicial para la actualización de cantidad restante
        $(`input[name="productos[${idx}][cantidad_inicial]"]`).attr('data-last-value', cantidadInicial);
        
        idx++;
        $('#modalAgregarProducto').modal('hide');
    });

    // Eliminar producto de la tabla
    $(document).on('click', '.btn-eliminar-producto', function() {
        $(this).closest('tr').remove();
        // Si no quedan productos, mostrar fila vacía
        if ($('#tablaProductos tbody tr').length === 0) {
            $('#tablaProductos tbody').append(`
                <tr id="filaVacia">
                    <td colspan="4" class="text-center text-muted py-3">
                        <i class="bi bi-inbox me-2"></i>No hay productos cargados
                    </td>
                </tr>
            `);
        }
    });
    
    // Cuando se cambia la cantidad inicial, actualizar la cantidad restante manteniendo la proporción de despacho
    $(document).on('change', 'input[name$="[cantidad_inicial]"]', function() {
        const $row = $(this).closest('tr');
        const $cantidadRestante = $row.find('input[name$="[cantidad]"]');
        
        // Obtener valores actuales
        const cantidadInicialAnterior = parseFloat($(this).attr('data-last-value') || $(this).val());
        const cantidadRestanteAnterior = parseFloat($cantidadRestante.val());
        const nuevaCantidadInicial = parseFloat($(this).val());
        
        if (isNaN(cantidadInicialAnterior) || isNaN(nuevaCantidadInicial) || isNaN(cantidadRestanteAnterior)) {
            return;
        }
        
        // Calcular cuánto producto ha sido despachado
        const cantidadDespachada = Math.max(0, cantidadInicialAnterior - cantidadRestanteAnterior);
        
        // Calcular nueva cantidad restante (nueva inicial menos lo despachado)
        const nuevaCantidadRestante = Math.max(0, nuevaCantidadInicial - cantidadDespachada);
        
        // Actualizar el valor en el campo restante (readonly)
        $cantidadRestante.val(nuevaCantidadRestante);
        
        // Guardar el valor actual como referencia para el próximo cambio
        $(this).attr('data-last-value', nuevaCantidadInicial);
    });
    
    // Guardar el valor inicial para cada campo de cantidad inicial al cargar la página
    $('input[name$="[cantidad_inicial]"]').each(function() {
        $(this).attr('data-last-value', $(this).val());
    });
    
    // Procesar envío del formulario mediante AJAX
    $('#formEditarOrden').on('submit', function(e) {
        e.preventDefault();
        
        const formData = {};
        
        // Recopilar datos básicos
        formData.cliente = $('#cliente').val();
        formData.fecha = $('#fecha').val();
        formData.estado = $('#estado').val();
        formData.observaciones = $('#observaciones').val();
        
        // Recopilar productos
        formData.productos = [];
        $('#tablaProductos tbody tr:not(#filaVacia)').each(function() {
            const producto = $(this).find('select[name$="[producto]"]').val();
            const cantidadInicial = $(this).find('input[name$="[cantidad_inicial]"]').val();
            const cantidad = $(this).find('input[name$="[cantidad]"]').val();
            
            if (producto && cantidadInicial && cantidad) {
                formData.productos.push({
                    producto: producto,
                    cantidad_inicial: cantidadInicial,
                    cantidad: cantidad
                });
            }
        });
        
        // Mostrar indicador de carga
        const $btnSubmit = $(this).find('button[type="submit"]');
        $btnSubmit.prop('disabled', true).html('<i class="bi bi-hourglass-split me-2"></i>Guardando...');
        
        // Enviar mediante AJAX con método PUT
        $.ajax({
            url: `/api/ordenes/${ordenId}`,
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                if (response.success) {
                    // Mostrar mensaje de éxito
                    alert('Orden actualizada correctamente');
                    // Redireccionar a la vista de detalle
                    window.location.href = `/ordenes/${ordenId}`;
                } else {
                    alert('Error: ' + response.message);
                    $btnSubmit.prop('disabled', false).html('<i class="bi bi-save me-2"></i>Guardar cambios');
                }
            },
            error: function(xhr) {
                let errorMsg = 'Error al actualizar la orden';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg += ': ' + xhr.responseJSON.message;
                }
                alert(errorMsg);
                $btnSubmit.prop('disabled', false).html('<i class="bi bi-save me-2"></i>Guardar cambios');
            }
        });
    });
});