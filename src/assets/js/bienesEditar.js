// bienesEditar.js
// Variables globales que necesitan estar disponibles antes del DOM ready
let bienId;
let modalArchivo;
let modalEliminarArchivo;
let archivoIdToDelete = null;

// Función global para eliminar archivo (llamada desde onclick en HTML)
function eliminarArchivo(id, nombre) {
    archivoIdToDelete = id;
    $('#nombreArchivoEliminar').text(nombre);
    modalEliminarArchivo.show();
}

$(document).ready(function() {
    // Obtener el bienId del atributo data
    bienId = $('#formEditarBien').data('bien-id');
    
    // Inicializar modales
    modalArchivo = new bootstrap.Modal('#modalArchivo');
    modalEliminarArchivo = new bootstrap.Modal('#modalEliminarArchivo');
    
    // Inicializar Select2 para selección múltiple de proveedores
    $('#proveedores').select2({
        theme: 'bootstrap-5',
        placeholder: 'Seleccionar proveedores...',
        allowClear: true
    });
    
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
        
        const formData = {
            nombre: $('#nombre').val().trim(),
            descripcion: $('#descripcion').val().trim() || null,
            tipo: $('#tipo').val(),
            categoria_id: $('#categoria_id').val() || null,
            familia_id: $('#familia_id').val() || null,
            unidad_medida_id: $('#unidad_medida_id').val() || null,
            precio: parseFloat($('#precio').val()) || 0,
            cantidad_critica: $('#cantidad_critica').val() ? parseInt($('#cantidad_critica').val()) : null,
            ubicacion: $('#ubicacion').val().trim() || null,
            almacen_defecto_id: $('#almacen_defecto_id').val() || null,
            proveedores: $('#proveedores').val() || []
        };
        
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
                window.location.href = `/bienes/${bienId}`;
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
        modalArchivo.show();
    });
    
    $('#btnConfirmarArchivo').on('click', function() {
        const fileInput = $('#archivo')[0];
        if (!fileInput.files || fileInput.files.length === 0) {
            alert('Por favor seleccione un archivo');
            return;
        }
        
        const file = fileInput.files[0];
        if (file.size > 10 * 1024 * 1024) {
            alert('El archivo no puede superar los 10MB');
            return;
        }
        
        const btn = $(this);
        const originalText = btn.html();
        btn.html('<span class="spinner-border spinner-border-sm"></span>').prop('disabled', true);
        
        const formData = new FormData();
        formData.append('archivo', file);
        
        fetch(`/api/bienes/${bienId}/archivos`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Archivo subido correctamente', 'success');
                modalArchivo.hide();
                // Recargar la página para mostrar el nuevo archivo
                setTimeout(() => {
                    location.reload();
                }, 1000);
            } else {
                alert(data.error || 'Error al subir el archivo');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al subir el archivo');
        })
        .finally(() => {
            btn.html(originalText).prop('disabled', false);
        });
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
