document.addEventListener('DOMContentLoaded', () => {
    const formIdentificar = document.getElementById('formIdentificar');
    const formPersona = document.getElementById('formPersona');
    const seleccionada = document.getElementById('personaSeleccionada');
    const alerta = document.getElementById('alertPlaceholder');
    const formMotivo = document.getElementById('formMotivoIngreso');
    const motivo = document.getElementById('motivoIngreso');
    const camposNFU = document.getElementById('camposNFU');
    const empresa = document.getElementById('cliente_id');
    const camposLogistica = document.getElementById('camposLogistica');
    const camposVehiculo = document.getElementById('camposVehiculo');
    const ordenVenta = document.getElementById('orden_venta_id');
    const empresaLogistica = document.getElementById('empresaLogistica');
    const camposBasura = document.getElementById('camposBasura');
    const empresaBasura = document.getElementById('empresaBasura');
    let procesando = false;
    let ingresoGuardado = false;
    const archivoInput = document.getElementById('archivoIngreso');
    const zonaArchivo = document.getElementById('zonaArchivoIngreso');
    const errorArchivo = document.getElementById('errorArchivoIngreso');
    const vistaArchivo = document.getElementById('vistaArchivoIngreso');
    let archivoSeleccionado = null;
    let urlArchivo = null;

    function limpiarArchivo() {
        archivoSeleccionado = null;
        archivoInput.value = '';
        archivoInput.setCustomValidity('');
        errorArchivo.textContent = '';
        if (urlArchivo) URL.revokeObjectURL(urlArchivo);
        urlArchivo = null;
        vistaArchivo.removeAttribute('src');
        document.getElementById('detalleArchivoIngreso').classList.add('d-none');
        document.getElementById('nombreArchivoIngreso').textContent = '';
        document.getElementById('quitarArchivoIngreso').classList.add('d-none');
    }

    function seleccionarArchivo(archivos) {
        limpiarArchivo();
        if (!archivos.length) return;
        document.getElementById('quitarArchivoIngreso').classList.remove('d-none');
        const archivo = archivos[0];
        const esPDF = /\.pdf$/i.test(archivo.name);
        const tipoValido = !archivo.type || (esPDF ? archivo.type === 'application/pdf' : ['image/jpeg', 'image/jpg'].includes(archivo.type));
        const error = archivos.length !== 1 ? 'Seleccione un solo archivo.'
            : !/\.(jpe?g|pdf)$/i.test(archivo.name) || !tipoValido
                ? 'Solo se permite un archivo JPG, JPEG o PDF.'
                : archivo.size > 10 * 1024 * 1024 ? 'El archivo no puede superar los 10 MB.' : '';
        if (error) {
            archivoInput.setCustomValidity(error);
            errorArchivo.textContent = error;
            return;
        }
        archivoSeleccionado = archivo;
        vistaArchivo.classList.toggle('d-none', esPDF);
        if (!esPDF) {
            urlArchivo = URL.createObjectURL(archivo);
            vistaArchivo.src = urlArchivo;
        }
        document.getElementById('nombreArchivoIngreso').textContent = archivo.name;
        document.getElementById('detalleArchivoIngreso').classList.remove('d-none');
    }

    archivoInput.addEventListener('change', () => {
        if (!procesando) seleccionarArchivo(Array.from(archivoInput.files));
    });
    zonaArchivo.addEventListener('dragover', event => {
        event.preventDefault();
        if (!procesando) zonaArchivo.classList.add('border-primary', 'bg-light');
    });
    zonaArchivo.addEventListener('dragleave', () => zonaArchivo.classList.remove('border-primary', 'bg-light'));
    zonaArchivo.addEventListener('drop', event => {
        event.preventDefault();
        zonaArchivo.classList.remove('border-primary', 'bg-light');
        if (!procesando) seleccionarArchivo(Array.from(event.dataTransfer.files));
    });
    document.getElementById('quitarArchivoIngreso').addEventListener('click', () => {
        if (!procesando) limpiarArchivo();
    });

    const url = new URL(window.location.href);
    if (url.searchParams.get('registrado') === '1') {
        const mensaje = document.createElement('div');
        mensaje.className = 'alert alert-success';
        mensaje.textContent = 'Ingreso exitoso. Escanee o ingrese otro DNI para continuar.';
        alerta.replaceChildren(mensaje);
        document.getElementById('entrada').focus();
        url.searchParams.delete('registrado');
        window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }

    function actualizarMotivo() {
        const esNFU = motivo.value === 'CNFU/NFU';
        const esLogistica = motivo.value === 'Logística';
        const esEmpresaManual = ['Basura', 'Acero'].includes(motivo.value);
        camposBasura.classList.toggle('d-none', !esEmpresaManual);
        camposBasura.disabled = !esEmpresaManual;
        if (!esEmpresaManual) empresaBasura.value = '';
        camposLogistica.classList.toggle('d-none', !esLogistica);
        camposLogistica.disabled = !esLogistica;
        ordenVenta.disabled = !esLogistica;
        camposVehiculo.classList.toggle('d-none', !esNFU && !esLogistica && !esEmpresaManual);
        camposVehiculo.disabled = !esNFU && !esLogistica && !esEmpresaManual;
        camposNFU.classList.toggle('d-none', !esNFU);
        camposNFU.disabled = !esNFU;
        empresa.disabled = !esNFU;
        if (esNFU && window.jQuery?.fn.select2 && !empresa.classList.contains('select2-hidden-accessible')) {
            window.jQuery(empresa).select2({
                theme: 'bootstrap-5',
                width: '100%',
                placeholder: 'Seleccionar cliente',
                allowClear: false,
                language: {
                    noResults: () => 'No se encontraron resultados',
                    searching: () => 'Buscando...'
                }
            });
        }
        if (!esNFU) {
            empresa.value = '';
            document.getElementById('tipo').value = '';
        }
        if (!esLogistica) ordenVenta.value = '';
        if (!esNFU && !esLogistica && !esEmpresaManual) document.getElementById('patente').value = '';
        if (esLogistica && window.jQuery?.fn.select2 && !ordenVenta.classList.contains('select2-hidden-accessible')) {
            window.jQuery(ordenVenta).select2({
                theme: 'bootstrap-5', width: '100%', placeholder: 'Seleccionar orden de venta',
                language: { noResults: () => 'No se encontraron órdenes de venta', searching: () => 'Buscando...' }
            });
        }
        actualizarEmpresaLogistica();
        if (window.jQuery?.fn.select2) window.jQuery(empresa).trigger('change');
        if (window.jQuery?.fn.select2) window.jQuery(ordenVenta).trigger('change');
    }

    function actualizarEmpresaLogistica() {
        empresaLogistica.value = ordenVenta.selectedOptions[0]?.dataset.clienteFinal || '';
    }
    ordenVenta.addEventListener('change', actualizarEmpresaLogistica);
    if (window.jQuery?.fn.select2) window.jQuery(ordenVenta).on('change', actualizarEmpresaLogistica);

    motivo.addEventListener('change', actualizarMotivo);
    formMotivo.addEventListener('submit', event => {
        event.preventDefault();
        if (ingresoGuardado || !seleccionada.dataset.personaId) return;
        const datos = new FormData();
        const campos = {
            tipo_movimiento: 'INGRESO',
            motivo: motivo.value,
            cliente_id: empresa.value,
            orden_venta_id: motivo.value === 'Logística' ? ordenVenta.value : undefined,
            empresa: ['Basura', 'Acero'].includes(motivo.value) ? empresaBasura.value.trim() : undefined,
            nombre: document.getElementById('personaNombre').textContent,
            apellido: document.getElementById('personaApellido').textContent,
            patente: document.getElementById('patente').value.trim(),
            descripcion: document.getElementById('descripcion').value.trim()
        };
        for (const [campo, valor] of Object.entries(campos)) {
            if (valor !== undefined) datos.append(campo, valor);
        }
        if (archivoSeleccionado) datos.append('archivo_jpg', archivoSeleccionado);
        enviar(formMotivo, '/api/ingresos/movimientos', datos, () => {
            ingresoGuardado = true;
            window.location.href = '/ingresos?registrado=1';
        });
    });
    actualizarMotivo();

    function mostrarPersona(persona) {
        formIdentificar.classList.add('d-none');
        formPersona.classList.add('d-none');
        seleccionada.classList.remove('d-none');
        seleccionada.dataset.personaId = persona.id;
        for (const campo of ['nombre', 'apellido', 'dni', 'sexo']) {
            const id = 'persona' + campo[0].toUpperCase() + campo.slice(1);
            document.getElementById(id).textContent = persona[campo];
        }
    }

    async function enviar(form, url, datos, completar) {
        if (procesando) return;
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        procesando = true;
        alerta.replaceChildren();
        const botones = form.querySelectorAll('button');
        botones.forEach(boton => { boton.disabled = true; });
        const submit = form.querySelector('[type="submit"]');
        const texto = submit.innerHTML;
        submit.textContent = 'Procesando...';
        try {
            const esMultipart = datos instanceof FormData;
            const response = await fetch(url, {
                method: 'POST',
                headers: esMultipart ? {} : { 'Content-Type': 'application/json' },
                body: esMultipart ? datos : JSON.stringify(datos)
            });
            if (response.redirected || response.status === 401) {
                window.location.href = '/login';
                return;
            }
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || data.error || 'No se pudo completar la operación.');
            }
            completar(data);
        } catch (error) {
            const mensaje = document.createElement('div');
            mensaje.className = 'alert alert-danger';
            mensaje.textContent = error.message || 'No se pudo completar la operación. Intente nuevamente.';
            alerta.replaceChildren(mensaje);
        } finally {
            procesando = false;
            botones.forEach(boton => { boton.disabled = form === formMotivo && ingresoGuardado; });
            submit.innerHTML = texto;
        }
    }

    formIdentificar.addEventListener('submit', event => {
        event.preventDefault();
        enviar(formIdentificar, '/api/ingresos/identificar', {
            entrada: document.getElementById('entrada').value.trim()
        }, data => {
            if (data.requiereRegistro) {
                formIdentificar.classList.add('d-none');
                formPersona.reset();
                formPersona.classList.remove('d-none', 'was-validated');
                document.getElementById('dni').value = data.dni;
                document.getElementById('nombre').focus();
            } else {
                mostrarPersona(data.persona);
            }
        });
    });

    formPersona.addEventListener('submit', event => {
        event.preventDefault();
        const datos = Object.fromEntries(new FormData(formPersona));
        enviar(formPersona, '/api/ingresos/personas', datos, data => mostrarPersona(data.persona));
    });

    document.querySelectorAll('[data-reiniciar]').forEach(boton => {
        boton.addEventListener('click', () => {
            if (procesando) return;
            formIdentificar.reset();
            formPersona.reset();
            formMotivo.reset();
            limpiarArchivo();
            formMotivo.classList.remove('was-validated');
            ingresoGuardado = false;
            actualizarMotivo();
            formIdentificar.classList.remove('d-none', 'was-validated');
            formPersona.classList.add('d-none');
            seleccionada.classList.add('d-none');
            delete seleccionada.dataset.personaId;
            alerta.replaceChildren();
            document.getElementById('entrada').focus();
        });
    });
});
