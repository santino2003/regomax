$(document).ready(function() {
    // Inicializar Select2 para los dropdowns
    $('#almacen_id').select2({
        theme: 'bootstrap-5',
        placeholder: 'Seleccione un almacén (opcional)',
        allowClear: true
    });

    $('#item_id').select2({
        theme: 'bootstrap-5',
        placeholder: 'Seleccione un bien',
        allowClear: false
    });

    // Establecer fecha actual por defecto
    const hoy = new Date().toISOString().split('T')[0];
    $('#fecha').val(hoy);

    // Cargar bienes inicialmente
    cargarBienes();

    /**
     * Cargar bienes desde el servidor
     */
    function cargarBienes() {
        $.ajax({
            url: '/api/bienes?limit=10000', // Cargar todos los bienes
            method: 'GET',
            success: function(response) {
                console.log('Response bienes:', response); // Debug
                
                // El endpoint devuelve: { success: true, data: { bienes: [...], paginacion: {...} } }
                if (response.success && response.data && Array.isArray(response.data.bienes)) {
                    todosLosBienes = response.data.bienes;
                } else if (response.success && Array.isArray(response.data)) {
                    todosLosBienes = response.data;
                } else if (Array.isArray(response)) {
                    todosLosBienes = response;
                } else {
                    console.error('Formato de respuesta inesperado:', response);
                    todosLosBienes = [];
                }
                
                console.log('Bienes cargados:', todosLosBienes.length);
                
                // Cargar todos los bienes en el dropdown
                $('#item_id').empty().append('<option value="">Seleccione un bien</option>');
                todosLosBienes.forEach(bien => {
                    $('#item_id').append(
                        $('<option></option>')
                            .val(bien.id)
                            .text(`${bien.codigo} - ${bien.nombre}`)
                            .data('stock', bien.cantidad_stock)
                    );
                });
            },
            error: function(xhr, status, error) {
                console.error('Error al cargar bienes:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudieron cargar los bienes'
                });
            }
        });
    }

    /**
     * Limpiar formulario
     */
    $('#btnLimpiar').on('click', function() {
        $('#formAjuste')[0].reset();
        $('#almacen_id').val(null).trigger('change');
        $('#item_id').val(null).trigger('change');
        $('#radioEntrada').prop('checked', true);
        $('#fecha').val(hoy);
    });

    /**
     * Enviar formulario
     */
    $('#formAjuste').on('submit', function(e) {
        e.preventDefault();

        // Validar que se haya seleccionado un bien
        if (!$('#item_id').val()) {
            Swal.fire({
                icon: 'warning',
                title: 'Atención',
                text: 'Debe seleccionar un bien'
            });
            return;
        }

        // Validar que la cantidad sea mayor a 0
        const cantidad = parseInt($('#cantidad').val());
        if (!cantidad || cantidad <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Atención',
                text: 'La cantidad debe ser mayor a 0'
            });
            return;
        }

        // Confirmar antes de enviar
        const nombreBien = $('#item_id option:selected').text();
        const tipoMovimiento = $('input[name="tipo_movimiento"]:checked').val();
        
        // Mostrar texto amigable pero enviar el valor AJUSTE_*
        const tipoTexto = tipoMovimiento === 'AJUSTE_ENTRADA' ? 'Entrada' : 'Salida';
        
        Swal.fire({
            title: '¿Confirmar movimiento de inventario?',
            html: `
                <div class="text-start">
                    <p><strong>Bien:</strong> ${nombreBien}</p>
                    <p><strong>Tipo:</strong> ${tipoTexto}</p>
                    <p><strong>Cantidad:</strong> ${cantidad}</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, registrar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#0d6efd'
        }).then((result) => {
            if (result.isConfirmed) {
                procesarAjuste();
            }
        });
    });

    /**
     * Procesar ajuste de inventario
     */
    function procesarAjuste() {
        const formData = {
            tipo_item: 'bien',
            item_id: $('#item_id').val(),
            tipo_movimiento: $('input[name="tipo_movimiento"]:checked').val(),
            cantidad: $('#cantidad').val(),
            almacen_id: $('#almacen_id').val() || null,
            precio_unitario: $('#precio_unitario').val() || null,
            cliente: $('#cliente').val() || null,
            responsable: $('#responsable').val(),
            fecha: $('#fecha').val(),
            observaciones: $('#observaciones').val() || null
        };

        // Mostrar loading
        Swal.fire({
            title: 'Procesando...',
            text: 'Registrando ajuste de inventario',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: '/api/ajustes-inventario',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                if (response.success) {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Éxito!',
                        html: `
                            <p>${response.message}</p>
                            <p><strong>Stock anterior:</strong> ${response.data.stock_anterior}</p>
                            <p><strong>Stock nuevo:</strong> ${response.data.stock_nuevo}</p>
                            <p><strong>Diferencia:</strong> ${response.data.diferencia}</p>
                        `,
                        confirmButtonText: 'Aceptar'
                    }).then(() => {
                        // Limpiar formulario después del éxito
                        $('#btnLimpiar').click();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.message || 'No se pudo procesar el ajuste'
                    });
                }
            },
            error: function(xhr, status, error) {
                console.error('Error al procesar ajuste:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Ocurrió un error al procesar el ajuste'
                });
            }
        });
    }
});
