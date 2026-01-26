$(document).ready(function() {
    let itemEncontrado = null;
    let procesandoSalida = false; // Flag para controlar el estado de procesamiento

    // Auto-focus en el input de código al cargar
    setTimeout(() => {
        $('#codigoInput').focus();
    }, 100);

    // Evento cuando el modal se oculta (por cualquier motivo)
    $('#confirmModal').on('hidden.bs.modal', function() {
        // Solo limpiar si no estamos procesando
        if (!procesandoSalida) {
            $('#btnEntregar').prop('disabled', false).html('<i class="bi bi-check-circle me-2"></i>Entregar');
        }
    });

    // Buscar al presionar ENTER
    $('#codigoInput').on('keypress', function(e) {
        if (e.which === 13) { // Enter key
            e.preventDefault();
            buscarItem();
        }
    });

    // Buscar al hacer click en el botón
    $('#btnBuscar').on('click', function() {
        buscarItem();
    });

    // Volver al paso 1
    $('#btnVolver').on('click', function() {
        volverPaso1();
    });

    // Procesar salida
    $('#formSalida').on('submit', function(e) {
        e.preventDefault();
        procesarSalida();
    });

    /**
     * Buscar bien o kit por código
     */
    function buscarItem() {
        const codigo = $('#codigoInput').val().trim();

        if (!codigo) {
            mostrarAlerta('Por favor ingrese un código', 'warning');
            return;
        }

        // Mostrar loading
        $('#btnBuscar').prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Buscando...');

        $.ajax({
            url: '/api/salidas/buscar',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ codigo: codigo }),
            success: function(response) {
                if (response.success && response.data) {
                    itemEncontrado = response.data;
                    mostrarPaso2(response.data);
                } else {
                    mostrarAlerta('No se encontró ningún bien o kit con ese código', 'danger');
                    $('#btnBuscar').prop('disabled', false).html('<i class="bi bi-search me-2"></i>Buscar');
                }
            },
            error: function(xhr) {
                const error = xhr.responseJSON?.error || 'Error al buscar el código';
                mostrarAlerta(error, 'danger');
                $('#btnBuscar').prop('disabled', false).html('<i class="bi bi-search me-2"></i>Buscar');
            }
        });
    }

    /**
     * Mostrar paso 2 con información del item
     */
    function mostrarPaso2(item) {
        // Resetear estado de procesamiento
        procesandoSalida = false;
        
        // Guardar datos en campos ocultos
        $('#itemId').val(item.id);
        $('#tipoItem').val(item.tipo_item);

        // Mostrar información del item
        $('#itemNombre').text(item.nombre);
        $('#itemCodigo').text(item.codigo);
        $('#itemTipo').text(item.tipo_item === 'bien' ? 'Bien' : 'Kit');
        $('#itemStock').text(item.cantidad_stock + (item.unidad_medida ? ' ' + item.unidad_medida : ''));
        $('#itemCritico').text(item.cantidad_critica || 'N/A');

        // Aplicar clase de advertencia si el stock está crítico
        const card = $('#itemInfoCard');
        card.removeClass('item-info-card stock-warning stock-danger');
        
        if (item.cantidad_stock <= item.cantidad_critica) {
            card.addClass('stock-danger');
        } else if (item.cantidad_stock <= item.cantidad_critica * 1.5) {
            card.addClass('stock-warning');
        } else {
            card.addClass('item-info-card');
        }

        // Asegurar que el botón esté habilitado
        $('#btnEntregar').prop('disabled', false).html('<i class="bi bi-check-circle me-2"></i>Entregar');

        // Cambiar a paso 2
        $('#paso1-tab').removeClass('active');
        $('#paso2-tab').addClass('active');
        $('#paso1').removeClass('show active');
        $('#paso2').addClass('show active');

        // Focus en cantidad
        setTimeout(() => {
            $('#cantidadInput').focus().select();
        }, 300);

        // Resetear botón de búsqueda
        $('#btnBuscar').prop('disabled', false).html('<i class="bi bi-search me-2"></i>Buscar');
    }

    /**
     * Volver al paso 1
     */
    function volverPaso1() {
        itemEncontrado = null;
        procesandoSalida = false; // Resetear estado de procesamiento
        
        // Cambiar a paso 1
        $('#paso2-tab').removeClass('active');
        $('#paso1-tab').addClass('active');
        $('#paso2').removeClass('show active');
        $('#paso1').addClass('show active');

        // Limpiar formulario
        $('#codigoInput').val('');
        setTimeout(() => {
            $('#codigoInput').focus();
        }, 100);
        $('#formSalida')[0].reset();
        $('#cantidadInput').val(1);

        // Restablecer botón de entregar
        $('#btnEntregar').prop('disabled', false).html('<i class="bi bi-check-circle me-2"></i>Entregar');
        
        // Restablecer botón de confirmar
        $('#btnConfirmarSalida').prop('disabled', false);

        // Limpiar alertas
        $('#alertPlaceholder').empty();
    }

    /**
     * Procesar salida
     */
    function procesarSalida() {
        // Evitar procesar si ya está procesando
        if (procesandoSalida) {
            return;
        }

        const cantidad = parseInt($('#cantidadInput').val());
        const responsable = $('#responsableInput').val().trim();

        // Validaciones
        if (!cantidad || cantidad <= 0) {
            mostrarAlerta('La cantidad debe ser mayor a 0', 'warning');
            return;
        }

        if (!responsable) {
            mostrarAlerta('El responsable es requerido', 'warning');
            return;
        }

        if (cantidad > itemEncontrado.cantidad_stock) {
            mostrarAlerta(`No hay suficiente stock. Stock actual: ${itemEncontrado.cantidad_stock}`, 'danger');
            return;
        }

        // Mostrar modal de confirmación
        $('#modalNombre').text(itemEncontrado.nombre);
        $('#modalCodigo').text(itemEncontrado.codigo);
        $('#modalCantidad').text(cantidad + (itemEncontrado.unidad_medida ? ' ' + itemEncontrado.unidad_medida : ' unidades'));
        $('#modalResponsable').text(responsable);
        
        const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
        modal.show();
    }

    /**
     * Confirmar y procesar salida (desde el modal)
     */
    $('#btnConfirmarSalida').on('click', function() {
        const botonConfirmar = $(this);
        const botonEntregar = $('#btnEntregar');
        
        // Marcar que estamos procesando
        procesandoSalida = true;
        
        // Deshabilitar botón de confirmar para evitar doble clic
        botonConfirmar.prop('disabled', true);
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
        if (modal) {
            modal.hide();
        }

        const cantidad = parseInt($('#cantidadInput').val());
        const responsable = $('#responsableInput').val().trim();

        // Deshabilitar botón de entregar y mostrar estado de procesamiento
        botonEntregar.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Procesando...');

        // Enviar datos
        const datos = {
            item_id: parseInt($('#itemId').val()),
            tipo_item: $('#tipoItem').val(),
            cantidad: cantidad,
            responsable_salida: responsable
        };

        $.ajax({
            url: '/api/salidas/procesar',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(datos),
            success: function(response) {
                // Rehabilitar botón de confirmar
                botonConfirmar.prop('disabled', false);
                procesandoSalida = false;
                
                if (response.success) {
                    mostrarAlerta(response.message, 'success');
                    
                    // Volver al paso 1 después de 2 segundos
                    setTimeout(() => {
                        volverPaso1();
                    }, 2000);
                } else {
                    mostrarAlerta('Error al procesar la salida', 'danger');
                    botonEntregar.prop('disabled', false).html('<i class="bi bi-check-circle me-2"></i>Entregar');
                }
            },
            error: function(xhr) {
                // Rehabilitar botón de confirmar
                botonConfirmar.prop('disabled', false);
                procesandoSalida = false;
                
                const error = xhr.responseJSON?.error || 'Error al procesar la salida';
                mostrarAlerta(error, 'danger');
                botonEntregar.prop('disabled', false).html('<i class="bi bi-check-circle me-2"></i>Entregar');
            }
        });
    });

    /**
     * Mostrar alerta
     */
    function mostrarAlerta(mensaje, tipo) {
        const iconos = {
            success: 'check-circle',
            danger: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle'
        };

        const alerta = `
            <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
                <i class="bi bi-${iconos[tipo]} me-2"></i>${mensaje}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        $('#alertPlaceholder').html(alerta);

        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
            $('.alert').alert('close');
        }, 5000);
    }
});
