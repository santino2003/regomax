// listarBienes.js
$(document).ready(function() {
    let currentPage = 1;
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
            limit: 10,
            ...currentFilters
        });
        
        fetch(`/api/bienes?${params}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    renderTabla(data.data.bienes);
                    renderPaginacion(data.data.paginacion);
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
                    <td class="text-end ${stockClass}">${bien.cantidad_stock}</td>
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
        
        let html = '';
        
        // Botón anterior
        html += `
            <li class="page-item ${paginacion.paginaActual === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="cambiarPagina(${paginacion.paginaActual - 1}); return false;">Anterior</a>
            </li>
        `;
        
        // Páginas
        for (let i = 1; i <= paginacion.totalPaginas; i++) {
            if (i === 1 || i === paginacion.totalPaginas || (i >= paginacion.paginaActual - 2 && i <= paginacion.paginaActual + 2)) {
                html += `
                    <li class="page-item ${i === paginacion.paginaActual ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="cambiarPagina(${i}); return false;">${i}</a>
                    </li>
                `;
            } else if (i === paginacion.paginaActual - 3 || i === paginacion.paginaActual + 3) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }
        
        // Botón siguiente
        html += `
            <li class="page-item ${paginacion.paginaActual === paginacion.totalPaginas ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="cambiarPagina(${paginacion.paginaActual + 1}); return false;">Siguiente</a>
            </li>
        `;
        
        paginationEl.html(html);
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
    
    // Enter en búsqueda
    $('#filtroBusqueda').on('keypress', function(e) {
        if (e.which === 13) {
            $('#btnFiltrar').click();
        }
    });
    
    // Cargar datos iniciales
    cargarBienes(1);
});
