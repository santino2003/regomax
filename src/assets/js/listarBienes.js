// listarBienes.js
$(document).ready(function() {
    let currentPage = 1;
    let currentLimit = 10;
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
            const stockClass = bien.cantidad_critica && bien.cantidad_stock <= bien.cantidad_critica 
                ? 'text-danger fw-bold' 
                : '';
            
            html += `
                <tr>
                    <td>${bien.codigo}</td>
                    <td>${bien.nombre}</td>
                    <td><span class="badge ${bien.tipo === 'Uso' ? 'bg-info' : 'bg-warning'}">${bien.tipo}</span></td>
                    <td>${bien.categoria_nombre || '-'}</td>
                    <td>${bien.familia_nombre || '-'}</td>
                    <td class="text-end ${stockClass}">${formatearCantidad(bien.cantidad_stock)}</td>
                    <td class="text-end">$${parseFloat(bien.precio || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td class="text-center">
                        <a href="/bienes/${bien.id}" class="btn btn-sm btn-outline-info" title="Ver">
                            <i class="bi bi-eye"></i>
                        </a>
                        <a href="/bienes/editar/${bien.id}" class="btn btn-sm btn-outline-warning" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </a>
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
    
    // Cargar datos iniciales
    cargarBienes(1);
});
