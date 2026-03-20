/**
 * Gestión de Pagos - JavaScript
 * Maneja la funcionalidad de la página de listado de pagos
 */

// Variable global para almacenar el ID del pago a marcar
let pagoIdSeleccionado = null;

// Variable global para refinanciación
let refinanciarData = {
    pagoId: null,
    montoOriginal: 0,
    cuotas: []
};

// Variable para almacenar la acción de confirmación
let accionConfirmacion = null;

/**
 * Mostrar mensaje con modal
 */
function mostrarMensaje(titulo, mensaje, tipo = 'info') {
    const modal = new bootstrap.Modal(document.getElementById('modalMensaje'));
    const header = document.getElementById('modalMensajeHeader');
    const icon = document.getElementById('modalMensajeIcon');
    
    document.getElementById('modalMensajeTitulo').textContent = titulo;
    document.getElementById('modalMensajeCuerpo').textContent = mensaje;
    
    // Cambiar color según el tipo
    header.className = 'modal-header';
    icon.className = 'bi me-2';
    
    switch(tipo) {
        case 'success':
            header.classList.add('bg-success', 'text-white');
            icon.classList.add('bi-check-circle');
            break;
        case 'error':
            header.classList.add('bg-danger', 'text-white');
            icon.classList.add('bi-x-circle');
            break;
        case 'warning':
            header.classList.add('bg-warning');
            icon.classList.add('bi-exclamation-triangle');
            break;
        default:
            header.classList.add('bg-info', 'text-white');
            icon.classList.add('bi-info-circle');
    }
    
    modal.show();
}

/**
 * Mostrar confirmación con modal
 */
function mostrarConfirmacion(mensaje, callback) {
    const modal = new bootstrap.Modal(document.getElementById('modalConfirmacion'));
    document.getElementById('modalConfirmacionCuerpo').innerHTML = mensaje.replace(/\n/g, '<br>');
    
    accionConfirmacion = callback;
    
    modal.show();
}

/**
 * Inicialización cuando el DOM está listo
 */
$(document).ready(function() {
    // Inicializar Select2
    $('#proveedor_id').select2({
        theme: 'bootstrap-5',
        placeholder: 'Todos los proveedores',
        allowClear: true,
        language: {
            noResults: function() {
                return "No se encontraron resultados";
            },
            searching: function() {
                return "Buscando...";
            }
        }
    });

    // Configurar botón de confirmación
    document.getElementById('btnConfirmarAccion').addEventListener('click', function() {
        if (accionConfirmacion) {
            const modalConfirmacion = bootstrap.Modal.getInstance(document.getElementById('modalConfirmacion'));
            modalConfirmacion.hide();
            accionConfirmacion();
            accionConfirmacion = null;
        }
    });

    // Configurar logout
    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        mostrarConfirmacion('¿Está seguro que desea cerrar sesión?', function() {
            fetch('/auth/logout', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(() => {
                window.location.href = '/login';
            })
            .catch(error => {
                console.error('Error:', error);
                window.location.href = '/login';
            });
        });
    });
});

/**
 * Abrir el modal para marcar un pago como pagado
 */
function marcarPagado(pagoId) {
    pagoIdSeleccionado = pagoId;
    document.getElementById('detallePago').value = '';
    const modal = new bootstrap.Modal(document.getElementById('modalMarcarPagado'));
    modal.show();
}

/**
 * Confirmar y marcar el pago como pagado
 */
async function confirmarMarcarPagado() {
    if (!pagoIdSeleccionado) return;

    const detalle = document.getElementById('detallePago').value.trim();

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/pagos/${pagoIdSeleccionado}/marcar-pagado`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ detalle: detalle || null })
        });

        const data = await response.json();

        if (data.success) {
            mostrarMensaje('Éxito', 'Pago marcado como pagado exitosamente', 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            mostrarMensaje('Error', data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error', 'Error al marcar el pago como pagado', 'error');
    }
}

/**
 * Abrir el modal de refinanciación
 */
function abrirModalRefinanciar(pagoId, proveedorNombre, montoOriginal) {
    refinanciarData.pagoId = pagoId;
    refinanciarData.montoOriginal = parseFloat(montoOriginal);
    refinanciarData.cuotas = [];
    
    document.getElementById('refinanciarProveedor').textContent = proveedorNombre;
    document.getElementById('refinanciarMontoOriginal').textContent = '$' + refinanciarData.montoOriginal.toFixed(2);
    
    // Generar cuotas iniciales
    document.getElementById('cantidadCuotas').value = 3;
    document.getElementById('observacionesRefinanciar').value = '';
    generarCuotas();
    
    const modal = new bootstrap.Modal(document.getElementById('modalRefinanciar'));
    modal.show();
}

/**
 * Generar las filas de cuotas editables
 */
function generarCuotas() {
    const cantidadCuotas = parseInt(document.getElementById('cantidadCuotas').value) || 0;
    
    if (cantidadCuotas < 2 || cantidadCuotas > 60) {
        document.getElementById('tablaCuotasEditable').innerHTML = '<tr><td colspan="3" class="text-center text-muted">Ingrese una cantidad válida de cuotas (2-60)</td></tr>';
        document.getElementById('badgeTotalCuotas').textContent = '0';
        actualizarTotales();
        return;
    }

    document.getElementById('badgeTotalCuotas').textContent = cantidadCuotas;

    // Calcular fecha base (mañana)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Calcular monto equitativo como sugerencia
    const montoCuota = (refinanciarData.montoOriginal / cantidadCuotas).toFixed(2);

    const tbody = document.getElementById('tablaCuotasEditable');
    tbody.innerHTML = '';

    for (let i = 0; i < cantidadCuotas; i++) {
        const fechaCuota = new Date(tomorrow);
        fechaCuota.setMonth(fechaCuota.getMonth() + i);
        const fechaFormatted = fechaCuota.toISOString().split('T')[0];

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="align-middle text-center">
                <strong>Cuota ${i + 1}</strong>
            </td>
            <td>
                <input type="date" 
                       class="form-control form-control-sm" 
                       id="fecha_${i}" 
                       value="${fechaFormatted}"
                       onchange="actualizarTotales()"
                       required>
            </td>
            <td>
                <input type="number" 
                       class="form-control form-control-sm" 
                       id="monto_${i}" 
                       step="0.01"
                       min="0.01"
                       value="${montoCuota}"
                       onchange="actualizarTotales()"
                       required>
            </td>
        `;
        tbody.appendChild(row);
    }

    actualizarTotales();
}

/**
 * Actualizar totales de refinanciación
 */
function actualizarTotales() {
    const cantidadCuotas = parseInt(document.getElementById('cantidadCuotas').value) || 0;
    let total = 0;

    for (let i = 0; i < cantidadCuotas; i++) {
        const inputMonto = document.getElementById(`monto_${i}`);
        if (inputMonto) {
            const monto = parseFloat(inputMonto.value) || 0;
            total += monto;
        }
    }

    const diferencia = total - refinanciarData.montoOriginal;

    document.getElementById('totalCuotas').textContent = '$' + total.toFixed(2);
    document.getElementById('totalRefinanciado').textContent = '$' + total.toFixed(2);
    
    const diferenciaElement = document.getElementById('diferenciaRefinanciado');
    
    if (diferencia > 0.01) {
        diferenciaElement.textContent = '+$' + diferencia.toFixed(2);
        diferenciaElement.className = 'text-danger fw-bold';
    } else if (diferencia < -0.01) {
        diferenciaElement.textContent = '$' + diferencia.toFixed(2);
        diferenciaElement.className = 'text-success fw-bold';
    } else {
        diferenciaElement.textContent = '$0.00';
        diferenciaElement.className = 'text-muted fw-bold';
    }
}

/**
 * Confirmar la refinanciación
 */
async function confirmarRefinanciar() {
    const cantidadCuotas = parseInt(document.getElementById('cantidadCuotas').value);
    const observacionesGenerales = document.getElementById('observacionesRefinanciar').value.trim();
    
    // Validaciones
    if (!cantidadCuotas || cantidadCuotas < 2 || cantidadCuotas > 60) {
        mostrarMensaje('Validación', 'La cantidad de cuotas debe estar entre 2 y 60', 'warning');
        return;
    }

    // Recopilar datos de todas las cuotas
    const cuotas = [];
    for (let i = 0; i < cantidadCuotas; i++) {
        const fecha = document.getElementById(`fecha_${i}`)?.value;
        const monto = parseFloat(document.getElementById(`monto_${i}`)?.value);

        if (!fecha) {
            mostrarMensaje('Validación', `La cuota ${i + 1} debe tener una fecha`, 'warning');
            return;
        }

        if (!monto || monto <= 0) {
            mostrarMensaje('Validación', `La cuota ${i + 1} debe tener un monto mayor a 0`, 'warning');
            return;
        }

        cuotas.push({
            numeroCuota: i + 1,
            fecha: fecha,
            monto: monto,
            observacion: ''
        });
    }

    // Calcular total
    const totalRefinanciado = cuotas.reduce((sum, c) => sum + c.monto, 0);
    const diferencia = totalRefinanciado - refinanciarData.montoOriginal;

    // VALIDACIÓN: No permitir refinanciar si el total es mayor al monto original
    if (diferencia > 0.01) {
        mostrarMensaje('Error de Refinanciación', 
            `No se puede refinanciar con un monto mayor al original.\n\nMonto original: $${refinanciarData.montoOriginal.toFixed(2)}\nTotal refinanciado: $${totalRefinanciado.toFixed(2)}\nDiferencia: +$${diferencia.toFixed(2)}\n\nEl total debe ser igual o menor al monto original.`, 
            'error');
        return;
    }

    const mensajeConfirmacion = `
        <strong>¿Está seguro que desea refinanciar este pago?</strong>
        <div class="mt-3">
            <table class="table table-sm">
                <tr>
                    <td><strong>Pago original:</strong></td>
                    <td class="text-end">$${refinanciarData.montoOriginal.toFixed(2)}</td>
                </tr>
                <tr>
                    <td><strong>Total refinanciado:</strong></td>
                    <td class="text-end">$${totalRefinanciado.toFixed(2)}</td>
                </tr>
                <tr class="${diferencia >= 0 ? 'text-danger' : 'text-success'}">
                    <td><strong>Diferencia:</strong></td>
                    <td class="text-end"><strong>${diferencia >= 0 ? '+' : ''}$${diferencia.toFixed(2)}</strong></td>
                </tr>
            </table>
        </div>
        <p class="text-muted mt-3">Se crearán ${cantidadCuotas} nuevas cuotas y se eliminará el pago original.</p>
    `;

    mostrarConfirmacion(mensajeConfirmacion, async function() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/pagos/${refinanciarData.pagoId}/refinanciar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cuotas: cuotas,
                    observacionesGenerales: observacionesGenerales
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                mostrarMensaje('Éxito', `Pago refinanciado exitosamente. Se crearon ${cantidadCuotas} nuevas cuotas.`, 'success');
                setTimeout(() => location.reload(), 1500);
            } else {
                mostrarMensaje('Error', data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarMensaje('Error', 'Error al refinanciar el pago', 'error');
        }
    });
}
