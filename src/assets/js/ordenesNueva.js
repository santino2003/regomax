$(document).ready(function() {
    // Establecer fecha actual por defecto
    const today = new Date().toISOString().split('T')[0];
    $('#fecha').val(today);
    
    // Array para almacenar productos de la orden
    let productos = [];
    let contadorProductos = 0;
    
    // Mostrar modal para agregar producto
    $('#btnAgregarProducto').click(function() {
        // Limpiar formulario del modal
        $('#formProducto')[0].reset();
        $('#productoModal').modal('show');
    });
    
    // Confirmar agregar producto
    $('#btnConfirmarProducto').click(function() {
        // Validar formulario
        const form = $('#formProducto')[0];
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        // Obtener datos del producto (sin precio)
        const nombreProducto = $('#nombreProducto').val().trim();
        const cantidad = parseFloat($('#cantidad').val());
        
        if (!nombreProducto || !cantidad) {
            return;
        }
        
        // Generar ID único para la fila
        contadorProductos++;
        const filaId = `producto-${contadorProductos}`;
        
        // Eliminar mensaje de vacío si es el primer producto
        if ($('#filaVacia').is(':visible')) {
            $('#filaVacia').hide();
        }
        
        // Agregar fila a la tabla (eliminando columnas de precio)
        $('#tablaProductos tbody').append(`
            <tr id="${filaId}">
                <td>${nombreProducto}</td>
                <td class="text-center">${cantidad}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-producto"
                            data-fila="${filaId}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `);
        
        // Guardar en el array (sin precio)
        productos.push({
            nombre: nombreProducto,
            cantidad: cantidad,
            filaId: filaId
        });
        
        // Cerrar modal
        $('#productoModal').modal('hide');
    });
    
    // Eliminar producto
    $(document).on('click', '.btn-eliminar-producto', function() {
        const filaId = $(this).data('fila');
        
        // Eliminar del array
        productos = productos.filter(p => p.filaId !== filaId);
        
        // Eliminar fila
        $(`#${filaId}`).remove();
        
        // Si no hay productos, mostrar mensaje
        if (productos.length === 0) {
            $('#filaVacia').show();
        }
    });
    
    // Función para mostrar alertas
    function showAlert(message, type = 'success') {
        const alertContent = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        $('#alertContainer').html(alertContent);
        
        // Scroll hacia la alerta
        $('html, body').animate({
            scrollTop: $('#alertContainer').offset().top - 100
        }, 200);
    }
    
    // Enviar formulario
    $('#formNuevaOrden').on('submit', function(e) {
        e.preventDefault();
        
        // Validar que haya al menos un producto
        if (productos.length === 0) {
            showAlert('Debe agregar al menos un producto a la orden', 'danger');
            return;
        }
        
        // Validar formulario
        if (!this.checkValidity()) {
            e.stopPropagation();
            $(this).addClass('was-validated');
            return;
        }
        
        // Preparar datos para enviar - Adaptando al formato que espera el backend
        const formData = {
            cliente: $('#cliente').val(),
            clienteFinal: $('#cliente_final').val(),
            codigoDeVenta: $('#codigo_venta').val(),
            fecha: $('#fecha').val(),
            observaciones: $('#observaciones').val(),
            productosYCantidades: productos.map(p => ({
                producto: p.nombre,
                cantidad: p.cantidad
            }))
            // El responsable se asigna en el servidor
        };
        
        // Deshabilitar botón durante el envío
        const $btnGuardar = $('#btnGuardar');
        $btnGuardar.prop('disabled', true).html('<i class="bi bi-hourglass-split me-2"></i>Procesando...');
        
        // Enviar datos al servidor
        fetch('/api/ordenes/nueva', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            // Verificar si la respuesta es válida
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            } else {
                // Si no es JSON, obtener el texto y lanzar un error
                return response.text().then(text => {
                    console.error('Respuesta no-JSON recibida:', text);
                    throw new Error('La respuesta del servidor no es JSON válido');
                });
            }
        })
        .then(data => {
            if (data.success) {
                // Mostrar el código de venta en formato OV-X usando el ID
                showAlert(`¡Orden creada exitosamente! Código: OV-${data.data}`);
                
                // Limpiar formulario después de 2 segundos
                setTimeout(() => {
                    $('#formNuevaOrden')[0].reset();
                    productos = [];
                    $('#tablaProductos tbody').html(`
                        <tr id="filaVacia">
                            <td colspan="3" class="text-center text-muted py-3">
                                <i class="bi bi-inbox me-2"></i>No hay productos agregados
                            </td>
                        </tr>
                    `);
                    $('#fecha').val(today);
                    $(this).removeClass('was-validated');
                    
                    // Redirigir a la lista de órdenes después de 3 segundos
                    setTimeout(() => {
                        window.location.href = '/ordenes';
                    }, 1000);
                    
                }, 2000);
                
            } else {
                // Mejorar el mensaje de error para códigos duplicados
                if (data.message && data.message.includes('Duplicate entry') && 
                    data.message.includes('codigo_venta')) {
                    
                    // Mensaje específico para código duplicado
                    showAlert('Error: El código de venta ya existe. Por favor use otro código.', 'danger');
                    
                    // Enfocar el campo de código para que el usuario pueda cambiarlo
                    $('#codigo_venta').addClass('is-invalid').focus();
                    
                } else {
                    // Otros errores
                    showAlert('Error: ' + data.message, 'danger');
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error de conexión al crear la orden: ' + error.message, 'danger');
        })
        .finally(() => {
            // Rehabilitar botón
            $btnGuardar.prop('disabled', false).html('<i class="bi bi-save me-2"></i>Crear Orden');
        });
    });
    
    // Reset form handler
    $('button[type="reset"]').click(function() {
        // Limpiar productos también
        productos = [];
        $('#tablaProductos tbody').html(`
            <tr id="filaVacia">
                <td colspan="3" class="text-center text-muted py-3">
                    <i class="bi bi-inbox me-2"></i>No hay productos agregados
                </td>
            </tr>
        `);
        $('#formNuevaOrden').removeClass('was-validated');
    });
});