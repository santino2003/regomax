$(document).ready(function() {
    let clienteIdToDelete = null;
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteClienteModal'));
    
    // Manejar clic en botón de eliminar
    $('.btn-delete').on('click', function() {
        clienteIdToDelete = $(this).data('id');
        const empresaName = $(this).data('empresa');
        
        $('#deleteClienteEmpresa').text(empresaName);
        deleteModal.show();
    });
    
    // Confirmar eliminación
    $('#confirmDelete').on('click', function() {
        if (!clienteIdToDelete) return;
        
        // Deshabilitar botón mientras se procesa
        const btn = $(this);
        const originalText = btn.html();
        btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Eliminando...').prop('disabled', true);
        
        // Realizar petición de eliminación
        fetch(`/api/clientes-nfu/${clienteIdToDelete}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Cerrar modal
                deleteModal.hide();
                
                // Mostrar mensaje de éxito y recargar página
                alert('Cliente eliminado exitosamente');
                window.location.reload();
            } else {
                alert('Error: ' + (data.message || 'No se pudo eliminar el cliente'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al eliminar el cliente');
        })
        .finally(() => {
            // Restaurar botón
            btn.html(originalText).prop('disabled', false);
        });
    });
});
