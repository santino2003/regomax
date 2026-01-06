$(document).ready(function() {
    // Array para almacenar los bienes asociados
    let bienesAsociados = [];
    
    // Modal instance
    const modalAgregarBien = new bootstrap.Modal(document.getElementById('modalAgregarBien'));
    
    // Referencia al botón de cancelar
    $('#cancelBtn').on('click', function() {
        // Determinar la página desde la que se llegó para volver
        const referrer = document.referrer;
        if (referrer && (referrer.includes('/ordenes/nueva') || referrer.includes('/ordenes/editar/'))) {
            window.close(); // Cerrar ventana si fue abierta desde órdenes
        } else if (referrer && (referrer.includes('/bolsones/nuevo') || referrer.includes('/bolsones/'))) {
            window.close(); // Cerrar ventana si fue abierta desde bolsones
        } else {
            window.history.back(); // Volver atrás como opción predeterminada
        }
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
                tbody.append(`
                    <tr data-bien-id="${bien.bien_id}">
                        <td>${bien.nombre}</td>
                        <td>${bien.stock} ${bien.unidad || ''}</td>
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
    
    // Función para mostrar alertas
    function showAlert(message, type = 'success') {
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        $('#alertPlaceholder').html(alertHTML);
        
        // Auto-ocultar después de 5 segundos si es éxito
        if (type === 'success') {
            setTimeout(() => {
                $('.alert').alert('close');
            }, 5000);
        }
    }
    
    // Manejo del envío del formulario
    $('#formNuevoProducto').on('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Validación del formulario mediante Bootstrap
        if (!this.checkValidity()) {
            $(this).addClass('was-validated');
            return;
        }
        
        // Deshabilitar botón para evitar múltiples envíos
        const submitBtn = $('#submitBtn');
        const originalText = submitBtn.html();
        submitBtn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...').prop('disabled', true);
        
        // Preparar datos con array de bienes
        const formData = {
            nombre: $('#nombre').val().trim(),
            unidad: $('#unidad').val(),
            enStock: $('#enStock').is(':checked'),
            bienes: bienesAsociados.map(b => ({
                bien_id: b.bien_id,
                cantidad: b.cantidad
            }))
        };
        
        // Enviar solicitud
        fetch('/api/productos/nuevo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            // Verificar si la respuesta es JSON
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
                showAlert(`¡Producto "${formData.nombre}" creado exitosamente!`);
                
                // Determinar si esta ventana fue abierta desde otra página
                const referrer = document.referrer;
                const isPopup = window.opener;
                
                if (isPopup) {
                    // Si es una ventana emergente, enviar mensaje al padre
                    window.opener.postMessage({
                        type: 'newProduct',
                        product: {
                            id: data.data,
                            nombre: formData.nombre,
                            unidad: formData.unidad
                        }
                    }, '*');
                    
                    // Cerrar esta ventana después de 2 segundos
                    setTimeout(() => {
                        window.close();
                    }, 2000);
                } else {
                    // Si no es ventana emergente, limpiar formulario
                    setTimeout(() => {
                        $('#formNuevoProducto')[0].reset();
                        $(this).removeClass('was-validated');
                    }, 2000);
                }
            } else {
                showAlert(`Error: ${data.error || data.message}`, 'danger');
                console.error('Error en respuesta:', data);
            }
        })
        .catch(error => {
            showAlert(`Error: ${error.message}`, 'danger');
            console.error('Error en solicitud:', error);
        })
        .finally(() => {
            // Restaurar estado del botón
            submitBtn.html(originalText).prop('disabled', false);
        });
    });
});