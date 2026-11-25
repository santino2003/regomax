document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formEditarIngreso');
    const motivo = document.getElementById('motivoEditar');
    const orden = document.getElementById('orden_venta_id');
    const alerta = document.getElementById('alertPlaceholder');
    const input = document.getElementById('archivoEditar');
    const zona = document.getElementById('zonaAdjuntoEditar');
    const quitar = document.getElementById('quitarAdjuntoEditar');
    const nombre = document.getElementById('nombreAdjuntoEditar');
    let archivo = null;
    let procesando = false;

    function actualizarEmpresa() {
        document.getElementById('empresaOrden').value = orden.selectedOptions[0]?.dataset.empresa || '';
    }
    function actualizarMotivo() {
        for (const [id, valores] of [['empresaNFU', ['CNFU/NFU']], ['empresaLogistica', ['Logística']], ['empresaBasura', ['Basura', 'Acero']]]) {
            const campo = document.getElementById(id);
            campo.disabled = !valores.includes(motivo.value);
            campo.classList.toggle('d-none', campo.disabled);
        }
        actualizarEmpresa();
    }
    motivo.addEventListener('change', actualizarMotivo);
    orden.addEventListener('change', actualizarEmpresa);
    actualizarMotivo();

    function seleccionar(archivos) {
        archivo = null;
        input.value = '';
        input.setCustomValidity('');
        nombre.textContent = '';
        quitar.classList.toggle('d-none', !archivos.length);
        if (!archivos.length) return;
        const candidato = archivos[0];
        const pdf = /\.pdf$/i.test(candidato.name);
        const mimeValido = !candidato.type || (pdf ? candidato.type === 'application/pdf' : ['image/jpeg', 'image/jpg'].includes(candidato.type));
        const error = archivos.length !== 1 ? 'Seleccione un solo archivo.'
            : !/\.(pdf|jpe?g)$/i.test(candidato.name) || !mimeValido ? 'Seleccione un PDF o JPG.'
            : candidato.size > 10 * 1024 * 1024 ? 'El archivo no puede superar los 10 MB.' : '';
        nombre.textContent = error || candidato.name;
        input.setCustomValidity(error);
        if (!error) archivo = candidato;
    }
    input.addEventListener('change', () => { if (!procesando) seleccionar(Array.from(input.files)); });
    quitar.addEventListener('click', () => { if (!procesando) seleccionar([]); });
    zona.addEventListener('dragover', event => { event.preventDefault(); if (!procesando) zona.classList.add('border-primary'); });
    zona.addEventListener('dragleave', () => zona.classList.remove('border-primary'));
    zona.addEventListener('drop', event => {
        event.preventDefault(); zona.classList.remove('border-primary');
        if (!procesando) seleccionar(Array.from(event.dataTransfer.files));
    });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (procesando || !form.reportValidity()) return;
        const datos = new FormData(form);
        if (archivo) datos.append('archivo_jpg', archivo);
        const boton = form.querySelector('[type="submit"]');
        const texto = boton.innerHTML;
        procesando = true;
        boton.disabled = true;
        input.disabled = true;
        quitar.disabled = true;
        boton.textContent = 'Guardando...';
        alerta.replaceChildren();
        let guardado = false;
        try {
            const respuesta = await fetch(`/api/ingresos/movimientos/${encodeURIComponent(form.dataset.id)}`, { method: 'PUT', body: datos });
            if (respuesta.redirected || respuesta.status === 401) { window.location.href = '/login'; return; }
            const resultado = await respuesta.json();
            if (!respuesta.ok || !resultado.success) throw new Error(resultado.message || resultado.error || 'No se pudo guardar el ingreso.');
            guardado = true;
            const destino = new URL(`/ingresos/${encodeURIComponent(form.dataset.id)}/detalle`, window.location.origin);
            destino.searchParams.set('page', form.dataset.page);
            if (window.listReturnTo) destino.searchParams.set('returnTo', window.listReturnTo);
            window.location.href = destino.href;
        } catch (error) {
            const mensaje = document.createElement('div');
            mensaje.className = 'alert alert-danger';
            mensaje.textContent = error.message || 'No se pudo guardar el ingreso. Intente nuevamente.';
            alerta.replaceChildren(mensaje);
        } finally {
            procesando = guardado;
            boton.disabled = guardado;
            input.disabled = guardado;
            quitar.disabled = guardado;
            boton.innerHTML = texto;
        }
    });
});
