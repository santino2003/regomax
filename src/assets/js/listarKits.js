// listarKits.js
$(document).ready(function() {
    let currentPage = 1;
    let currentFilters = {};
    let kitIdToDelete = null;
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
    
    function cargarKits(page = 1) {
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
                        <a href="/kits/${kit.id}" class="btn btn-sm btn-outline-info" title="Ver">
                            <i class="bi bi-eye"></i>
                        </a>
                        <a href="/kits/editar/${kit.id}" class="btn btn-sm btn-outline-warning" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </a>
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
                cargarKits(currentPage);
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
    
    // Cargar datos iniciales
    cargarKits(1);
});
