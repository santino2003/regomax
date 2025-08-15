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
    
    // Función para mostrar alertas con imagen
    function showAlert(message, type = 'success', imageData = null) {
        let alertContent = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
                ${message}
        `;
        
        // Si hay imagen, agregarla
        if (imageData && type === 'success') {
            alertContent += `
                <div class="text-center mt-3" id="barcodeContainer">
                    <hr>
                    <h6><i class="bi bi-upc-scan me-2"></i>Código de Barras Generado:</h6>
                    <img src="data:image/png;base64,${imageData.barcodeBase64}" 
                         alt="Código de barras ${imageData.codigo}" 
                         class="img-fluid mb-2" 
                         style="max-width: 300px; border: 1px solid #dee2e6; padding: 10px; background: white;">
                    <br>
                    <strong>Código: ${imageData.codigo}</strong>
                    <br>
                    <div class="mt-2">
                        <button onclick="imprimirCodigo('${imageData.barcodeBase64}', '${imageData.codigo}')" 
                                class="btn btn-sm btn-outline-secondary">
                            <i class="bi bi-printer me-1"></i>Imprimir
                        </button>
                    </div>
                </div>
            `;
        }
        
        alertContent += `
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        $('#alertContainer').html(alertContent);
    }
    
    // Función para descargar imagen
    window.descargarImagen = function(base64Data, codigo) {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${base64Data}`;
        link.download = `barcode_${codigo}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    // Función para imprimir código directo (sin ventana intermedia)
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
                    
                    // Borrar el código de barras después de imprimir
                    setTimeout(function() {
                        $('#barcodeContainer').remove();
                    }, 500);
                    
                } catch(e) {
                    console.error('Error al imprimir:', e);
                    alert('Hubo un problema al imprimir.');
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
    $('#formNuevoBolson').on('submit', function(e) {
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
        
        // Deshabilitar botón durante la operación
        const $btnGuardar = $('#btnGuardar');
        $btnGuardar.prop('disabled', true).html('<i class="bi bi-hourglass-split me-2"></i>Creando...');
        
        // Enviar datos al servidor
        fetch('/api/bolsones/nuevo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Mostrar alerta con imagen
                showAlert(
                    `¡Bolsón creado exitosamente! Código: <strong>${data.data.codigo}</strong>`, 
                    'success', 
                    data.data
                );
                
                // Limpiar formulario
                this.reset();
                $(this).removeClass('was-validated');
                
            } else {
                showAlert('Error: ' + data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error de conexión al crear el bolsón', 'danger');
        })
        .finally(() => {
            // Rehabilitar botón
            $btnGuardar.prop('disabled', false).html('<i class="bi bi-save me-2"></i>Crear Bolsón');
        });
    });
    
    // Validación en tiempo real
    $('#producto, #peso, #precinto').on('input', function() {
        if (this.checkValidity()) {
            $(this).removeClass('is-invalid').addClass('is-valid');
        } else {
            $(this).removeClass('is-valid').addClass('is-invalid');
        }
    });
    
    // Focus en el primer campo
    $('#producto').focus();
});