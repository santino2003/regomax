document.addEventListener('DOMContentLoaded', () => {
    const alerta = document.getElementById('alertPlaceholder');
    function mensaje(texto, tipo = 'danger') {
        const elemento = document.createElement('div'); elemento.className = `alert alert-${tipo}`; elemento.textContent = texto; alerta.replaceChildren(elemento);
    }
    async function solicitar(url, opciones) {
        const response = await fetch(url, opciones);
        if (response.redirected || response.status === 401) { window.location.href = '/login'; throw new Error('La sesión expiró.'); }
        const datos = await response.json();
        if (!response.ok || !datos.success) throw new Error(datos.message || datos.error || 'No se pudo completar la operación.');
        return datos;
    }
    document.getElementById('buscarPersonal')?.addEventListener('input', event => {
        const palabras = event.target.value.toLocaleLowerCase('es').trim().split(/\s+/);
        document.querySelectorAll('[data-personal-fila]').forEach(fila => { fila.hidden = !palabras.every(palabra => fila.textContent.toLocaleLowerCase('es').includes(palabra)); });
    });
    document.querySelectorAll('[data-baja-personal]').forEach(boton => boton.addEventListener('click', async () => {
        if (!window.confirm(`¿Dar de baja a ${boton.dataset.nombre}? Se conservará su historial de ingresos y egresos.`)) return;
        boton.disabled = true;
        try { await solicitar(`/api/personal/${encodeURIComponent(boton.dataset.bajaPersonal)}`, { method: 'DELETE' }); window.location.reload(); }
        catch (error) { mensaje(error.message); boton.disabled = false; }
    }));
    const selector = document.getElementById('personal_id');
    function cargarPersonal() {
        const opcion = selector?.selectedOptions[0];
        for (const campo of ['patente', 'auto', 'cargo', 'turno', 'descripcion']) document.getElementById(campo).value = opcion?.dataset[campo] || '';
    }
    if (selector) {
        const url = new URL(window.location.href);
        if (url.searchParams.get('registrado') === '1') {
            mensaje('Ingreso de personal registrado. Puede seleccionar otra persona.', 'success');
            url.searchParams.delete('registrado'); window.history.replaceState(window.history.state, '', url.pathname + url.search);
        }
        if (url.searchParams.has('personal_id')) selector.value = url.searchParams.get('personal_id');
        selector.addEventListener('change', cargarPersonal); cargarPersonal();
        const normalizar = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
        const coincide = (texto, busqueda) => normalizar(busqueda).trim().split(/\s+/).every(palabra => normalizar(texto).includes(palabra));
        const opciones = Array.from(selector.options, opcion => opcion.cloneNode(true));
        const filtroTurno = document.getElementById('filtroTurnoIngreso');
        const busquedaAlternativa = document.getElementById('filtrarPersonalIngreso');
        const usaSelect2 = !!window.jQuery?.fn.select2;
        if (usaSelect2) {
            window.jQuery(selector).select2({
                theme: 'bootstrap-5', width: '100%', placeholder: 'Buscar personal por nombre, apellido o turno',
                allowClear: true,
                matcher(params, data) {
                    if (!params.term?.trim()) return data;
                    return data.id && coincide(`${data.text} ${data.element?.dataset.turno || ''}`, params.term) ? data : null;
                },
                language: { noResults: () => 'No hay personal que coincida con la búsqueda', searching: () => 'Buscando...' }
            }).on('change', cargarPersonal);
        } else {
            busquedaAlternativa.classList.remove('d-none');
            document.getElementById('ayudaSeleccionPersonal').textContent = 'Busque por nombre, apellido o turno y seleccione una persona.';
        }
        function filtrarOpciones() {
            const anterior = selector.value;
            const visibles = opciones.filter(opcion => !opcion.value || (
                (!filtroTurno.value || opcion.dataset.turno === filtroTurno.value) &&
                (usaSelect2 || coincide(opcion.textContent, busquedaAlternativa.value))
            ));
            selector.replaceChildren(...visibles.map(opcion => opcion.cloneNode(true)));
            selector.value = visibles.some(opcion => opcion.value === anterior) ? anterior : '';
            if (usaSelect2) window.jQuery(selector).trigger('change');
            else cargarPersonal();
        }
        filtroTurno.addEventListener('change', filtrarOpciones);
        if (!usaSelect2) busquedaAlternativa.addEventListener('input', filtrarOpciones);
    }
    let archivo = null;
    let procesando = false;
    const input = document.getElementById('adjuntoPersonal');
    const zona = document.getElementById('zonaAdjuntoPersonal');
    function seleccionar(archivos) {
        archivo = null; input.value = ''; input.setCustomValidity('');
        const candidato = archivos[0];
        const error = archivos.length > 1 ? 'Seleccione un solo archivo.'
            : candidato && (!/\.(pdf|jpe?g)$/i.test(candidato.name) || candidato.size > 10 * 1024 * 1024) ? 'Seleccione un PDF o JPG de hasta 10 MB.' : '';
        input.setCustomValidity(error);
        document.getElementById('nombreAdjuntoPersonal').textContent = error || candidato?.name || '';
        document.getElementById('quitarAdjuntoPersonal').classList.toggle('d-none', !candidato);
        if (!error) archivo = candidato || null;
    }
    if (input) {
        input.addEventListener('change', () => { if (!procesando) seleccionar(Array.from(input.files)); });
        zona.addEventListener('dragover', event => { event.preventDefault(); if (!procesando) zona.classList.add('border-primary'); });
        zona.addEventListener('dragleave', () => zona.classList.remove('border-primary'));
        zona.addEventListener('drop', event => { event.preventDefault(); zona.classList.remove('border-primary'); if (!procesando) seleccionar(Array.from(event.dataTransfer.files)); });
        document.getElementById('quitarAdjuntoPersonal').addEventListener('click', () => { if (!procesando) seleccionar([]); });
    }
    document.querySelector('[data-form-personal]')?.addEventListener('submit', async event => {
        event.preventDefault(); const form = event.currentTarget;
        if (procesando || !form.reportValidity()) return;
        const multipart = form.hasAttribute('data-ingreso-personal');
        const datos = new FormData(form);
        if (archivo) datos.append('archivo_jpg', archivo);
        const opciones = { method: form.dataset.method, ...(multipart ? {} : { headers: { 'Content-Type': 'application/json' } }), body: multipart ? datos : JSON.stringify(Object.fromEntries(datos)) };
        const boton = form.querySelector('[type="submit"]'); const texto = boton.innerHTML;
        procesando = true; boton.disabled = true; boton.textContent = 'Guardando...'; alerta.replaceChildren();
        let guardado = false;
        try { await solicitar(form.dataset.url, opciones); guardado = true; window.location.href = form.dataset.return; }
        catch (error) { mensaje(error.message); }
        finally { procesando = guardado; boton.disabled = guardado; boton.innerHTML = texto; }
    });
});
