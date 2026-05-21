// listarBienes.js
$(document).ready(function() {
    let currentPage = 1;
    let currentLimit = 50;
    let currentFilters = {};
    let bienIdToDelete = null;
    const modalEliminar = new bootstrap.Modal('#modalEliminar');
    
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
    
    function cargarBienes(page = 1) {
        const params = new URLSearchParams({
            page: page,
            limit: currentLimit,
            ...currentFilters
        });
        
        fetch(`/api/bienes?${params}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    renderTabla(data.data.bienes);
                    renderPaginacion(data.data.paginacion);
                    renderInfoRegistros(data.data.bienes.length, data.data.paginacion);
                    currentPage = page;
                } else {
                    showAlert('Error al cargar los bienes', 'danger');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert('Error al cargar los bienes', 'danger');
            });
    }
    
    /**
     * Formatear cantidad: si es entero mostrar sin decimales, si tiene decimales mostrarlos
     */
    function formatearCantidad(valor) {
        const num = parseFloat(valor);
        if (isNaN(num)) return valor;
        // Si es número entero, mostrar sin decimales
        if (num % 1 === 0) {
            return num.toString();
        }
        // Si tiene decimales, mostrar con hasta 2 decimales
        return num.toFixed(2).replace(/\.?0+$/, '');
    }

    function renderTabla(bienes) {
        const tbody = $('#tablaBienes');
        
        if (bienes.length === 0) {
            tbody.html('<tr><td colspan="8" class="text-center">No se encontraron bienes</td></tr>');
            return;
        }
        
        let html = '';
        bienes.forEach(bien => {
            // Considerar crítico si cantidad_critica está definida (incluso si es 0) y el stock es menor o igual
            const stockClass = (bien.cantidad_critica !== null && bien.cantidad_critica !== undefined && bien.cantidad_stock <= bien.cantidad_critica)
                ? 'text-danger fw-bold' 
                : '';
            
            // Procesar familias - puede venir como array o string concatenado
            let familiasDisplay = '-';
            if (bien.familias_nombres) {
                // Si viene como string concatenado del GROUP_CONCAT
                const familiasArray = bien.familias_nombres.split(', ').map(f => f.trim()).filter(f => f);
                familiasDisplay = familiasArray.map(f => `<span class="badge bg-info me-1">${f}</span>`).join('');
            }
            
            html += `
                <tr>
                    <td>${bien.codigo}</td>
                    <td>${bien.nombre}</td>
                    <td><span class="badge ${bien.tipo === 'Uso' ? 'bg-info' : 'bg-warning'}">${bien.tipo}</span></td>
                    <td>${bien.categoria_nombre || '-'}</td>
                    <td>${familiasDisplay}</td>
                    <td class="text-end ${stockClass}">${formatearCantidad(bien.cantidad_stock)}</td>
                    <td>${bien.ubicacion || '-'}</td>
                    <td class="text-center">
                        <a href="/bienes/${bien.id}" class="btn btn-sm btn-outline-info" title="Ver">
                            <i class="bi bi-eye"></i>
                        </a>
                        <a href="/bienes/editar/${bien.id}" class="btn btn-sm btn-outline-warning" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </a>
                        <a href="/ajuste-inventario/historial?bien_id=${bien.id}" class="btn btn-sm btn-outline-primary" title="Historial">
                            <i class="bi bi-clock-history"></i>
                        </a>
                        <button class="btn btn-sm btn-outline-secondary" onclick="imprimirCodigoBien(${bien.id}, '${bien.codigo.replace(/'/g, "\\'")}', '${bien.nombre.replace(/'/g, "\\'")}')">
                            <i class="bi bi-printer"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="confirmarEliminar(${bien.id}, '${bien.nombre.replace(/'/g, "\\'")}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.html(html);
    }
    
    function renderPaginacion(paginacion) {
        const paginationEl = $('#pagination');
        
        if (paginacion.totalPaginas <= 1) {
            paginationEl.html('');
            return;
        }
        
        const totalPages = paginacion.totalPaginas;
        const currentPageNum = paginacion.paginaActual;
        const maxPagesToShow = 5;
        
        let startPage = Math.max(1, currentPageNum - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        
        // Ajustar el rango si estamos cerca del final
        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
        
        let html = '';
        
        // Botón Primera Página
        html += `
            <li class="page-item ${currentPageNum === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="cambiarPagina(1); return false;" aria-label="Primera">
                    <span aria-hidden="true">&laquo;&laquo;</span>
                </a>
            </li>
        `;
        
        // Botón Anterior
        html += `
            <li class="page-item ${currentPageNum === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="cambiarPagina(${currentPageNum - 1}); return false;" aria-label="Anterior">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;
        
        // Mostrar primera página si no está en el rango
        if (startPage > 1) {
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="cambiarPagina(1); return false;">1</a>
                </li>
            `;
            if (startPage > 2) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }
        
        // Páginas numéricas
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === currentPageNum ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="cambiarPagina(${i}); return false;">${i}</a>
                </li>
            `;
        }
        
        // Mostrar última página si no está en el rango
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="cambiarPagina(${totalPages}); return false;">${totalPages}</a>
                </li>
            `;
        }
        
        // Botón Siguiente
        html += `
            <li class="page-item ${currentPageNum === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="cambiarPagina(${currentPageNum + 1}); return false;" aria-label="Siguiente">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `;
        
        // Botón Última Página
        html += `
            <li class="page-item ${currentPageNum === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="cambiarPagina(${totalPages}); return false;" aria-label="Última">
                    <span aria-hidden="true">&raquo;&raquo;</span>
                </a>
            </li>
        `;
        
        paginationEl.html(html);
    }
    
    function renderInfoRegistros(cantidadMostrada, paginacion) {
        const infoDiv = $('#infoRegistros');
        if (paginacion && paginacion.totalRegistros) {
            infoDiv.html(`Mostrando ${cantidadMostrada} de ${paginacion.totalRegistros} bienes`);
        } else {
            infoDiv.html('');
        }
    }
    
    // Funciones globales para usar en onclick
    window.cambiarPagina = function(page) {
        cargarBienes(page);
    };
    
    window.confirmarEliminar = function(id, nombre) {
        bienIdToDelete = id;
        $('#bienNombre').text(nombre);
        modalEliminar.show();
    };
    
    $('#btnConfirmarEliminar').on('click', function() {
        if (!bienIdToDelete) return;
        
        const btn = $(this);
        const originalText = btn.html();
        btn.html('<span class="spinner-border spinner-border-sm"></span>').prop('disabled', true);
        
        fetch(`/api/bienes/${bienIdToDelete}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Bien eliminado correctamente', 'success');
                modalEliminar.hide();
                cargarBienes(currentPage);
            } else {
                showAlert(data.error || 'Error al eliminar el bien', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error al eliminar el bien', 'danger');
        })
        .finally(() => {
            btn.html(originalText).prop('disabled', false);
            bienIdToDelete = null;
        });
    });
    
    $('#btnFiltrar').on('click', function() {
        currentFilters = {};
        
        const tipo = $('#filtroTipo').val();
        const categoria = $('#filtroCategoria').val();
        const familia = $('#filtroFamilia').val();
        const busqueda = $('#filtroBusqueda').val().trim();
        const critico = $('#filtroCritico').is(':checked');
        
        if (tipo) currentFilters.tipo = tipo;
        if (categoria) currentFilters.categoria_id = categoria;
        if (familia) currentFilters.familia_id = familia;
        if (busqueda) currentFilters.busqueda = busqueda;
        if (critico) currentFilters.critico = '1';
        
        cargarBienes(1);
    });
    
    $('#btnLimpiar').on('click', function() {
        $('#filtroTipo').val('');
        $('#filtroCategoria').val('');
        $('#filtroFamilia').val('');
        $('#filtroBusqueda').val('');
        $('#filtroCritico').prop('checked', false);
        currentFilters = {};
        cargarBienes(1);
    });
    
    // Selector de límite
    $('#limitSelector').on('change', function() {
        currentLimit = parseInt($(this).val());
        cargarBienes(1);
    });
    
    // Enter en búsqueda
    $('#filtroBusqueda').on('keypress', function(e) {
        if (e.which === 13) {
            $('#btnFiltrar').click();
        }
    });
    
    // Función global para imprimir código de barras de un bien
    window.imprimirCodigoBien = function(bienId, codigo, nombre) {
        console.log('Imprimiendo código para bien:', bienId, codigo, nombre);
        
        // Obtener el código de barras del servidor
        fetch(`/api/bienes/${bienId}`)
            .then(response => {
                console.log('Response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Data recibida:', data);
                // El endpoint puede devolver { success: true, data: {...} } o directamente el objeto
                const bienData = data.data || data;
                
                if (bienData && bienData.barcodeBase64) {
                    imprimirCodigo(bienData.barcodeBase64, codigo, nombre);
                } else {
                    console.error('No se encontró barcodeBase64 en la respuesta:', data);
                    showAlert('No se pudo obtener el código de barras', 'danger');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert('Error al obtener el código de barras', 'danger');
            });
    };
    
    // Función para imprimir código de barras (similar a bienesVer.js)
    function imprimirCodigo(base64Data, codigo, nombre) {
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
                        <div style="font-size: 8pt; margin-top: 1mm;">${nombre}</div>
                    </body>
                </html>
            `);
            doc.close();
            
            // Esperar a que la imagen se cargue antes de imprimir
            setTimeout(() => {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
                
                // Remover el iframe después de imprimir
                setTimeout(() => {
                    document.body.removeChild(printFrame);
                }, 1000);
            }, 250);
        };
        
        printFrame.src = 'about:blank';
    }
    
    // Cargar datos iniciales
    cargarBienes(1);
});
