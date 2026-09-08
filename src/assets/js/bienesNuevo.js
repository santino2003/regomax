// bienesNuevo.js
$(document).ready(function() {
    // ===== GESTIÓN DE PROVEEDORES =====
    let proveedorCounter = 0;
    let proveedoresData = []; // Array para guardar datos de proveedores
    
    // Cargar lista de proveedores desde el servidor (se pasa desde EJS)
    let proveedores = window.proveedoresDisponibles || [];
    
    function agregarProveedorVacio() {
        proveedorCounter++;
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
    
    // Función global para eliminar proveedor
    window.eliminarProveedor = function(proveedorId) {
        $(`[data-proveedor="${proveedorId}"]`).remove();
        
        // Si no quedan proveedores, mostrar mensaje
        if ($('#proveedoresContainer .proveedor-row').length === 0) {
            $('#proveedoresContainer').html('<p class="text-muted text-center py-3">No hay proveedores agregados. Haga clic en "Agregar Proveedor" para añadir uno.</p>');
        }
    };
    
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
    
    // Inicializar con mensaje por defecto
    if ($('#proveedoresContainer .proveedor-row').length === 0) {
        $('#proveedoresContainer').html('<p class="text-muted text-center py-3">No hay proveedores agregados. Haga clic en "Agregar Proveedor" para añadir uno.</p>');
    }
    
    $('#btnAgregarProveedor').on('click', function() {
        // Limpiar mensaje si existe
        if ($('#proveedoresContainer p.text-muted').length > 0) {
            $('#proveedoresContainer').empty();
        }
        agregarProveedorVacio();
    });
    // ===== FIN GESTIÓN DE PROVEEDORES =====
    
    // ===== GESTIÓN DE FAMILIAS =====
    let familiasSeleccionadasArray = [];
    
    function actualizarFamiliasUI() {
        const container = $('#familiasSeleccionadas');
        
        if (familiasSeleccionadasArray.length === 0) {
            container.html('<small class="text-muted">No hay familias seleccionadas</small>');
        } else {
            let html = '';
            familiasSeleccionadasArray.forEach(familia => {
                html += `
                    <span class="badge bg-primary me-1 mb-1" style="font-size: 0.9rem;" data-familia-id="${familia.id}">
                        ${familia.nombre}
                        <button type="button" class="btn-close btn-close-white btn-sm ms-1" style="font-size: 0.6rem;" data-familia-id="${familia.id}"></button>
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
    
    // Eliminar familia (delegated event)
    $(document).on('click', '#familiasSeleccionadas .btn-close', function() {
        const familiaId = parseInt($(this).data('familia-id'));
        familiasSeleccionadasArray = familiasSeleccionadasArray.filter(f => f.id !== familiaId);
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
    
    const form = $('#formNuevoBien');
    const submitBtn = $('#submitBtn');
    const alertPlaceholder = $('#alertPlaceholder');
    const archivosInput = $('#archivos');
    const listaArchivosPreview = $('#listaArchivosPreview');
    
    // Preview de archivos seleccionados
    archivosInput.on('change', function() {
        const files = this.files;
        if (files.length === 0) {
            listaArchivosPreview.html('');
            return;
        }
        
        let html = '<div class="alert alert-secondary"><strong>Archivos seleccionados:</strong><ul class="mb-0 mt-2">';
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const size = (file.size / 1024).toFixed(2);
            const sizeClass = file.size > 10 * 1024 * 1024 ? 'text-danger' : '';
            html += `<li class="${sizeClass}">${file.name} (${size} KB)</li>`;
        }
        html += '</ul></div>';
        listaArchivosPreview.html(html);
    });
    
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
    
    async function subirArchivos(bienId, files) {
        const archivosSubidos = [];
        const errores = [];
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
                    archivosSubidos.push(file.name);
                } else {
                    errores.push(`${file.name}: ${data.error || 'Error al subir'}`);
                }
            } catch (error) {
                console.error('Error subiendo archivo:', error);
                errores.push(`${file.name}: Error de red`);
            }
        }
        
        return { archivosSubidos, errores };
    }
    
    form.on('submit', async function(e) {
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
            };        console.log('Datos a enviar:', formData);
        
        try {
            // Paso 1: Crear el bien
            const response = await fetch('/api/bienes/nuevo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (!data.success) {
                showAlert(data.error || 'Error al crear el bien', 'danger');
                submitBtn.html(originalText).prop('disabled', false);
                return;
            }
            
            const bienId = data.data.id;
            
            // Paso 2: Subir archivos si hay alguno seleccionado
            const files = archivosInput[0].files;
            if (files && files.length > 0) {
                submitBtn.html('<span class="spinner-border spinner-border-sm me-2"></span>Subiendo archivos...');
                
                const resultado = await subirArchivos(bienId, files);
                
                if (resultado.errores.length > 0) {
                    let mensaje = 'Bien creado correctamente.<br>';
                    if (resultado.archivosSubidos.length > 0) {
                        mensaje += `<strong>Archivos subidos:</strong> ${resultado.archivosSubidos.length}<br>`;
                    }
                    mensaje += `<strong>Errores:</strong><br>`;
                    resultado.errores.forEach(error => {
                        mensaje += `- ${error}<br>`;
                    });
                    showAlert(mensaje, 'warning');
                    
                    // Redirigir después de 3 segundos para que el usuario vea los errores
                    setTimeout(() => {
                        window.location.href = `/bienes/${bienId}?returnTo=${encodeURIComponent(window.listReturnTo || '/bienes')}`;
                    }, 3000);
                } else {
                    showAlert(`Bien creado correctamente con ${resultado.archivosSubidos.length} archivo(s)`, 'success');
                    setTimeout(() => {
                        window.location.href = `/bienes/${bienId}?returnTo=${encodeURIComponent(window.listReturnTo || '/bienes')}`;
                    }, 1000);
                }
            } else {
                // Sin archivos, redirigir directamente
                window.location.href = window.listReturnTo || '/bienes';
            }
            
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error al crear el bien', 'danger');
            submitBtn.html(originalText).prop('disabled', false);
        }
    });
});
