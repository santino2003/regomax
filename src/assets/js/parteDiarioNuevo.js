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
        
        // Recopilar todos los datos del formulario en formato FormData
        const formEl = document.getElementById('formNuevoParteDiario');
        const formData = {};
        
        // Obtener datos básicos
        formData.fecha = $('#fecha').val();
        formData.turno = $('#turno').val();
        
        // Procesar datos de control (paso 2)
        formData.datosControl = {};
        const controlInputs = formEl.querySelectorAll('[name^="datosControl."]');
        controlInputs.forEach(input => {
            const fieldName = input.name.replace('datosControl.', '');
            formData.datosControl[fieldName] = input.value;
        });
        
        // Procesar datos de grupos (paso 3)
        formData.grupos = [];
        
        // Procesar G1
        const grupoG1 = {
            nombre: 'G1',
            kgPorHora: $('#kgPorHoraG1').val() || null,
            porcentajeCarga: $('#porcentajeCargaG1').val() || null,
            porcentajeDebajo3350: $('#porcentajeDebajo3350G1').val() || null,
            criba: $('#cribaG1').val() || null
        };
        formData.grupos.push(grupoG1);
        
        // Procesar G2
        const grupoG2 = {
            nombre: 'G2',
            kgPorHora: $('#kgPorHoraG2').val() || null,
            porcentajeCarga: $('#porcentajeCargaG2').val() || null,
            porcentajeDebajo3350: $('#porcentajeDebajo3350G2').val() || null,
            criba: $('#cribaG2').val() || null
        };
        formData.grupos.push(grupoG2);
        
        // Procesar G3
        const grupoG3 = {
            nombre: 'G3',
            kgPorHora: $('#kgPorHoraG3').val() || null,
            porcentajeCarga: $('#porcentajeCargaG3').val() || null,
            porcentajeDebajo3350: $('#porcentajeDebajo3350G3').val() || null,
            criba: $('#cribaG3').val() || null
        };
        formData.grupos.push(grupoG3);
        
        // Procesar G4
        const grupoG4 = {
            nombre: 'G4',
            kgPorHora: $('#kgPorHoraG4').val() || null,
            porcentajeCarga: $('#porcentajeCargaG4').val() || null,
            porcentajeDebajo3350: $('#porcentajeDebajo3350G4').val() || null,
            criba: $('#cribaG4').val() || null
        };
        formData.grupos.push(grupoG4);
        
        // Procesar checklist de pala mecánica (paso 4) - Aplanar la estructura para el backend
        formData.checkListPala = {
            horasEquipo: $('#horasEquipo').val() || null,
            horometro: $('#horometro').val() || null
        };
        
        // Agregar propiedades aplanadas para nivel de combustible
        formData.checkListPala.nivelCombustibleEstado = $('#nivelCombustibleEstado').val() || null;
        formData.checkListPala.nivelCombustibleObs = $('#nivelCombustibleObs').val() || null;
        
        // Agregar propiedades aplanadas para nivel de refrigerante
        formData.checkListPala.nivelRefrigeranteEstado = $('#nivelRefrigeranteEstado').val() || null;
        formData.checkListPala.nivelRefrigeranteObs = $('#nivelRefrigeranteObs').val() || null;
        
        // Agregar propiedades aplanadas para nivel de aceite motor
        formData.checkListPala.nivelAceiteMotorEstado = $('#nivelAceiteMotorEstado').val() || null;
        formData.checkListPala.nivelAceiteMotorObs = $('#nivelAceiteMotorObs').val() || null;
        
        // Agregar propiedades aplanadas para nivel de aceite hidráulico
        formData.checkListPala.nivelAceiteHidraulicoEstado = $('#nivelAceiteHidraulicoEstado').val() || null;
        formData.checkListPala.nivelAceiteHidraulicoObs = $('#nivelAceiteHidraulicoObs').val() || null;
        
        // Agregar propiedades aplanadas para filtro aire motor
        formData.checkListPala.filtroAireMotorEstado = $('#filtroAireMotorEstado').val() || null;
        formData.checkListPala.filtroAireMotorObs = $('#filtroAireMotorObs').val() || null;
        
        // Agregar propiedades aplanadas para presión neumáticos
        formData.checkListPala.presionNeumaticosEstado = $('#presionNeumaticosEstado').val() || null;
        formData.checkListPala.presionNeumaticosObs = $('#presionNeumaticosObs').val() || null;
        
        // Agregar propiedades aplanadas para limpieza general
        formData.checkListPala.limpiezaGeneralEstado = $('#limpiezaGeneralEstado').val() || null;
        formData.checkListPala.limpiezaGeneralObs = $('#limpiezaGeneralObs').val() || null;
        
        // Deshabilitar botón durante la operación
        const $btnSubmit = $('#submitForm');
        $btnSubmit.prop('disabled', true).html('<i class="bi bi-hourglass-split me-2"></i>Guardando...');
        
        console.log('Datos a enviar:', formData); // Log para depuración
        
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