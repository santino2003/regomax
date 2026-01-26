// kitNuevo.js
$(document).ready(function() {
    let componenteCounter = 0;
    let componentes = [];

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

    function actualizarResumen() {
        $('#totalComponentes').text(componentes.length);
        
        let precioTotal = 0;
        componentes.forEach(comp => {
            const bien = bienesDisponibles.find(b => b.id == comp.bien_id);
            if (bien) {
                precioTotal += (bien.precio || 0) * comp.cantidad;
            }
        });
        
        $('#precioTotal').text('$' + precioTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 }));
    }

    function agregarComponente() {
        componenteCounter++;
        const componenteHtml = `
            <div class="card mb-2 componente-item" data-componente-id="${componenteCounter}">
                <div class="card-body">
                    <div class="row g-2 align-items-center">
                        <div class="col-md-7">
                            <label class="form-label small mb-1">Bien</label>
                            <select class="form-select select-bien" required>
                                <option value="">Seleccionar bien...</option>
                                ${bienesDisponibles.map(bien => `
                                    <option value="${bien.id}" 
                                            data-precio="${bien.precio || 0}"
                                            data-stock="${bien.cantidad_stock}"
                                            data-codigo="${bien.codigo}">
                                        ${bien.codigo} - ${bien.nombre} (Stock: ${bien.cantidad_stock})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small mb-1">Cantidad</label>
                            <input type="number" class="form-control input-cantidad" min="1" value="1" required>
                        </div>
                        <div class="col-md-2 text-center">
                            <label class="form-label small mb-1">&nbsp;</label>
                            <button type="button" class="btn btn-danger btn-sm w-100 btn-eliminar-componente">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                        <div class="col-12">
                            <small class="text-muted info-precio">Seleccione un bien para ver el precio</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('#componentesContainer').append(componenteHtml);
    }

    // Agregar componente
    $('#btnAgregarComponente').on('click', function() {
        agregarComponente();
    });

    // Eliminar componente
    $(document).on('click', '.btn-eliminar-componente', function() {
        $(this).closest('.componente-item').remove();
        recolectarComponentes();
        actualizarResumen();
    });

    // Cambio en selección de bien
    $(document).on('change', '.select-bien', function() {
        const $item = $(this).closest('.componente-item');
        const $option = $(this).find('option:selected');
        const precio = parseFloat($option.data('precio') || 0);
        const stock = $option.data('stock');
        const codigo = $option.data('codigo');
        
        if (codigo) {
            const cantidad = parseInt($item.find('.input-cantidad').val()) || 1;
            const subtotal = precio * cantidad;
            $item.find('.info-precio').html(
                `Precio unitario: $${precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })} | 
                 Subtotal: $${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })} | 
                 Stock disponible: ${stock}`
            );
        }
        
        recolectarComponentes();
        actualizarResumen();
    });

    // Cambio en cantidad
    $(document).on('change', '.input-cantidad', function() {
        const $item = $(this).closest('.componente-item');
        const $option = $item.find('.select-bien option:selected');
        const precio = parseFloat($option.data('precio') || 0);
        const stock = $option.data('stock');
        const codigo = $option.data('codigo');
        const cantidad = parseInt($(this).val()) || 1;
        
        if (codigo) {
            const subtotal = precio * cantidad;
            $item.find('.info-precio').html(
                `Precio unitario: $${precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })} | 
                 Subtotal: $${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })} | 
                 Stock disponible: ${stock}`
            );
        }
        
        recolectarComponentes();
        actualizarResumen();
    });

    function recolectarComponentes() {
        componentes = [];
        $('.componente-item').each(function() {
            const bienId = $(this).find('.select-bien').val();
            const cantidad = parseInt($(this).find('.input-cantidad').val()) || 1;
            
            if (bienId) {
                componentes.push({
                    bien_id: parseInt(bienId),
                    cantidad: cantidad
                });
            }
        });
    }

    // Submit del formulario
    $('#formNuevoKit').on('submit', function(e) {
        e.preventDefault();
        
        if (!this.checkValidity()) {
            e.stopPropagation();
            $(this).addClass('was-validated');
            return;
        }

        recolectarComponentes();
        
        // Validar componentes
        if (componentes.length < 2) {
            showAlert('Debe agregar al menos 2 componentes al kit', 'warning');
            return;
        }
        
        // Validar que no haya componentes duplicados
        const bienIds = componentes.map(c => c.bien_id);
        const duplicados = bienIds.filter((item, index) => bienIds.indexOf(item) !== index);
        if (duplicados.length > 0) {
            showAlert('No puede agregar el mismo bien más de una vez al kit', 'warning');
            return;
        }

        const formData = {
            nombre: $('#nombre').val(),
            tipo: $('#tipo').val(),
            descripcion: $('#descripcion').val(),
            categoria_id: $('#categoria_id').val() || null,
            familia_id: $('#familia_id').val() || null,
            ubicacion: $('#ubicacion').val(),
            almacen_defecto_id: $('#almacen_defecto_id').val() || null,
            componentes: componentes
        };

        const btn = $('#submitBtn');
        const originalText = btn.html();
        btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...').prop('disabled', true);

        fetch('/api/kits/nuevo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Kit creado exitosamente', 'success');
                setTimeout(() => {
                    window.location.href = '/kits/' + data.data.id;
                }, 1500);
            } else {
                showAlert(data.error || 'Error al crear el kit', 'danger');
                btn.html(originalText).prop('disabled', false);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error al crear el kit', 'danger');
            btn.html(originalText).prop('disabled', false);
        });
    });

    // Agregar primer componente al cargar
    agregarComponente();
    agregarComponente();
});
