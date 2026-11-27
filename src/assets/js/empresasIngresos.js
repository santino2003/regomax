document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modalEmpresaIngreso');
    const form = document.getElementById('formEmpresaIngreso');
    const errorModal = document.getElementById('errorEmpresaIngreso');
    let empresaId = null;
    let selectorDestino = null;
    let guardando = false;
    document.querySelectorAll('[data-empresa-ingreso]').forEach(selector => {
        if (window.jQuery?.fn.select2) window.jQuery(selector).select2({
            theme: 'bootstrap-5', width: '100%', placeholder: 'Seleccionar empresa', allowClear: true,
            language: { noResults: () => 'Sin resultados. Use + para registrar una empresa.', searching: () => 'Buscando...' }
        });
    });
    function abrir(boton, editar) {
        if (guardando) return;
        form.reset();
        empresaId = editar ? boton.dataset.empresaEditar : null;
        selectorDestino = boton.dataset.selectorEmpresa ? document.getElementById(boton.dataset.selectorEmpresa) : null;
        document.getElementById('tituloEmpresaIngreso').textContent = editar ? 'Editar empresa' : 'Nueva empresa';
        document.getElementById('nombreEmpresaIngreso').value = editar ? boton.dataset.nombre : '';
        document.getElementById('descripcionEmpresaIngreso').value = editar ? boton.dataset.descripcion : '';
        document.getElementById('activoEmpresaIngreso').value = editar ? boton.dataset.activo : '1';
        document.getElementById('estadoEmpresaIngreso').classList.toggle('d-none', !editar);
        errorModal.classList.add('d-none');
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }
    modal.addEventListener('shown.bs.modal', () => document.getElementById('nombreEmpresaIngreso').focus());
    document.querySelectorAll('[data-empresa-nueva]').forEach(boton => boton.addEventListener('click', () => abrir(boton, false)));
    document.querySelectorAll('[data-empresa-editar]').forEach(boton => boton.addEventListener('click', () => abrir(boton, true)));
    async function solicitar(url, opciones) {
        const respuesta = await fetch(url, opciones);
        if (respuesta.redirected || respuesta.status === 401) { window.location.href = '/login'; throw new Error('La sesión expiró.'); }
        const datos = await respuesta.json();
        if (!respuesta.ok || !datos.success) throw new Error(datos.message || datos.error || 'No se pudo guardar la empresa.');
        return datos;
    }
    form.addEventListener('submit', async event => {
        event.preventDefault(); if (guardando || !form.reportValidity()) return;
        guardando = true;
        const botones = modal.querySelectorAll('button'); botones.forEach(boton => { boton.disabled = true; });
        errorModal.classList.add('d-none');
        try {
            const datos = await solicitar('/api/empresas-ingresos' + (empresaId ? '/' + encodeURIComponent(empresaId) : ''), {
                method: empresaId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form)))
            });
            if (selectorDestino) {
                const opcion = new Option(datos.empresa.nombre, String(datos.empresa.id), true, true);
                selectorDestino.add(opcion);
                if (window.jQuery?.fn.select2) window.jQuery(selectorDestino).trigger('change');
                else selectorDestino.dispatchEvent(new Event('change', { bubbles: true }));
                bootstrap.Modal.getOrCreateInstance(modal).hide();
            } else window.location.reload();
        } catch (error) { errorModal.textContent = error.message; errorModal.classList.remove('d-none'); }
        finally { guardando = false; botones.forEach(boton => { boton.disabled = false; }); }
    });
    document.querySelectorAll('[data-empresa-baja]').forEach(boton => boton.addEventListener('click', async () => {
        if (!window.confirm(`¿Dar de baja a ${boton.dataset.nombre}? Se conservarán sus movimientos.`)) return;
        boton.disabled = true;
        try { await solicitar('/api/empresas-ingresos/' + encodeURIComponent(boton.dataset.empresaBaja), { method: 'DELETE' }); window.location.reload(); }
        catch (error) { const alerta = document.getElementById('errorListadoEmpresas'); alerta.textContent = error.message; alerta.classList.remove('d-none'); boton.disabled = false; }
    }));
    document.getElementById('buscarEmpresaIngreso')?.addEventListener('input', event => {
        const palabras = event.target.value.toLocaleLowerCase('es').trim().split(/\s+/);
        document.querySelectorAll('[data-fila-empresa]').forEach(fila => { fila.hidden = !palabras.every(palabra => fila.textContent.toLocaleLowerCase('es').includes(palabra)); });
    });
});
