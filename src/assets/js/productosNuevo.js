$(document).ready(function() {
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
        
        // Preparar datos
        const formData = {
            nombre: $('#nombre').val().trim(),
            unidad: $('#unidad').val(),
            enStock: $('#enStock').is(':checked')
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