/**
 * Funcionalidades para la vista de visualización de órdenes de venta
 */
document.addEventListener('DOMContentLoaded', function() {
    // Referencia al botón de eliminar y el modal
    const deleteButtons = document.querySelectorAll('.btn-delete');
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    
    // Variable para almacenar el ID de la orden a eliminar
    let ordenIdToDelete = null;
    
    // Manejar clic en botón de eliminar
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            ordenIdToDelete = this.getAttribute('data-id');
            deleteModal.show();
        });
    });
    
    // Manejar confirmación de eliminación
    confirmDeleteBtn.addEventListener('click', function() {
        if (ordenIdToDelete) {
            eliminarOrden(ordenIdToDelete);
        }
    });
    
    /**
     * Función para eliminar una orden mediante API
     * @param {string|number} id - ID de la orden a eliminar
     */
    function eliminarOrden(id) {
        // Mostrar indicador de carga
        confirmDeleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Eliminando...';
        confirmDeleteBtn.disabled = true;
        
        fetch(`/api/ordenes/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Éxito - redirigir a la lista de órdenes
                window.location.href = '/ordenes?deleted=true';
            } else {
                // Error - mostrar mensaje
                alert('Error al eliminar la orden: ' + data.message);
                deleteModal.hide();
                confirmDeleteBtn.innerHTML = 'Eliminar';
                confirmDeleteBtn.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error al eliminar la orden:', error);
            alert('Error al procesar la solicitud. Por favor, inténtelo de nuevo.');
            deleteModal.hide();
            confirmDeleteBtn.innerHTML = 'Eliminar';
            confirmDeleteBtn.disabled = false;
        });
    }
    
    // Manejo de despacho manual
    const despachoModal = new bootstrap.Modal(document.getElementById('modalDespachoManual'));
    
    // Abrir modal de despacho manual
    document.getElementById('btnDespachoManual').addEventListener('click', function() {
        // Resetear valores
        document.querySelectorAll('.cantidad-despachar').forEach(input => {
            input.value = 0;
        });
        document.getElementById('observacionesDespacho').value = '';
        
        // Mostrar modal
        despachoModal.show();
    });
    
    // Validar que las cantidades no excedan el máximo
    document.querySelectorAll('.cantidad-despachar').forEach(input => {
        input.addEventListener('change', function() {
            const max = parseFloat(this.dataset.max);
            const val = parseFloat(this.value);
            if (val > max) {
                alert(`La cantidad máxima disponible es ${max}`);
                this.value = max;
            } else if (val < 0) {
                this.value = 0;
            }
        });
    });
    
    // Procesar el despacho manual
    document.getElementById('btnConfirmarDespachoManual').addEventListener('click', function() {
        const ordenId = window.location.pathname.split('/').pop();
        const observaciones = document.getElementById('observacionesDespacho').value;
        const productos = [];
        
        // Recopilar cantidades mayores a cero
        document.querySelectorAll('.cantidad-despachar').forEach(input => {
            const cantidad = parseFloat(input.value);
            if (cantidad > 0) {
                productos.push({
                    producto: input.dataset.producto,
                    cantidad: cantidad
                });
            }
        });
        
        // Validar que haya al menos un producto
        if (productos.length === 0) {
            alert('Debe ingresar al menos una cantidad para despachar');
            return;
        }
        
        // Mostrar estado de carga
        const btnConfirmar = document.getElementById('btnConfirmarDespachoManual');
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i> Procesando...';
        
        // Enviar a la API
        fetch(`/api/despachos/manual/${ordenId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                observaciones: observaciones,
                productos: productos
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Despacho manual procesado correctamente');
                despachoModal.hide();
                // Recargar la página para ver los cambios
                window.location.reload();
            } else {
                alert(`Error: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al procesar el despacho manual');
        })
        .finally(() => {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = '<i class="bi bi-send me-1"></i>Procesar Despacho Manual';
        });
    });
});