// listarOrdenesCompra.js
const token = localStorage.getItem('token');
let currentPage = 1;
let currentLimit = 10;
let currentFilters = {};

$(document).ready(function() {
    cargarBienes();
    cargarOrdenes();
    
    $('#filtrosForm').on('submit', function(e) {
        e.preventDefault();
        currentFilters = {
            estado: $('#filtroEstado').val(),
            condicion: $('#filtroCondicion').val(),
            bien_id: $('#filtroBien').val(),
            busqueda: $('#filtroBusqueda').val()
        };
        cargarOrdenes(1);
    });

    $('#limitSelector').on('change', function() {
        currentLimit = parseInt($(this).val());
        cargarOrdenes(1);
    });

    $('#btnGuardarEstado').on('click', function() {
        cambiarEstado();
    });

    $('#logout-link').on('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '/login.html';
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
            }
        },
        error: function(xhr) {
            console.error('Error al cargar bienes:', xhr);
        }
    });
}

function cargarOrdenes(page = 1) {
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
                renderizarInfoRegistros(response.data.total || 0, pagination);
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
        tbody.html('<tr><td colspan="8" class="text-center">No hay órdenes de compra registradas</td></tr>');
        return;
    }

    ordenes.forEach(orden => {
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
                <td><strong>${orden.codigo}</strong></td>
                <td>${fechaCreacion}</td>
                <td>${fechaSolicitada}</td>
                <td>${fechaProveedor}</td>
                <td><span class="badge badge-${estadoClass}">${orden.estado}</span></td>
                <td title="${orden.asunto || ''}">${asuntoCorto}</td>
                <td>${orden.creado_por}</td>
                <td>
                    <a href="/ordenes-compra/${orden.id}" class="btn btn-sm btn-info" title="Ver">
                        <i class="bi bi-eye"></i>
                    </a>
                    <a href="/ordenes-compra/${orden.id}/editar" class="btn btn-sm btn-warning" title="Editar">
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

function renderizarInfoRegistros(cantidadMostrada, pagination) {
    const infoDiv = $('#infoRegistros');
    if (pagination && pagination.totalRegistros) {
        infoDiv.html(`Mostrando ${cantidadMostrada} de ${pagination.totalRegistros} órdenes de compra`);
    } else {
        infoDiv.html('');
    }
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
            mostrarAlerta(error, 'danger');
        }
    });
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
    const url = `/api/ordenes-compra/${ordenId}/exportar-pdf`;
    
    // Descargar el PDF con el nombre correcto
    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        // Extraer el nombre del archivo del header Content-Disposition
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'orden-compra.pdf';
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename=(.+)/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/['"]/g, '');
            }
        }
        
        return response.blob().then(blob => ({ blob, filename }));
    })
    .then(({ blob, filename }) => {
        // Crear URL del blob
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Crear elemento <a> para descargar
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        
        // Descargar automáticamente
        a.click();
        
        // Limpiar después de un momento
        setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        }, 100);
    })
    .catch(error => {
        console.error('Error al generar PDF:', error);
        mostrarAlerta('Error al generar el PDF', 'danger');
    });
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
