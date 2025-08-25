/**
 * parteDiarioExportar.js - Maneja la exportación a PDF y la impresión de los partes diarios
 */

document.addEventListener('DOMContentLoaded', function() {
    // Referencia a los botones
    const btnExportPDF = document.getElementById('btnExportPDF');
    const btnPrint = document.getElementById('btnPrint');
    
    // Área imprimible
    const printableArea = document.getElementById('printableArea');
    
    // Configurar evento para exportar a PDF
    if (btnExportPDF) {
        btnExportPDF.addEventListener('click', function() {
            // Preparar el contenido para PDF
            preparePdfContent(true);
            
            // Opciones para html2pdf con mejor manejo de páginas
            const options = {
                margin: [15, 15, 15, 15], // Margen superior, derecho, inferior, izquierdo
                filename: `parte-diario-${parteFecha}-${parteId}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true,
                    letterRendering: true,
                    allowTaint: true
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a4', 
                    orientation: 'portrait',
                    compress: true
                },
                pagebreak: { 
                    mode: ['avoid-all', 'css', 'legacy'],
                    before: '.page-break-before',
                    after: '.page-break-after'
                }
            };
            
            // Mostrar indicador de carga
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75';
            loadingIndicator.style.zIndex = '9999';
            loadingIndicator.innerHTML = `
                <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Generando PDF...</span>
                </div>
                <span class="ms-3 fw-bold">Generando PDF...</span>
            `;
            document.body.appendChild(loadingIndicator);
            
            // Generar PDF con mejor manejo
            html2pdf()
                .from(printableArea)
                .set(options)
                .toPdf()
                .get('pdf')
                .then((pdf) => {
                    // Añadir números de página
                    const totalPages = pdf.internal.getNumberOfPages();
                    for (let i = 1; i <= totalPages; i++) {
                        pdf.setPage(i);
                        pdf.setFontSize(10);
                        pdf.setTextColor(100, 100, 100);
                        pdf.text(
                            `Página ${i} de ${totalPages}`, 
                            pdf.internal.pageSize.getWidth() / 2, 
                            pdf.internal.pageSize.getHeight() - 10, 
                            { align: 'center' }
                        );
                    }
                    return pdf;
                })
                .save()
                .then(() => {
                    // Restaurar el contenido original
                    preparePdfContent(false);
                    // Eliminar indicador de carga
                    document.body.removeChild(loadingIndicator);
                    console.log('PDF generado correctamente');
                })
                .catch(error => {
                    console.error('Error al generar PDF:', error);
                    // Restaurar el contenido original
                    preparePdfContent(false);
                    // Eliminar indicador de carga
                    document.body.removeChild(loadingIndicator);
                    alert('Hubo un error al generar el PDF. Por favor, intente nuevamente.');
                });
        });
    }
    
    // Función para preparar el contenido para PDF
    function preparePdfContent(forPdf) {
        // Elementos que deben ocultarse
        const elementsToHide = document.querySelectorAll('.no-print, .navbar, button, .btn');
        // Obtener el área imprimible
        const container = document.getElementById('printableArea');
        
        if (forPdf) {
            // Para PDF: ocultar elementos y optimizar presentación
            elementsToHide.forEach(el => {
                el.dataset.originalDisplay = el.style.display;
                el.style.display = 'none';
            });
            
            // Añadir clase especial para el estilo de PDF
            container.classList.add('pdf-mode');
            
            // Añadir estilos específicos para PDF
            const pdfStyles = document.createElement('style');
            pdfStyles.id = 'pdf-temp-styles';
            pdfStyles.textContent = `
                body {
                    font-family: Arial, sans-serif;
                    font-size: 12pt;
                }
                .card {
                    page-break-inside: avoid;
                    margin-bottom: 15px;
                    break-inside: avoid;
                }
                .table-responsive {
                    overflow: visible !important;
                }
                table {
                    width: 100% !important;
                    page-break-inside: auto;
                }
                tr {
                    page-break-inside: avoid;
                    page-break-after: auto;
                }
                td, th {
                    font-size: 10pt;
                    page-break-inside: avoid;
                }
                .pdf-mode {
                    padding: 0 !important;
                }
                .pdf-mode .card-body {
                    padding: 10px;
                }
                .pdf-mode .container {
                    width: 100%;
                    max-width: none;
                    padding: 0;
                    margin: 0;
                }
                @page {
                    margin: 15mm;
                }
            `;
            document.head.appendChild(pdfStyles);
            
            // Mostrar el encabezado de impresión
            const printHeader = document.querySelector('.d-none.d-print-block');
            if (printHeader) {
                printHeader.classList.remove('d-none');
                printHeader.style.display = 'block';
            }
            
        } else {
            // Restaurar elementos ocultos
            elementsToHide.forEach(el => {
                if (el.dataset.originalDisplay) {
                    el.style.display = el.dataset.originalDisplay;
                    delete el.dataset.originalDisplay;
                } else {
                    el.style.display = '';
                }
            });
            
            // Quitar clase de PDF
            container.classList.remove('pdf-mode');
            
            // Eliminar estilos temporales
            const tempStyles = document.getElementById('pdf-temp-styles');
            if (tempStyles) {
                tempStyles.remove();
            }
            
            // Ocultar encabezado de impresión nuevamente
            const printHeader = document.querySelector('.d-print-block');
            if (printHeader) {
                printHeader.classList.add('d-none');
            }
        }
    }
    
    // Configurar evento para imprimir
    if (btnPrint) {
        btnPrint.addEventListener('click', function() {
            // Imprimir usando la API del navegador
            window.print();
        });
    }
    
    // Configurar evento de logout (si existe en esta página)
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (confirm('¿Está seguro que desea cerrar sesión?')) {
                // Realizar petición de logout
                fetch('/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => {
                    if (response.ok) {
                        window.location.href = '/login';
                    } else {
                        console.error('Error al cerrar sesión');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                });
            }
        });
    }
});