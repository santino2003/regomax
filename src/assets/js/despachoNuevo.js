$(document).ready(function() {
    // Variables globales
    let ordenSeleccionada = null;
    let detallesOrden = [];
    let bolsonesEscaneados = [];
    let totalPeso = 0;
    
    // Inicializar tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Inicializar modales
    const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
    const confirmarModal = new bootstrap.Modal(document.getElementById('confirmarModal'));
    const exitoModal = new bootstrap.Modal(document.getElementById('exitoModal'));
    
    // Selección de orden
    $('#ordenSelect').on('change', function() {
        const ordenId = $(this).val();
        if (!ordenId) {
            $('#ordenInfo').hide();
            $('#codigoBolson').prop('disabled', true);
            $('#btnAgregarManual').prop('disabled', true);
            resetearBolsones();
            return;
        }
        
        // Cargar los detalles de la orden
        cargarDetallesOrden(ordenId);
    });
    
    // Función para cargar los detalles de la orden
    function cargarDetallesOrden(ordenId) {
        $('#codigoBolson').prop('disabled', true);
        $('#btnAgregarManual').prop('disabled', true);
        
        fetch(`/api/ordenes/${ordenId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    ordenSeleccionada = data.data;
                    detallesOrden = ordenSeleccionada.productos || [];
                    
                    // Mostrar detalles de la orden
                    let detallesHTML = `
                        <div class="mb-2">
                            <strong>Cliente:</strong> ${ordenSeleccionada.cliente}
                        </div>
                        <div class="mb-2">
                            <strong>Fecha:</strong> ${new Date(ordenSeleccionada.fecha).toLocaleDateString()}
                        </div>
                        <div class="mb-3">
                            <strong>Estado:</strong> <span class="badge bg-info">${ordenSeleccionada.estado}</span>
                        </div>
                        <div>
                            <strong>Productos:</strong>
                            <ul class="list-group list-group-flush mt-2">
                    `;
                    
                    detallesOrden.forEach(prod => {
                        detallesHTML += `
                            <li class="list-group-item d-flex justify-content-between align-items-center p-2">
                                ${prod.producto}
                                <span class="badge bg-primary rounded-pill">${prod.cantidad} kg</span>
                            </li>
                        `;
                    });
                    
                    detallesHTML += `
                            </ul>
                        </div>
                    `;
                    
                    $('#ordenDetalles').html(detallesHTML);
                    $('#ordenInfo').show();
                    
                    // Habilitar escáner
                    $('#codigoBolson').prop('disabled', false).focus();
                    $('#btnAgregarManual').prop('disabled', false);
                    
                    // Resetear bolsones escaneados
                    resetearBolsones();
                } else {
                    mostrarError('Error al cargar los detalles de la orden');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                mostrarError('Error de conexión al cargar los detalles de la orden');
            });
    }
    
    // Manejar entrada del escáner (enter después de escanear)
    $('#codigoBolson').on('keydown', function(e) {
        if (e.keyCode === 13) { // Enter key
            e.preventDefault();
            const codigo = $(this).val().trim();
            if (codigo) {
                procesarCodigoBolson(codigo);
                $(this).val('').focus(); // Limpiar para el próximo escaneo
            }
        }
    });
    
    // Botón para agregar código manualmente
    $('#btnAgregarManual').on('click', function() {
        const codigo = $('#codigoBolson').val().trim();
        if (codigo) {
            procesarCodigoBolson(codigo);
            $('#codigoBolson').val('').focus();
        } else {
            mostrarError('Ingrese un código de bolsón para agregar');
        }
    });
    
    // Procesar el código del bolsón
    function procesarCodigoBolson(codigo) {
        // Verificar si el bolsón ya fue escaneado
        if (bolsonesEscaneados.some(b => b.codigo === codigo)) {
            mostrarError(`El bolsón con código ${codigo} ya fue agregado al listado actual`);
            return;
        }
        
        // Verificar si el bolsón existe y si ya ha sido despachado
        fetch(`/api/despachos/verificar-bolson/${codigo}`)
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    mostrarError(`Error: ${data.message}`);
                    return;
                }
                
                if (data.data.despachado) {
                    mostrarError(`El bolsón con código ${codigo} ya fue despachado anteriormente`);
                    return;
                }
                
                // Verificar que el producto del bolsón está en la orden
                const bolson = data.data.bolson;
                const productoEnOrden = detallesOrden.find(p => p.producto === bolson.producto);
                
                if (!productoEnOrden) {
                    mostrarError(`El producto "${bolson.producto}" no está en la orden seleccionada`);
                    return;
                }
                
                // Agregar el bolsón a la lista
                agregarBolsonALista(bolson);
                actualizarTotales();
            })
            .catch(error => {
                console.error('Error:', error);
                mostrarError('Error de conexión al verificar el bolsón');
            });
    }
    
    // Agregar bolsón a la lista en pantalla
    function agregarBolsonALista(bolson) {
        // Agregar al array de bolsones escaneados
        bolsonesEscaneados.push(bolson);
        
        // Actualizar tabla
        actualizarTablaBolsones();
        
        // Habilitar botón de despacho si hay bolsones
        if (bolsonesEscaneados.length > 0) {
            $('#btnDespachar').prop('disabled', false);
        }
    }
    
    // Actualizar la tabla de bolsones en pantalla
    function actualizarTablaBolsones() {
        // Ocultar mensaje de tabla vacía si hay bolsones
        if (bolsonesEscaneados.length > 0) {
            $('#filaVacia').hide();
            $('#tablaTotales').show();
        } else {
            $('#filaVacia').show();
            $('#tablaTotales').hide();
        }
        
        // Actualizar contador
        $('#contadorBolsones').text(bolsonesEscaneados.length);
        
        // Limpiar filas existentes (excepto la de vacío)
        $('#tablaBolsones tr:not(#filaVacia)').remove();
        
        // Agregar filas para cada bolsón
        bolsonesEscaneados.forEach((bolson, index) => {
            const fila = $('<tr>');
            fila.html(`
                <td>${index + 1}</td>
                <td>${bolson.codigo}</td>
                <td>${bolson.producto}</td>
                <td>${parseFloat(bolson.peso).toFixed(2)} kg</td>
                <td>
                    <button type="button" class="btn btn-sm btn-danger btnEliminarBolson" data-index="${index}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `);
            
            $('#tablaBolsones').append(fila);
        });
        
        // Agregar evento para eliminar bolsones
        $('.btnEliminarBolson').on('click', function() {
            const index = $(this).data('index');
            eliminarBolson(index);
        });
    }
    
    // Eliminar un bolsón de la lista
    function eliminarBolson(index) {
        bolsonesEscaneados.splice(index, 1);
        actualizarTablaBolsones();
        actualizarTotales();
        
        // Deshabilitar botón de despacho si no hay bolsones
        if (bolsonesEscaneados.length === 0) {
            $('#btnDespachar').prop('disabled', true);
        }
    }
    
    // Actualizar totales en la tabla
    function actualizarTotales() {
        totalPeso = bolsonesEscaneados.reduce((sum, bolson) => sum + parseFloat(bolson.peso || 0), 0);
        $('#pesoTotal').text(`${totalPeso.toFixed(2)} kg`);
    }
    
    // Resetear la lista de bolsones escaneados
    function resetearBolsones() {
        bolsonesEscaneados = [];
        actualizarTablaBolsones();
        actualizarTotales();
        $('#btnDespachar').prop('disabled', true);
    }
    
    // Función para mostrar errores
    function mostrarError(mensaje) {
        $('#errorMessage').text(mensaje);
        errorModal.show();
    }
    
    // Botón para procesar el despacho
    $('#btnDespachar').on('click', function() {
        if (!ordenSeleccionada || !ordenSeleccionada.id) {
            mostrarError('Debe seleccionar una orden');
            return;
        }
        
        if (bolsonesEscaneados.length === 0) {
            mostrarError('Debe escanear al menos un bolsón');
            return;
        }
        
        // Agrupar bolsones por producto y calcular peso total por producto
        const productosTotales = {};
        bolsonesEscaneados.forEach(bolson => {
            if (!productosTotales[bolson.producto]) {
                productosTotales[bolson.producto] = {
                    producto: bolson.producto,
                    cantidad: 0,
                    bolsones: []
                };
            }
            productosTotales[bolson.producto].cantidad += parseFloat(bolson.peso || 0);
            productosTotales[bolson.producto].bolsones.push(bolson.codigo);
        });
        
        // Crear resumen para confirmación
        let resumenHTML = `
            <h6>Resumen del Despacho</h6>
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cantidad en Orden</th>
                        <th>Cantidad a Despachar</th>
                        <th>Cantidad Restante</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        for (const [producto, totales] of Object.entries(productosTotales)) {
            const productoOrden = detallesOrden.find(p => p.producto === producto);
            
            if (!productoOrden) {
                mostrarError(`El producto "${producto}" no está en la orden seleccionada`);
                return;
            }
            
            const cantidadOrden = parseFloat(productoOrden.cantidad);
            const cantidadDespachar = parseFloat(totales.cantidad);
            const cantidadRestante = Math.max(0, cantidadOrden - cantidadDespachar);
            
            const alertClass = cantidadDespachar > cantidadOrden ? 'table-danger' : '';
            
            resumenHTML += `
                <tr class="${alertClass}">
                    <td>${producto}</td>
                    <td>${cantidadOrden.toFixed(2)} kg</td>
                    <td>${cantidadDespachar.toFixed(2)} kg</td>
                    <td>${cantidadRestante.toFixed(2)} kg</td>
                </tr>
            `;
            
            // Advertencia si se está despachando más de lo que hay en la orden
            if (cantidadDespachar > cantidadOrden) {
                resumenHTML += `
                    <tr class="table-warning">
                        <td colspan="4" class="text-center">
                            <i class="bi bi-exclamation-triangle-fill me-1 text-warning"></i>
                            <small>Está despachando más cantidad de "${producto}" de la solicitada en la orden</small>
                        </td>
                    </tr>
                `;
            }
        }
        
        resumenHTML += `
                </tbody>
            </table>
            <div class="mt-2">
                <strong>Total Bolsones:</strong> ${bolsonesEscaneados.length}
                <br>
                <strong>Peso Total:</strong> ${totalPeso.toFixed(2)} kg
            </div>
        `;
        
        $('#resumenDespacho').html(resumenHTML);
        confirmarModal.show();
    });
    
    // Botón para confirmar el despacho
    $('#btnConfirmarDespacho').on('click', function() {
        // Deshabilitar botón para evitar múltiples envíos
        $(this).prop('disabled', true).html('<i class="spinner-border spinner-border-sm me-2"></i>Procesando...');
        
        // Preparar datos para el despacho
        const despachoData = {
            ordenVentaId: ordenSeleccionada.id,
            codigos: bolsonesEscaneados.map(b => b.codigo),
            observaciones: $('#observaciones').val()
        };
        
        // Enviar datos al servidor
        fetch('/api/despachos/nuevo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(despachoData)
        })
        .then(response => response.json())
        .then(data => {
            // Ocultar modal de confirmación
            confirmarModal.hide();
            
            if (data.success) {
                // Mostrar detalles del éxito
                let detalleHTML = `
                    <div class="alert alert-success mt-3">
                        <ul class="mb-0">
                            <li>Bolsones despachados: ${data.data.bolsonesDespachados}</li>
                `;
                
                if (data.data.ordenCompleta) {
                    detalleHTML += `<li>La orden ha sido completada y pasada a estado "En Logística"</li>`;
                }
                
                detalleHTML += `
                        </ul>
                    </div>
                `;
                
                $('#detalleExito').html(detalleHTML);
                
                // Actualizar la URL para el botón "Ver Detalles"
                $('#btnVerDetalles').attr('href', `/despachos/orden/${ordenSeleccionada.id}`);
                
                // Mostrar modal de éxito
                exitoModal.show();
                
                // Resetear el formulario
                resetearFormulario();
            } else {
                mostrarError(`Error: ${data.message}`);
            }
        })
        .catch(error => {
            confirmarModal.hide();
            console.error('Error:', error);
            mostrarError('Error de conexión al procesar el despacho');
        })
        .finally(() => {
            // Rehabilitar botón
            $('#btnConfirmarDespacho').prop('disabled', false).html('<i class="bi bi-check2-circle me-2"></i>Confirmar Despacho');
        });
    });
    
    // Botón para cerrar modal de éxito y recargar la página
    $('#btnCerrarExito').on('click', function() {
        exitoModal.hide();
        resetearFormulario();
    });
    
    // Función para resetear el formulario completo
    function resetearFormulario() {
        $('#ordenSelect').val('').trigger('change');
        $('#observaciones').val('');
        ordenSeleccionada = null;
        detallesOrden = [];
        resetearBolsones();
    }
    
    // Focus inicial
    $('#ordenSelect').focus();
});