// bienesNuevo.js
$(document).ready(function() {
    // Inicializar Select2 para selección múltiple de proveedores
    $('#proveedores').select2({
        theme: 'bootstrap-5',
        placeholder: 'Seleccionar proveedores...',
        allowClear: true
    });
    
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
        
        const formData = {
            nombre: $('#nombre').val().trim(),
            descripcion: $('#descripcion').val().trim() || null,
            tipo: $('#tipo').val(),
            categoria_id: $('#categoria_id').val() || null,
            familias: $('#familias').val() || [],
            unidad_medida_id: $('#unidad_medida_id').val() || null,
            precio: parseFloat($('#precio').val()) || 0,
            cantidad_critica: $('#cantidad_critica').val() !== '' ? parseInt($('#cantidad_critica').val()) : null,
            ubicacion: $('#ubicacion').val().trim() || null,
            almacen_defecto_id: $('#almacen_defecto_id').val() || null,
            proveedores: $('#proveedores').val() || []
        };
        
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
                        window.location.href = `/bienes/${bienId}`;
                    }, 3000);
                } else {
                    showAlert(`Bien creado correctamente con ${resultado.archivosSubidos.length} archivo(s)`, 'success');
                    setTimeout(() => {
                        window.location.href = `/bienes/${bienId}`;
                    }, 1000);
                }
            } else {
                // Sin archivos, redirigir directamente
                window.location.href = '/bienes';
            }
            
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error al crear el bien', 'danger');
            submitBtn.html(originalText).prop('disabled', false);
        }
    });
});
