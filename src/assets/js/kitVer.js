// kitVer.js
$(document).ready(function() {
    const kitId = $('#kitDetails').data('kit-id');
    const modalStock = new bootstrap.Modal('#modalStock');
    let accionStock = null;

    function showAlert(message, type) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        $('#alertPlaceholder').html(alertHtml);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.mostrarModalStock = function(accion) {
        accionStock = accion;
        const title = accion === 'incrementar' ? 'Incrementar Stock' : 'Descontar Stock';
        const help = accion === 'incrementar' 
            ? 'Se incrementará el stock del kit y de todos sus componentes.'
            : 'Se descontará el stock del kit y de todos sus componentes.';
        
        $('#modalStockTitle').text(title);
        $('#stockHelp').text(help);
        $('#cantidadStock').val(1);
        
        const btn = $('#btnConfirmarStock');
        btn.removeClass('btn-success btn-danger');
        btn.addClass(accion === 'incrementar' ? 'btn-success' : 'btn-danger');
        
        modalStock.show();
    };

    $('#btnConfirmarStock').on('click', function() {
        const cantidad = parseInt($('#cantidadStock').val());
        
        if (!cantidad || cantidad <= 0) {
            showAlert('Ingrese una cantidad válida', 'warning');
            return;
        }

        const btn = $(this);
        const originalText = btn.html();
        btn.html('<span class="spinner-border spinner-border-sm"></span>').prop('disabled', true);

        const endpoint = accionStock === 'incrementar' 
            ? `/api/kits/${kitId}/incrementar-stock`
            : `/api/kits/${kitId}/descontar-stock`;

        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cantidad: cantidad })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert(data.message || 'Stock actualizado correctamente', 'success');
                modalStock.hide();
                // Recargar la página para mostrar el stock actualizado
                setTimeout(() => {
                    location.reload();
                }, 1500);
            } else {
                showAlert(data.error || 'Error al actualizar el stock', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error al actualizar el stock', 'danger');
        })
        .finally(() => {
            btn.html(originalText).prop('disabled', false);
        });
    });

    // Función global para imprimir código de barras (llamada desde onclick en HTML)
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
});
