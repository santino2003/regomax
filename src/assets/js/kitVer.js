// kitVer.js
$(document).ready(function() {
    const kitId = $('#kitDetails').data('kit-id');

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

    // Función global para imprimir código de barras (llamada desde onclick en HTML)
    window.imprimirCodigo = function(base64Data, codigo, nombre) {
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
                            * {
                                margin: 0 !important;
                                padding: 0 !important;
                            }
                            html, body {
                                width: 90mm !important;
                                height: 45mm !important;
                                overflow: hidden !important;
                            }
                            body {
                                margin: 0;
                                padding: 2mm;
                                font-family: Arial, sans-serif;
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                height: 45mm !important;
                            }
                            .qr-container {
                                flex-shrink: 0;
                            }
                            img {
                                width: 40mm;
                                height: 40mm;
                                display: block;
                            }
                            .text-container {
                                display: flex;
                                flex-direction: column;
                                justify-content: center;
                                align-items: flex-start;
                                margin-left: 2mm;
                                flex-grow: 1;
                            }
                            .codigo {
                                font-size: 16pt;
                                font-weight: bold;
                                letter-spacing: 1px;
                                line-height: 1.3;
                                word-break: break-all;
                            }
                            .producto {
                                font-size: 12pt;
                                margin-top: 2mm;
                                line-height: 1.2;
                                word-break: break-word;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="qr-container">
                            <img src="data:image/png;base64,${base64Data}" alt="Código QR ${codigo}">
                        </div>
                        <div class="text-container">
                            <div class="codigo">${codigo}</div>
                            <div class="producto">${nombre || ''}</div>
                        </div>
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
