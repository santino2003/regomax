$(document).ready(function() {
    // Navegación entre pasos
    $("#nextToStep2").click(function() {
        if (!$("#fecha").val() || !$("#turno").val()) {
            showAlert("Por favor complete los campos obligatorios.", "danger");
            return false;
        }
        $("#step1").removeClass("active");
        $("#step2").addClass("active");
        $("#step1-indicator").removeClass("active").addClass("completed");
        $("#step2-indicator").addClass("active");
    });
    
    $("#backToStep1").click(function() {
        $("#step2").removeClass("active");
        $("#step1").addClass("active");
        $("#step2-indicator").removeClass("active");
        $("#step1-indicator").removeClass("completed").addClass("active");
    });
    
    $("#nextToStep3").click(function() {
        $("#step2").removeClass("active");
        $("#step3").addClass("active");
        $("#step2-indicator").removeClass("active").addClass("completed");
        $("#step3-indicator").addClass("active");
    });
    
    $("#backToStep2").click(function() {
        $("#step3").removeClass("active");
        $("#step2").addClass("active");
        $("#step3-indicator").removeClass("active");
        $("#step2-indicator").removeClass("completed").addClass("active");
    });
    
    $("#nextToStep4").click(function() {
        $("#step3").removeClass("active");
        $("#step4").addClass("active");
        $("#step3-indicator").removeClass("active").addClass("completed");
        $("#step4-indicator").addClass("active");
        
        // Mostrar mensaje de información sobre la asociación automática de bolsones
        showAlert("Los bolsones no asociados serán automáticamente vinculados a este parte diario al guardarlo.", "info");
    });
    
    $("#backToStep3").click(function() {
        $("#step4").removeClass("active");
        $("#step3").addClass("active");
        $("#step4-indicator").removeClass("active");
        $("#step3-indicator").removeClass("completed").addClass("active");
    });
    
    // Validación de formulario en el envío
    $("#submitForm").click(function() {
        // Validar que todos los campos requeridos estén completos
        let isValid = true;
        $(".form-step#step3 [required]").each(function() {
            if (!$(this).val()) {
                isValid = false;
                $(this).addClass("is-invalid");
            } else {
                $(this).removeClass("is-invalid");
            }
        });
        
        if (!isValid) {
            showAlert("Por favor complete todos los campos requeridos.", "danger");
            return false;
        }
        
        // Si es válido, enviar el formulario
        $("#formNuevoParteDiario").submit();
    });
    
    // Función para mostrar alertas
    function showAlert(message, type = 'success') {
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'info' ? 'info-circle' : 'exclamation-triangle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        $('#alertContainer').html(alertHTML);
        
        // Auto-hide para mensajes de éxito después de 5 segundos
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                $('.alert').alert('close');
            }, 5000);
        }
    }
    
    // Envío del formulario
    $('#formNuevoParteDiario').on('submit', function(e) {
        e.preventDefault();
        
        // Recopilar todos los datos del formulario
        const formData = {};
        const dataArray = $(this).serializeArray();
        
        // Procesar los campos del formulario
        dataArray.forEach(item => {
            // Manejar los campos anidados (con notación punto)
            if (item.name.includes('.')) {
                const parts = item.name.split('.');
                if (!formData[parts[0]]) {
                    formData[parts[0]] = {};
                }
                formData[parts[0]][parts[1]] = item.value;
            } 
            // Manejar arrays (con notación [])
            else if (item.name.includes('[')) {
                const matches = item.name.match(/([^\[]+)\[(\d+)\]\.(.+)/);
                if (matches) {
                    const [, arrayName, index, property] = matches;
                    if (!formData[arrayName]) {
                        formData[arrayName] = [];
                    }
                    if (!formData[arrayName][index]) {
                        formData[arrayName][index] = {};
                    }
                    formData[arrayName][index][property] = item.value;
                } else {
                    formData[item.name] = item.value;
                }
            } 
            // Campos normales
            else {
                formData[item.name] = item.value;
            }
        });
        
        // Deshabilitar botón durante la operación
        const $btnSubmit = $('#submitForm');
        $btnSubmit.prop('disabled', true).html('<i class="bi bi-hourglass-split me-2"></i>Guardando...');
        
        // Enviar datos al servidor
        fetch('/api/partes-diarios/nuevo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert(data.message || '¡Parte diario creado exitosamente!', 'success');
                
                // Resetear formulario y volver al paso 1 después de unos segundos
                setTimeout(() => {
                    $('#formNuevoParteDiario')[0].reset();
                    
                    // Regresar al paso 1
                    $(".form-step").removeClass("active");
                    $("#step1").addClass("active");
                    
                    // Resetear indicadores
                    $(".step").removeClass("active").removeClass("completed");
                    $("#step1-indicator").addClass("active");
                    
                    // Configurar fecha actual por defecto
                    configurarFechaActual();
                }, 2000);
            } else {
                showAlert('Error: ' + data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error de conexión al crear el parte diario', 'danger');
        })
        .finally(() => {
            // Rehabilitar botón
            $btnSubmit.prop('disabled', false).html('<i class="bi bi-save me-1"></i>Guardar Parte Diario');
        });
    });
    
    // Función para configurar la fecha actual
    function configurarFechaActual() {
        const today = new Date();
        // Asegurar que la zona horaria local sea utilizada para la fecha
        const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const formattedDate = localDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        $('#fecha').val(formattedDate);
    }
    
    // Configurar fecha actual por defecto al cargar la página
    configurarFechaActual();
})