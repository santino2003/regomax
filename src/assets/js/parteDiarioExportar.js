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
            // Opciones para html2pdf
            const options = {
                margin: 10,
                filename: `parte-diario-${parteFecha}-${parteId}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            // Agregar clase para optimizar para PDF
            printableArea.classList.add('printing');
            
            // Generar PDF
            html2pdf()
                .from(printableArea)
                .set(options)
                .save()
                .then(() => {
                    // Remover clase después de generar
                    printableArea.classList.remove('printing');
                    console.log('PDF generado correctamente');
                })
                .catch(error => {
                    console.error('Error al generar PDF:', error);
                    printableArea.classList.remove('printing');
                });
        });
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