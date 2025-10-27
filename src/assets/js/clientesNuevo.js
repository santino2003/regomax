$(document).ready(function() {
    // Función para formatear CUIT mientras se escribe
    $('#cuit').on('input', function() {
        let value = $(this).val().replace(/\D/g, ''); // Remover todo excepto números
        
        if (value.length > 2) {
            value = value.substring(0, 2) + '-' + value.substring(2);
        }
        if (value.length > 11) {
            value = value.substring(0, 11) + '-' + value.substring(11);
        }
        if (value.length > 13) {
            value = value.substring(0, 13);
        }
        
        $(this).val(value);
    });
    
    // Función para mostrar alertas
    function showAlert(message, type = 'success') {
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        $('#alertPlaceholder').html(alertHTML);
        
        // Auto-ocultar después de 5 segundos si es éxito
        if (type === 'success') {
            setTimeout(() => {
                $('.alert').alert('close');
            }, 5000);
        }
    }
    
    // Manejo del envío del formulario
    $('#formNuevoCliente').on('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Validación del formulario mediante Bootstrap
        if (!this.checkValidity()) {
            $(this).addClass('was-validated');
            return;
        }
        
        // Deshabilitar botón para evitar múltiples envíos
        const submitBtn = $('#submitBtn');
        const originalText = submitBtn.html();
        submitBtn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...').prop('disabled', true);
        
        // Preparar datos
        const formData = {
            empresa: $('#empresa').val().trim(),
            cuit: $('#cuit').val().trim(),
            correo: $('#correo').val().trim(),
            telefono: $('#telefono').val().trim()
        };
        
        // Enviar solicitud
        fetch('/api/clientes-nfu/nuevo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            // Verificar si la respuesta es JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            } else {
                // Si no es JSON, obtener el texto y lanzar un error
                return response.text().then(text => {
                    console.error('Respuesta no-JSON recibida:', text);
                    throw new Error('La respuesta del servidor no es JSON válido');
                });
            }
        })
        .then(data => {
            if (data.success) {
                showAlert(`¡Cliente "${formData.empresa}" creado exitosamente!`);
                
                // Limpiar formulario después de 2 segundos
                setTimeout(() => {
                    $('#formNuevoCliente')[0].reset();
                    $('#formNuevoCliente').removeClass('was-validated');
                    
                    // Opcional: redirigir a la lista de clientes
                    window.location.href = '/clientes-nfu';
                }, 2000);
            } else {
                showAlert(`Error: ${data.error || data.message}`, 'danger');
                console.error('Error en respuesta:', data);
            }
        })
        .catch(error => {
            showAlert(`Error: ${error.message}`, 'danger');
            console.error('Error en solicitud:', error);
        })
        .finally(() => {
            // Restaurar estado del botón
            submitBtn.html(originalText).prop('disabled', false);
        });
    });
});
