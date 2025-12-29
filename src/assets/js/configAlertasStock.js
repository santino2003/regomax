// configAlertasStock.js
$(document).ready(function() {
    // Inicializar Select2
    $('#usuarios').select2({
        theme: 'bootstrap-5',
        placeholder: 'Seleccionar usuarios...',
        allowClear: true,
        width: '100%'
    });

    const form = $('#formConfigAlertas');
    const btnGuardar = $('#btnGuardar');
    const alertPlaceholder = $('#alertPlaceholder');

    // Función para mostrar alertas
    function showAlert(message, type) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="bi ${type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        alertPlaceholder.html(alertHtml);
        
        // Scroll suave hacia arriba
        $('html, body').animate({
            scrollTop: alertPlaceholder.offset().top - 100
        }, 500);

        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
            $('.alert').fadeOut('slow', function() {
                $(this).remove();
            });
        }, 5000);
    }

    // Manejar envío del formulario
    form.on('submit', async function(e) {
        e.preventDefault();

        // Deshabilitar botón para evitar doble clic
        btnGuardar.prop('disabled', true);
        btnGuardar.html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');

        try {
            const formData = new FormData(this);
            
            const response = await fetch('/config-alertas-stock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usuarios: $('#usuarios').val() || []
                })
            });

            const result = await response.json();

            if (result.success) {
                showAlert(result.message, 'success');
            } else {
                showAlert(result.message || 'Error al guardar la configuración', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error de conexión al guardar la configuración', 'danger');
        } finally {
            // Rehabilitar botón
            btnGuardar.prop('disabled', false);
            btnGuardar.html('<i class="bi bi-save me-2"></i>Guardar Configuración');
        }
    });

    // Mostrar contador de usuarios seleccionados
    $('#usuarios').on('change', function() {
        const count = $(this).val()?.length || 0;
        if (count > 0) {
            $(this).siblings('.form-text').html(`
                <i class="bi bi-info-circle me-1"></i>
                ${count} usuario${count > 1 ? 's' : ''} seleccionado${count > 1 ? 's' : ''} para recibir alertas
            `);
        } else {
            $(this).siblings('.form-text').html(`
                <i class="bi bi-info-circle me-1"></i>
                Los usuarios seleccionados recibirán un email cuando el stock de <strong>cualquier bien</strong> alcance su nivel crítico.
                Si no selecciona ninguno, se usarán los destinatarios por defecto configurados en el sistema.
            `);
        }
    });
});
