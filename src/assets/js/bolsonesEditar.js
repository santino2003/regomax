$(document).ready(function() {
    // Botón para crear un nuevo producto
    $('#btnNuevoProducto').on('click', function() {
        // Abrir la ventana de nuevo producto en una ventana emergente
        window.open('/productos/nuevo', 'NuevoProducto', 'width=800,height=600');
    });
    
    // Escuchar mensajes de la ventana popup
    window.addEventListener('message', function(event) {
        // Verificar que el mensaje es del tipo esperado
        if (event.data && event.data.type === 'newProduct') {
            const newProduct = event.data.product;
            
            // Agregar el nuevo producto al selector
            $('#producto').append(
                $('<option>', {
                    value: newProduct.nombre,
                    'data-unidad': newProduct.unidad,
                    text: `${newProduct.nombre} (${newProduct.unidad})`
                })
            );
            
            // Seleccionar el nuevo producto
            $('#producto').val(newProduct.nombre).trigger('change');
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
        
        if (type !== 'success') {
            // Auto-hide para mensajes de error después de 5 segundos
            setTimeout(() => {
                $('.alert').alert('close');
            }, 5000);
        }
    }
    
    // Función para imprimir código de barras
    window.imprimirCodigo = function(base64Data, codigo) {
        // Crear iframe oculto para impresión
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        
        document.body.appendChild(printFrame);
        
        printFrame.onload = function() {
            const doc = printFrame.contentDocument || printFrame.contentWindow.document;
            doc.write(`
                <html>
                    <head>
                        <title>Etiqueta - ${codigo}</title>
                        <style>
                            @page {
                                size: 90mm 45mm;
                                margin: 0;
                                padding: 0;
                            }
                            body {
                                margin: 0;
                                padding: 2mm;
                                text-align: center;
                                font-family: Arial, sans-serif;
                            }
                            img {
                                max-width: 80mm;
                                height: auto;
                            }
                        </style>
                    </head>
                    <body>
                        <img src="data:image/png;base64,${base64Data}" alt="Código de barras ${codigo}">
                        <div style="font-size: 10pt; margin-top: 2mm;">${codigo}</div>
                    </body>
                </html>
            `);
            doc.close();
            
            // Dar tiempo al navegador para cargar la imagen
            setTimeout(function() {
                try {
                    printFrame.contentWindow.focus();
                    printFrame.contentWindow.print();
                } catch(e) {
                    console.error('Error al imprimir:', e);
                    alert('Hubo un problema al imprimir. Intente descargando la imagen y luego imprima manualmente.');
                }
                
                // Eliminar el iframe después de imprimir
                setTimeout(function() {
                    document.body.removeChild(printFrame);
                }, 1000);
            }, 300);
        };
        
        // Trigger onload
        printFrame.src = 'about:blank';
    };
    
    // Manejar envío del formulario
    $('#formEditarBolson').on('submit', function(e) {
        e.preventDefault();
        
        // Validar formulario
        if (!this.checkValidity()) {
            e.stopPropagation();
            $(this).addClass('was-validated');
            return;
        }
        
        // Obtener datos del formulario
        const formData = {
            producto: $('#producto').val().trim(),
            peso: parseFloat($('#peso').val()),
            precinto: $('#precinto').val().trim()
        };
        
        // Obtener ID del bolsón de un elemento hidden
        const bolsonId = $('#bolsonId').val();
        
        // Deshabilitar botón durante la operación
        const $btnGuardar = $('#btnGuardar');
        $btnGuardar.prop('disabled', true).html('<i class="bi bi-hourglass-split me-2"></i>Guardando...');
        
        // Enviar datos al servidor
        fetch('/api/bolsones/actualizar/' + bolsonId, {  // Cambio a la ruta correcta con /actualizar/
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            // Verificar si la respuesta es exitosa
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            // Verificar el tipo de contenido antes de intentar parsear como JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.indexOf('application/json') !== -1) {
                return response.json();
            } else {
                throw new Error('La respuesta no es un JSON válido');
            }
        })
        .then(data => {
            if (data.success) {
                showAlert('¡Bolsón actualizado exitosamente!', 'success');
                // No resetear el formulario, solo quitar validación visual
                $(this).removeClass('was-validated');
            } else {
                showAlert('Error: ' + data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error de conexión al actualizar el bolsón: ' + error.message, 'danger');
        })
        .finally(() => {
            // Rehabilitar botón
            $btnGuardar.prop('disabled', false).html('<i class="bi bi-save me-2"></i>Guardar Cambios');
        });
    });
});