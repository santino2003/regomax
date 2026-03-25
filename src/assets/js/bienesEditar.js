// bienesEditar.js
// Variables globales que necesitan estar disponibles antes del DOM ready
let bienId;
let modalArchivo;
let modalEliminarArchivo;
let archivoIdToDelete = null;
let familiasSeleccionadasArray = [];
let proveedorCounter = 0;

// Función global para eliminar archivo (llamada desde onclick en HTML)
function eliminarArchivo(id, nombre) {
    archivoIdToDelete = id;
    $('#nombreArchivoEliminar').text(nombre);
    modalEliminarArchivo.show();
}

// Función global para eliminar familia (llamada desde onclick en HTML)
function eliminarFamilia(id) {
    familiasSeleccionadasArray = familiasSeleccionadasArray.filter(f => f.id !== id);
    actualizarFamiliasUI();
}

// Función global para eliminar proveedor
window.eliminarProveedor = function(proveedorId) {
    $(`[data-proveedor="${proveedorId}"]`).remove();
    
    // Si no quedan proveedores, mostrar mensaje
    if ($('#proveedoresContainer .proveedor-row').length === 0) {
        $('#proveedoresContainer').html('<p class="text-muted text-center py-3">No hay proveedores agregados. Haga clic en "Agregar Proveedor" para añadir uno.</p>');
    }
};

function actualizarFamiliasUI() {
    const container = $('#familiasSeleccionadas');
    
    if (familiasSeleccionadasArray.length === 0) {
        container.html('<small class="text-muted">No hay familias seleccionadas</small>');
    } else {
        let html = '';
        familiasSeleccionadasArray.forEach(familia => {
            html += `
                <span class="badge bg-primary me-1 mb-1" style="font-size: 0.9rem;">
                    ${familia.nombre}
                    <button type="button" class="btn-close btn-close-white btn-sm ms-1" style="font-size: 0.6rem;" onclick="eliminarFamilia(${familia.id})"></button>
                </span>
            `;
        });
        container.html(html);
    }
    
    // Actualizar hidden input
    const ids = familiasSeleccionadasArray.map(f => f.id);
    $('#familias').val(ids.join(','));
    
    // Deshabilitar opciones ya seleccionadas
    $('#familiaSelector option').each(function() {
        const optionId = parseInt($(this).val());
        if (ids.includes(optionId)) {
            $(this).prop('disabled', true);
        } else {
            $(this).prop('disabled', false);
        }
    });
}

// ===== GESTIÓN DE PROVEEDORES =====
function agregarProveedorVacio() {
    proveedorCounter++;
    const proveedores = window.proveedoresDisponibles || [];
    
    const proveedorHtml = `
        <div class="proveedor-row" data-proveedor="${proveedorCounter}">
            <button type="button" class="btn btn-danger btn-sm btn-remove-proveedor" onclick="eliminarProveedor(${proveedorCounter})">
                <i class="bi bi-x-lg"></i> Eliminar
            </button>
            
            <div class="row mb-2">
                <div class="col-md-6">
                    <label class="form-label">Proveedor <span class="text-danger">*</span></label>
                    <select class="form-select select2-proveedor" data-proveedor-id="${proveedorCounter}" required>
                        <option value="">Seleccionar proveedor...</option>
                        ${proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Precio <span class="text-danger">*</span></label>
                    <input type="number" class="form-control proveedor-precio" data-proveedor-id="${proveedorCounter}" 
                           step="0.01" min="0" placeholder="0.00" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Moneda <span class="text-danger">*</span></label>
                    <select class="form-select proveedor-moneda" data-proveedor-id="${proveedorCounter}" required>
                        <option value="">Seleccionar...</option>
                        <option value="ARS">ARS ($)</option>
                        <option value="USD">USD (US$)</option>
                        <option value="EUR">EUR (€)</option>
                    </select>
                </div>
            </div>
        </div>
    `;
    
    $('#proveedoresContainer').append(proveedorHtml);
    
    // Inicializar Select2 para el nuevo proveedor
    $(`[data-proveedor="${proveedorCounter}"] .select2-proveedor`).select2({
        theme: 'bootstrap-5',
        width: '100%',
        placeholder: 'Buscar proveedor...'
    });
}

function agregarProveedorConDatos(proveedorId, precio, moneda) {
    proveedorCounter++;
    const proveedores = window.proveedoresDisponibles || [];
    
    // Asegurar valores por defecto
    const precioValue = precio != null && precio !== undefined ? parseFloat(precio) : 0;
    const monedaValue = moneda || 'ARS';
    
    console.log('Agregando proveedor con datos:', {
        proveedorId,
        precio: precioValue,
        moneda: monedaValue,
        counter: proveedorCounter
    });
    
    const proveedorHtml = `
        <div class="proveedor-row" data-proveedor="${proveedorCounter}">
            <button type="button" class="btn btn-danger btn-sm btn-remove-proveedor" onclick="eliminarProveedor(${proveedorCounter})">
                <i class="bi bi-x-lg"></i> Eliminar
            </button>
            
            <div class="row mb-2">
                <div class="col-md-6">
                    <label class="form-label">Proveedor <span class="text-danger">*</span></label>
                    <select class="form-select select2-proveedor" data-proveedor-id="${proveedorCounter}" required>
                        <option value="">Seleccionar proveedor...</option>
                        ${proveedores.map(p => `<option value="${p.id}" ${p.id === proveedorId ? 'selected' : ''}>${p.nombre}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Precio <span class="text-danger">*</span></label>
                    <input type="number" class="form-control proveedor-precio" data-proveedor-id="${proveedorCounter}" 
                           step="0.01" min="0" value="${precioValue}" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Moneda <span class="text-danger">*</span></label>
                    <select class="form-select proveedor-moneda" data-proveedor-id="${proveedorCounter}" required>
                        <option value="">Seleccionar...</option>
                        <option value="ARS" ${monedaValue === 'ARS' ? 'selected' : ''}>ARS ($)</option>
                        <option value="USD" ${monedaValue === 'USD' ? 'selected' : ''}>USD (US$)</option>
                        <option value="EUR" ${monedaValue === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                    </select>
                </div>
            </div>
        </div>
    `;
    
    $('#proveedoresContainer').append(proveedorHtml);
    
    // Inicializar Select2 para el nuevo proveedor
    $(`[data-proveedor="${proveedorCounter}"] .select2-proveedor`).select2({
        theme: 'bootstrap-5',
        width: '100%',
        placeholder: 'Buscar proveedor...'
    });
}

function recopilarProveedores() {
    const proveedores = [];
    $('#proveedoresContainer .proveedor-row').each(function() {
        const proveedorId = $(this).find('.select2-proveedor').val();
        const precio = parseFloat($(this).find('.proveedor-precio').val());
        const moneda = $(this).find('.proveedor-moneda').val();
        
        if (proveedorId && !isNaN(precio) && moneda) {
            proveedores.push([parseInt(proveedorId), precio, moneda]);
        }
    });
    return proveedores;
}
// ===== FIN GESTIÓN DE PROVEEDORES =====

$(document).ready(function() {
    // Obtener el bienId del atributo data
    bienId = $('#formEditarBien').data('bien-id');
    
    // Inicializar modales
    modalArchivo = new bootstrap.Modal('#modalArchivo');
    modalEliminarArchivo = new bootstrap.Modal('#modalEliminarArchivo');
    
    // ===== INICIALIZAR PROVEEDORES EXISTENTES =====
    const proveedoresActuales = window.proveedoresActuales || [];
    console.log('Proveedores actuales recibidos:', proveedoresActuales);
    
    if (proveedoresActuales.length > 0) {
        proveedoresActuales.forEach(prov => {
            console.log('Procesando proveedor:', prov);
            // El proveedor tiene la estructura: {id, nombre, email, telefono, precio, moneda, ...}
            agregarProveedorConDatos(prov.id, prov.precio, prov.moneda);
        });
    } else {
        $('#proveedoresContainer').html('<p class="text-muted text-center py-3">No hay proveedores agregados. Haga clic en "Agregar Proveedor" para añadir uno.</p>');
    }
    
    $('#btnAgregarProveedor').on('click', function() {
        // Limpiar mensaje si existe
        if ($('#proveedoresContainer p.text-muted').length > 0) {
            $('#proveedoresContainer').empty();
        }
        agregarProveedorVacio();
    });
    // ===== FIN INICIALIZAR PROVEEDORES =====
    
    // ===== GESTIÓN DE FAMILIAS =====
    // Cargar familias existentes desde badges pre-renderizados
    $('#familiasSeleccionadas span[data-familia-id]').each(function() {
        const id = parseInt($(this).data('familia-id'));
        const nombre = $(this).clone().children().remove().end().text().trim();
        familiasSeleccionadasArray.push({ id, nombre });
    });
    
    // Actualizar UI inicial (para sincronizar hidden input y deshabilitar opciones)
    actualizarFamiliasUI();
    
    // Agregar familia
    $('#btnAgregarFamilia').on('click', function() {
        const selector = $('#familiaSelector');
        const selectedId = parseInt(selector.val());
        const selectedNombre = selector.find('option:selected').data('nombre');
        
        if (!selectedId) {
            return;
        }
        
        // Verificar si ya está agregada
        if (familiasSeleccionadasArray.find(f => f.id === selectedId)) {
            return;
        }
        
        // Agregar a array
        familiasSeleccionadasArray.push({
            id: selectedId,
            nombre: selectedNombre
        });
        
        // Resetear selector
        selector.val('');
        
        // Actualizar UI
        actualizarFamiliasUI();
    });
    
    // Permitir agregar con Enter en el selector
    $('#familiaSelector').on('keypress', function(e) {
        if (e.which === 13) {
            e.preventDefault();
            $('#btnAgregarFamilia').click();
        }
    });
    // ===== FIN GESTIÓN DE FAMILIAS =====
    
    const form = $('#formEditarBien');
    const submitBtn = $('#submitBtn');
    const alertPlaceholder = $('#alertPlaceholder');
    
    function showAlert(message, type) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        alertPlaceholder.html(alertHtml);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    form.on('submit', function(e) {
        e.preventDefault();
        
        if (!form[0].checkValidity()) {
            e.stopPropagation();
            form.addClass('was-validated');
            return;
        }
        
        const originalText = submitBtn.html();
        submitBtn.html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...').prop('disabled', true);
        
        // Recopilar proveedores como array de tuplas
        const proveedoresTuplas = recopilarProveedores();
        
        const formData = {
            nombre: $('#nombre').val().trim(),
            descripcion: $('#descripcion').val().trim() || null,
            tipo: $('#tipo').val(),
            categoria_id: $('#categoria_id').val() || null,
            familias: $('#familias').val() ? $('#familias').val().split(',').map(id => parseInt(id)) : [],
            unidad_medida_id: $('#unidad_medida_id').val() || null,
            cantidad_critica: $('#cantidad_critica').val() !== '' ? parseInt($('#cantidad_critica').val()) : null,
            ubicacion: $('#ubicacion').val().trim() || null,
            almacen_defecto_id: $('#almacen_defecto_id').val() || null,
            proveedores: proveedoresTuplas // Array de tuplas: [[id, precio, moneda], ...]
        };
        
        console.log('Datos a enviar:', formData);
        
        fetch(`/api/bienes/${bienId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Bien actualizado correctamente', 'success');
                setTimeout(() => {
                    window.location.href = `/bienes/${bienId}`;
                }, 1000);
            } else {
                showAlert(data.error || 'Error al actualizar el bien', 'danger');
                submitBtn.html(originalText).prop('disabled', false);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error al actualizar el bien', 'danger');
            submitBtn.html(originalText).prop('disabled', false);
        });
    });
    
    // Subir Archivo
    $('#btnSubirArchivo').on('click', function() {
        $('#archivo').val('');
        $('#listaArchivosSeleccionados').html('');
        modalArchivo.show();
    });
    
    // Preview de archivos seleccionados en el modal
    $('#archivo').on('change', function() {
        const files = this.files;
        const container = $('#listaArchivosSeleccionados');
        
        if (files.length === 0) {
            container.html('');
            return;
        }
        
        let html = '<div class="alert alert-info"><strong>Archivos seleccionados:</strong><ul class="mb-0 mt-2">';
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const size = (file.size / 1024).toFixed(2);
            const sizeClass = file.size > 10 * 1024 * 1024 ? 'text-danger' : '';
            html += `<li class="${sizeClass}">${file.name} (${size} KB)</li>`;
        }
        html += '</ul></div>';
        container.html(html);
    });
    
    $('#btnConfirmarArchivo').on('click', async function() {
        const fileInput = $('#archivo')[0];
        if (!fileInput.files || fileInput.files.length === 0) {
            alert('Por favor seleccione al menos un archivo');
            return;
        }
        
        const files = fileInput.files;
        const btn = $(this);
        const originalText = btn.html();
        btn.html('<span class="spinner-border spinner-border-sm"></span> Subiendo...').prop('disabled', true);
        
        let archivosSubidos = 0;
        let errores = [];
        
        // Subir archivos uno por uno
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            if (file.size > 10 * 1024 * 1024) {
                errores.push(`${file.name}: Excede el tamaño máximo (10MB)`);
                continue;
            }
            
            const formData = new FormData();
            formData.append('archivo', file);
            
            try {
                const response = await fetch(`/api/bienes/${bienId}/archivos`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    archivosSubidos++;
                } else {
                    errores.push(`${file.name}: ${data.error || 'Error al subir'}`);
                }
            } catch (error) {
                console.error('Error:', error);
                errores.push(`${file.name}: Error de red`);
            }
        }
        
        btn.html(originalText).prop('disabled', false);
        
        // Mostrar resultado
        if (errores.length > 0) {
            let mensaje = '';
            if (archivosSubidos > 0) {
                mensaje = `${archivosSubidos} archivo(s) subido(s) correctamente.\n\n`;
            }
            mensaje += 'Errores:\n' + errores.join('\n');
            alert(mensaje);
        } else {
            showAlert(`${archivosSubidos} archivo(s) subido(s) correctamente`, 'success');
        }
        
        modalArchivo.hide();
        
        // Recargar la página para mostrar los nuevos archivos
        setTimeout(() => {
            location.reload();
        }, 1000);
    });
    
    // Confirmar eliminación de archivo
    $('#btnConfirmarEliminarArchivo').on('click', function() {
        if (!archivoIdToDelete) return;
        
        const btn = $(this);
        const originalText = btn.html();
        btn.html('<span class="spinner-border spinner-border-sm"></span>').prop('disabled', true);
        
        fetch(`/api/bienes/${bienId}/archivos/${archivoIdToDelete}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Archivo eliminado correctamente', 'success');
                modalEliminarArchivo.hide();
                // Recargar la página para reflejar los cambios
                setTimeout(() => {
                    location.reload();
                }, 1000);
            } else {
                alert(data.error || 'Error al eliminar el archivo');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al eliminar el archivo');
        })
        .finally(() => {
            btn.html(originalText).prop('disabled', false);
            archivoIdToDelete = null;
        });
    });
});
