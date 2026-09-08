// listarKits.js
$(document).ready(function() {
    let currentPage = 1;
    let currentFilters = {};
    let kitIdToDelete = null;
    const modalEliminar = new bootstrap.Modal('#modalEliminar');

    function leerEstadoDesdeUrl() {
        const params = new URLSearchParams(window.location.search);
        currentPage = Math.max(1, parseInt(params.get('page'), 10) || 1);
        currentFilters = {};
        ['tipo', 'categoria_id', 'busqueda'].forEach((key) => {
            const value = params.get(key);
            if (value) currentFilters[key] = value;
        });
    }

    function aplicarEstadoEnFormulario() {
        $('#filtroTipo').val(currentFilters.tipo || '');
        $('#filtroCategoria').val(currentFilters.categoria_id || '');
        $('#filtroBusqueda').val(currentFilters.busqueda || '');
    }

    function actualizarUrl(mode = 'push') {
        const params = new URLSearchParams({ page: currentPage, limit: 10, ...currentFilters });
        window.history[mode === 'replace' ? 'replaceState' : 'pushState']({}, '', `${window.location.pathname}?${params}`);
        const nuevaUrl = new URL('/kits/nuevo', window.location.origin);
        nuevaUrl.searchParams.set('returnTo', window.location.pathname + window.location.search);
        $('a[href="/kits/nuevo"], a[href^="/kits/nuevo?"]').attr('href', nuevaUrl.pathname + nuevaUrl.search);
    }
    
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
    
    function cargarKits(page = 1, updateHistory = true) {
        currentPage = page;
        if (updateHistory) actualizarUrl('push');
        const params = new URLSearchParams({
            page: page,
            limit: 10,
            ...currentFilters
        });
        
        fetch(`/api/kits?${params}`)
            .then(response => response.json())
            .then(data => {
                if (data.data && data.pagination) {
                    renderTabla(data.data);
                    renderPaginacion(data.pagination);
                    currentPage = page;
                } else {
                    showAlert('Error al cargar los kits', 'danger');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert('Error al cargar los kits', 'danger');
            });
    }
    
    function renderTabla(kits) {
        const tbody = $('#tablaKits');
        
        if (kits.length === 0) {
            tbody.html('<tr><td colspan="8" class="text-center">No se encontraron kits</td></tr>');
            return;
        }
        
        let html = '';
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
        kits.forEach(kit => {
            const stockClass = kit.cantidad_stock <= 0 ? 'text-danger fw-bold' : '';
            
            html += `
                <tr>
                    <td><span class="badge bg-secondary">${kit.codigo}</span></td>
                    <td>${kit.nombre}</td>
                    <td><span class="badge ${kit.tipo === 'Uso' ? 'bg-info' : 'bg-warning'}">${kit.tipo}</span></td>
                    <td>${kit.categoria_nombre || '-'}</td>
                    <td class="text-center">
                        <span class="badge bg-primary">${kit.num_componentes || 0}</span>
                    </td>
                    <td class="text-end ${stockClass}">${kit.cantidad_stock}</td>
                    <td class="text-end">$${parseFloat(kit.precio || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td class="text-center">
                        <a href="/kits/${kit.id}?returnTo=${returnTo}" class="btn btn-sm btn-outline-info" title="Ver">
                            <i class="bi bi-eye"></i>
                        </a>
                        <a href="/kits/editar/${kit.id}?returnTo=${returnTo}" class="btn btn-sm btn-outline-warning" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </a>
                        <button class="btn btn-sm btn-outline-secondary" onclick="imprimirCodigoKit(${kit.id}, '${kit.codigo.replace(/'/g, "\\'")}', '${kit.nombre.replace(/'/g, "\\'")}')">
                            <i class="bi bi-printer"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="confirmarEliminar(${kit.id}, '${kit.nombre.replace(/'/g, "\\'")}')">
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
        
        if (paginacion.totalPages <= 1) {
            paginationEl.html('');
            return;
        }
        
        let html = '';
        
        // Botón anterior
        html += `
            <li class="page-item ${paginacion.page === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="cambiarPagina(${paginacion.page - 1}); return false;">Anterior</a>
            </li>
        `;
        
        // Páginas
        for (let i = 1; i <= paginacion.totalPages; i++) {
            if (i === 1 || i === paginacion.totalPages || (i >= paginacion.page - 2 && i <= paginacion.page + 2)) {
                html += `
                    <li class="page-item ${i === paginacion.page ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="cambiarPagina(${i}); return false;">${i}</a>
                    </li>
                `;
            } else if (i === paginacion.page - 3 || i === paginacion.page + 3) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }
        
        // Botón siguiente
        html += `
            <li class="page-item ${paginacion.page === paginacion.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="cambiarPagina(${paginacion.page + 1}); return false;">Siguiente</a>
            </li>
        `;
        
        paginationEl.html(html);
    }
    
    // Funciones globales para usar en onclick
    window.cambiarPagina = function(page) {
        cargarKits(page);
    };
    
    window.confirmarEliminar = function(id, nombre) {
        kitIdToDelete = id;
        $('#kitNombre').text(nombre);
        modalEliminar.show();
    };
    
    $('#btnConfirmarEliminar').on('click', function() {
        if (!kitIdToDelete) return;
        
        const btn = $(this);
        const originalText = btn.html();
        btn.html('<span class="spinner-border spinner-border-sm"></span>').prop('disabled', true);
        
        fetch(`/api/kits/${kitIdToDelete}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Kit eliminado correctamente', 'success');
                modalEliminar.hide();
                cargarKits(currentPage, false);
            } else {
                showAlert(data.error || 'Error al eliminar el kit', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error al eliminar el kit', 'danger');
        })
        .finally(() => {
            btn.html(originalText).prop('disabled', false);
            kitIdToDelete = null;
        });
    });
    
    $('#btnFiltrar').on('click', function() {
        currentFilters = {};
        
        const tipo = $('#filtroTipo').val();
        const categoria = $('#filtroCategoria').val();
        const busqueda = $('#filtroBusqueda').val().trim();
        
        if (tipo) currentFilters.tipo = tipo;
        if (categoria) currentFilters.categoria_id = categoria;
        if (busqueda) currentFilters.busqueda = busqueda;
        
        cargarKits(1);
    });
    
    $('#btnLimpiar').on('click', function() {
        $('#filtroTipo').val('');
        $('#filtroCategoria').val('');
        $('#filtroBusqueda').val('');
        currentFilters = {};
        cargarKits(1);
    });
    
    // Enter en búsqueda
    $('#filtroBusqueda').on('keypress', function(e) {
        if (e.which === 13) {
            $('#btnFiltrar').click();
        }
    });
    
    // Función global para imprimir código de barras de un kit
    window.imprimirCodigoKit = function(kitId, codigo, nombre) {
        console.log('Imprimiendo código para kit:', kitId, codigo, nombre);
        
        // Obtener el código de barras del servidor
        fetch(`/api/kits/${kitId}`)
            .then(response => {
                console.log('Response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Data recibida:', data);
                // El endpoint puede devolver { success: true, data: {...} } o directamente el objeto
                const kitData = data.data || data;
                
                if (kitData && kitData.barcodeBase64) {
                    imprimirCodigo(kitData.barcodeBase64, codigo, nombre);
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
                            <div class="producto">${nombre}</div>
                        </div>
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
    
    window.addEventListener('popstate', function() {
        leerEstadoDesdeUrl();
        aplicarEstadoEnFormulario();
        actualizarUrl('replace');
        cargarKits(currentPage, false);
    });

    leerEstadoDesdeUrl();
    aplicarEstadoEnFormulario();
    actualizarUrl('replace');
    cargarKits(currentPage, false);
});
