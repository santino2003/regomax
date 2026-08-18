// listarOrdenesCompra.js
const token = localStorage.getItem('token');
let currentPage = 1;
let currentLimit = 50;
let currentFilters = {
    estado: 'En Proceso,Aprobada'
};

function leerEstadoDesdeUrl() {
    const params = new URLSearchParams(window.location.search);
    currentPage = Math.max(1, parseInt(params.get('page'), 10) || 1);
    currentLimit = Math.max(1, parseInt(params.get('limit'), 10) || 50);
    currentFilters = {
        estado: params.has('estado') ? params.get('estado') : 'En Proceso,Aprobada',
        condicion: params.get('condicion') || '',
        bien_id: params.get('bien_id') || '',
        busqueda: params.get('busqueda') || ''
    };
}

function aplicarEstadoEnFormulario() {
    $('#filtroEstado').val(currentFilters.estado);
    $('#filtroCondicion').val(currentFilters.condicion);
    $('#filtroBien').val(currentFilters.bien_id);
    $('#filtroBusqueda').val(currentFilters.busqueda);
    $('#limitSelector').val(currentLimit);
}

function actualizarUrl(mode = 'push') {
    const params = new URLSearchParams();
    params.set('page', currentPage);
    params.set('limit', currentLimit);
    // Estado vacío significa "Todos" y debe distinguirse de la URL inicial,
    // que usa el filtro predeterminado En Proceso/Aprobada.
    params.set('estado', currentFilters.estado || '');
    Object.entries(currentFilters).forEach(([key, value]) => {
        if (key !== 'estado' && value) params.set(key, value);
    });
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history[mode === 'replace' ? 'replaceState' : 'pushState']({}, '', url);

    const nuevaUrl = new URL('/ordenes-compra/nueva', window.location.origin);
    nuevaUrl.searchParams.set('returnTo', window.location.pathname + window.location.search);
    $('#nuevaOrdenLink').attr('href', nuevaUrl.pathname + nuevaUrl.search);
}

$(document).ready(function() {
    leerEstadoDesdeUrl();
    aplicarEstadoEnFormulario();
    actualizarUrl('replace');
    cargarBienes();
    cargarOrdenes(currentPage, false);
    
    $('#filtrosForm').on('submit', function(e) {
        e.preventDefault();
        currentFilters = {
            estado: $('#filtroEstado').val(),
            condicion: $('#filtroCondicion').val(),
            bien_id: $('#filtroBien').val(),
            busqueda: $('#filtroBusqueda').val()
        };
        cargarOrdenes(1, true);
    });

    $('#limitSelector').on('change', function() {
        currentLimit = parseInt($(this).val());
        cargarOrdenes(1, true);
    });

    $('#btnGuardarEstado').on('click', function() {
        cambiarEstado();
    });

    $('#btnGuardarEstadoMultiple').on('click', function() {
        cambiarEstadoMultiple();
    });

    $('#btnCambiarEstadoMultiple').on('click', function() {
        abrirModalEstadoMultiple();
    });

    // Event listener para "Seleccionar todos"
    $(document).on('change', '#selectTodos', function() {
        const isChecked = $(this).prop('checked');
        $('.seleccionar-orden').prop('checked', isChecked);
        actualizarEstadoBotonMultiple();
    });

    $('#logout-link').on('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });

    window.addEventListener('popstate', function() {
        leerEstadoDesdeUrl();
        aplicarEstadoEnFormulario();
        actualizarUrl('replace');
        cargarOrdenes(currentPage, false);
    });
});

// Hacer la función global para que funcione desde los onclick en HTML
window.cargarOrdenes = cargarOrdenes;

function cargarBienes() {
    $.ajax({
        url: '/api/bienes',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        data: { limite: 1000 }, // Cargar todos los bienes
        success: function(response) {
            if (response.success && response.data && response.data.bienes) {
                const select = $('#filtroBien');
                select.empty().append('<option value="">Todos</option>');
                response.data.bienes.forEach(bien => {
                    select.append(`<option value="${bien.id}">${bien.codigo} - ${bien.nombre}</option>`);
                });
                select.val(currentFilters.bien_id);
            }
        },
        error: function(xhr) {
            console.error('Error al cargar bienes:', xhr);
        }
    });
}

function cargarOrdenes(page = 1, updateHistory = true) {
    currentPage = page;
    if (updateHistory) actualizarUrl('push');

    const params = {
        pagina: page,
        limite: currentLimit,
        ...currentFilters
    };

    $.ajax({
        url: '/api/ordenes-compra',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        data: params,
        success: function(response) {
            if (response.success && response.data) {
                // Crear objeto de paginación compatible
                const pagination = {
                    paginaActual: response.data.pagina,
                    totalPaginas: response.data.totalPaginas,
                    totalRegistros: response.data.total
                };
                
                renderizarTabla(response.data.ordenes || []);
                renderizarPaginacion(pagination, currentFilters);
                currentPage = page;
            }
        },
        error: function(xhr) {
            mostrarAlerta('Error al cargar órdenes de compra', 'danger');
        }
    });
}

function renderizarTabla(ordenes) {
    const tbody = $('#tablaOrdenesCompra');
    tbody.empty();

    if (ordenes.length === 0) {
        tbody.html('<tr><td colspan="9" class="text-center">No hay órdenes de compra registradas</td></tr>');
        return;
    }

    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    ordenes.forEach((orden, index) => {
        const estadoClass = orden.estado.replace(/\s/g, '');
        const fechaSolicitada = orden.fecha_entrega_solicitada ? 
            new Date(orden.fecha_entrega_solicitada).toLocaleDateString('es-AR') : '-';
        const fechaProveedor = orden.fecha_entrega_proveedor ? 
            new Date(orden.fecha_entrega_proveedor).toLocaleDateString('es-AR') : '-';
        const fechaCreacion = new Date(orden.created_at).toLocaleDateString('es-AR');
        const asuntoCorto = orden.asunto ? 
            (orden.asunto.length > 50 ? orden.asunto.substring(0, 50) + '...' : orden.asunto) : '-';
        
        const row = `
            <tr>
                <td>
                    <input class="form-check-input seleccionar-orden" type="checkbox" 
                           value="${orden.id}" data-estado="${orden.estado}" 
                           id="orden_${orden.id}">
                </td>
                <td><strong>${orden.codigo}</strong></td>
                <td>${fechaCreacion}</td>
                <td>${fechaSolicitada}</td>
                <td>${fechaProveedor}</td>
                <td><span class="badge badge-${estadoClass}">${orden.estado}</span></td>
                <td title="${orden.asunto || ''}">${asuntoCorto}</td>
                <td>${orden.creado_por}</td>
                <td>
                    <a href="/ordenes-compra/${orden.id}?returnTo=${returnTo}" class="btn btn-sm btn-info" title="Ver">
                        <i class="bi bi-eye"></i>
                    </a>
                    <a href="/ordenes-compra/${orden.id}/editar?returnTo=${returnTo}" class="btn btn-sm btn-warning" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </a>
                    <button class="btn btn-sm btn-success" onclick="abrirModalEstado(${orden.id}, '${orden.estado}')" title="Cambiar Estado">
                        <i class="bi bi-arrow-repeat"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="imprimirOrden(${orden.id})" title="Imprimir PDF">
                        <i class="bi bi-printer"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarOrden(${orden.id})" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.append(row);
    });

    // Agregar event listeners a los checkboxes
    agregarEventListenersCheckboxes();
}

function renderizarPaginacion(pagination, filtros) {
    const container = $('#paginacionContainer');
    
    if (!pagination || pagination.totalPaginas <= 1) {
        container.html('');
        return;
    }

    const totalPages = pagination.totalPaginas;
    const currentPageNum = pagination.paginaActual;
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, currentPageNum - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    let html = '<ul class="pagination justify-content-center">';
    
    // Botón Primera Página
    html += `
        <li class="page-item ${currentPageNum === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="cargarOrdenes(1); return false;" aria-label="Primera">
                <span aria-hidden="true">&laquo;&laquo;</span>
            </a>
        </li>
    `;
    
    // Botón Anterior
    html += `
        <li class="page-item ${currentPageNum === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="cargarOrdenes(${currentPageNum - 1}); return false;" aria-label="Anterior">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;
    
    // Primera página si no está en el rango
    if (startPage > 1) {
        html += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="cargarOrdenes(1); return false;">1</a>
            </li>
        `;
        if (startPage > 2) {
            html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    
    // Páginas numéricas
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${currentPageNum === i ? 'active' : ''}">
                <a class="page-link" href="#" onclick="cargarOrdenes(${i}); return false;">${i}</a>
            </li>
        `;
    }
    
    // Última página si no está en el rango
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
        html += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="cargarOrdenes(${totalPages}); return false;">${totalPages}</a>
            </li>
        `;
    }
    
    // Botón Siguiente
    html += `
        <li class="page-item ${currentPageNum === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="cargarOrdenes(${currentPageNum + 1}); return false;" aria-label="Siguiente">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;
    
    // Botón Última Página
    html += `
        <li class="page-item ${currentPageNum === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="cargarOrdenes(${totalPages}); return false;" aria-label="Última">
                <span aria-hidden="true">&raquo;&raquo;</span>
            </a>
        </li>
    `;
    
    html += '</ul>';
    container.html(html);
}


window.abrirModalEstado = function(ordenId, estadoActual) {
    $('#ordenIdEstado').val(ordenId);
    $('#nuevoEstado').val(estadoActual);
    new bootstrap.Modal($('#modalCambiarEstado')).show();
};

function cambiarEstado() {
    const ordenId = $('#ordenIdEstado').val();
    const nuevoEstado = $('#nuevoEstado').val();

    $.ajax({
        url: `/api/ordenes-compra/${ordenId}/estado`,
        method: 'PATCH',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({ estado: nuevoEstado }),
        success: function(response) {
            if (response.success) {
                mostrarAlerta('Estado actualizado exitosamente', 'success');
                bootstrap.Modal.getInstance($('#modalCambiarEstado')[0]).hide();
                cargarOrdenes(currentPage);
            }
        },
        error: function(xhr) {
            const error = xhr.responseJSON?.error || 'Error al cambiar estado';
            
            // Detectar si es error de permisos
            if (error.includes('permiso') || error.includes('Permiso')) {
                mostrarAlertaPermiso(error);
            } else {
                mostrarAlerta(error, 'danger');
            }
        }
    });
}

// Función para agregar event listeners a los checkboxes
function agregarEventListenersCheckboxes() {
    $(document).on('change', '.seleccionar-orden', function() {
        actualizarEstadoBotonMultiple();
    });
}

// Función para actualizar el estado del botón de cambio múltiple
function actualizarEstadoBotonMultiple() {
    const seleccionados = $('.seleccionar-orden:checked');
    const btnMultiple = $('#btnCambiarEstadoMultiple');
    const btnGuardarMultiple = $('#btnGuardarEstadoMultiple');
    
    if (seleccionados.length === 0) {
        btnMultiple.prop('disabled', true).addClass('opacity-50');
        return;
    }

    // Verificar que todos estén en el mismo estado
    const estados = new Set();
    seleccionados.each(function() {
        estados.add($(this).data('estado'));
    });

    if (estados.size === 1) {
        btnMultiple.prop('disabled', false).removeClass('opacity-50');
    } else {
        btnMultiple.prop('disabled', true).addClass('opacity-50');
        mostrarAlerta('Todas las órdenes deben estar en el mismo estado', 'warning');
    }
}

window.abrirModalEstadoMultiple = function() {
    const seleccionados = $('.seleccionar-orden:checked');
    
    if (seleccionados.length === 0) {
        mostrarAlerta('Seleccione al menos una orden', 'warning');
        return;
    }

    // Verificar que todos estén en el mismo estado
    const estados = new Set();
    seleccionados.each(function() {
        estados.add($(this).data('estado'));
    });

    if (estados.size !== 1) {
        mostrarAlerta('Todas las órdenes deben estar en el mismo estado', 'danger');
        return;
    }

    const estadoActual = Array.from(estados)[0];
    const ordenesSeleccionadas = seleccionados.map((i, el) => $(el).val()).get();

    $('#ordenesIdEstadoMultiple').val(JSON.stringify(ordenesSeleccionadas));
    $('#nuevoEstadoMultiple').val(estadoActual);
    
    // Mostrar información de las órdenes seleccionadas
    $('#cantidadOrdenesSeleccionadas').text(ordenesSeleccionadas.length);
    $('#estadoActualMultiple').text(estadoActual);

    new bootstrap.Modal($('#modalCambiarEstadoMultiple')).show();
};

function cambiarEstadoMultiple() {
    const ordenesJson = $('#ordenesIdEstadoMultiple').val();
    const nuevoEstado = $('#nuevoEstadoMultiple').val();
    const ordenes = JSON.parse(ordenesJson);

    if (!ordenes || ordenes.length === 0) {
        mostrarAlerta('No hay órdenes seleccionadas', 'warning');
        return;
    }

    if (!nuevoEstado) {
        mostrarAlerta('Debe seleccionar un estado', 'warning');
        return;
    }

    // Deshabilitar el botón mientras se procesa
    const btnGuardar = $('#btnGuardarEstadoMultiple');
    btnGuardar.prop('disabled', true);
    const textoOriginal = btnGuardar.html();
    btnGuardar.html('<span class="spinner-border spinner-border-sm me-2"></span>Procesando...');

    $.ajax({
        url: `/api/ordenes-compra/cambiar-estado-multiple`,
        method: 'PATCH',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({ 
            ordenes: ordenes,
            estado: nuevoEstado 
        }),
        success: function(response) {
            if (response.success) {
                mostrarAlerta(`${response.data.exitosas} órdenes actualizadas exitosamente`, 'success');
                
                if (response.data.fallidas && response.data.fallidas.length > 0) {
                    const mensajeFallidas = response.data.fallidas.map(f => 
                        `${f.orden_id}: ${f.error}`
                    ).join('\n');
                    mostrarAlerta(`Errores:\n${mensajeFallidas}`, 'warning');
                }
                
                bootstrap.Modal.getInstance($('#modalCambiarEstadoMultiple')[0]).hide();
                $('input.seleccionar-orden').prop('checked', false);
                cargarOrdenes(currentPage);
            }
        },
        error: function(xhr) {
            const error = xhr.responseJSON?.error || 'Error al cambiar estado';
            
            // Detectar si es error de permisos
            if (error.includes('permiso') || error.includes('Permiso')) {
                mostrarAlertaPermiso(error);
            } else {
                mostrarAlerta(error, 'danger');
            }
        },
        complete: function() {
            btnGuardar.prop('disabled', false);
            btnGuardar.html(textoOriginal);
        }
    });
}

// Función para mostrar alerta de permiso denegado
function mostrarAlertaPermiso(mensaje) {
    const alerta = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert" style="border-left: 5px solid #dc3545; background-color: #f8d7da; color: #721c24;">
            <strong style="font-size: 1.1em;">
                <i class="bi bi-lock-fill me-2"></i>Acceso Denegado
            </strong>
            <hr>
            <p class="mb-0" style="font-size: 0.95em;">
                ${mensaje}
            </p>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    $('#alertPlaceholder').html(alerta);
    setTimeout(() => $('.alert').alert('close'), 6000);
}

window.eliminarOrden = function(ordenId) {
    if (!confirm('¿Está seguro de eliminar esta orden de compra?')) return;

    $.ajax({
        url: `/api/ordenes-compra/${ordenId}`,
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        success: function(response) {
            if (response.success) {
                mostrarAlerta('Orden eliminada exitosamente', 'success');
                cargarOrdenes(currentPage);
            }
        },
        error: function(xhr) {
            const error = xhr.responseJSON?.error || 'Error al eliminar orden';
            mostrarAlerta(error, 'danger');
        }
    });
};

window.imprimirOrden = function(ordenId) {
    // Abrir directamente la URL con el token en el query string
    const url = `/api/ordenes-compra/${ordenId}/exportar-pdf?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
};

function mostrarAlerta(mensaje, tipo) {
    const alerta = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    $('#alertPlaceholder').html(alerta);
    setTimeout(() => $('.alert').alert('close'), 5000);
}
