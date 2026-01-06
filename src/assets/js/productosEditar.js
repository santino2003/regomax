$(document).ready(function() {
    const form = $('#formEditarProducto');
    const submitBtn = $('#submitBtn');
    const productoId = form.data('producto-id');
    
    // Array para almacenar los bienes asociados
    let bienesAsociados = [];
    
    // Modal instance
    const modalAgregarBien = new bootstrap.Modal(document.getElementById('modalAgregarBien'));
    
    // Cargar bienes existentes desde la tabla al array
    $('#tablaBienes tbody tr[data-bien-id]').each(function() {
        const row = $(this);
        const bienId = parseInt(row.data('bien-id'));
        const cantidad = parseFloat(row.find('.cantidad-bien').val());
        const nombre = row.find('td:first').text();
        const stockText = row.find('td:eq(1)').text();
        
        bienesAsociados.push({
            bien_id: bienId,
            cantidad: cantidad,
            nombre: nombre,
            stock: stockText
        });
    });
    
    // Abrir modal para agregar bien
    $('#btnAgregarBien').on('click', function() {
        $('#modalBienSelect').val('');
        $('#modalCantidad').val(1);
        modalAgregarBien.show();
    });
    
    // Guardar bien desde el modal
    $('#btnGuardarBien').on('click', function() {
        const bienId = $('#modalBienSelect').val();
        const cantidad = parseFloat($('#modalCantidad').val());
        
        if (!bienId || !cantidad || cantidad <= 0) {
            alert('Por favor complete todos los campos correctamente');
            return;
        }
        
        // Verificar si el bien ya está agregado
        if (bienesAsociados.some(b => b.bien_id == bienId)) {
            alert('Este bien ya está agregado');
            return;
        }
        
        // Obtener datos del bien seleccionado
        const option = $('#modalBienSelect option:selected');
        const bienNombre = option.data('nombre');
        const bienStock = option.data('stock');
        const bienUnidad = option.data('unidad');
        
        // Agregar al array
        bienesAsociados.push({
            bien_id: parseInt(bienId),
            cantidad: cantidad,
            nombre: bienNombre,
            stock: bienStock,
            unidad: bienUnidad
        });
        
        // Actualizar tabla
        actualizarTablaBienes();
        
        // Cerrar modal
        modalAgregarBien.hide();
    });
    
    // Eliminar bien de la tabla
    $(document).on('click', '.btn-eliminar-bien', function() {
        const row = $(this).closest('tr');
        const bienId = row.data('bien-id');
        
        // Eliminar del array
        bienesAsociados = bienesAsociados.filter(b => b.bien_id != bienId);
        
        // Actualizar tabla
        actualizarTablaBienes();
    });
    
    // Actualizar cantidad cuando cambia el input
    $(document).on('change', '.cantidad-bien', function() {
        const row = $(this).closest('tr');
        const bienId = row.data('bien-id');
        const nuevaCantidad = parseFloat($(this).val());
        
        // Actualizar en el array
        const bien = bienesAsociados.find(b => b.bien_id == bienId);
        if (bien) {
            bien.cantidad = nuevaCantidad;
        }
    });
    
    // Función para actualizar la tabla de bienes
    function actualizarTablaBienes() {
        const tbody = $('#tablaBienes tbody');
        tbody.empty();
        
        if (bienesAsociados.length === 0) {
            tbody.append(`
                <tr id="filaVaciaBienes">
                    <td colspan="4" class="text-center text-muted">
                        <i class="bi bi-inbox me-2"></i>No hay bienes asociados
                    </td>
                </tr>
            `);
        } else {
            bienesAsociados.forEach(bien => {
                const stockDisplay = typeof bien.stock === 'number' 
                    ? `${bien.stock} ${bien.unidad || ''}` 
                    : bien.stock;
                    
                tbody.append(`
                    <tr data-bien-id="${bien.bien_id}">
                        <td>${bien.nombre}</td>
                        <td>${stockDisplay}</td>
                        <td>
                            <input type="number" class="form-control form-control-sm cantidad-bien" 
                                   value="${bien.cantidad}" min="0.01" step="0.01">
                        </td>
                        <td>
                            <button type="button" class="btn btn-sm btn-danger btn-eliminar-bien">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `);
            });
        }
    }

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
            enStock: $('#enStock').is(':checked'),
            bienes: bienesAsociados.map(b => ({
                bien_id: b.bien_id,
                cantidad: b.cantidad
            }))
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
