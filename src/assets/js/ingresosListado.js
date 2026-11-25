document.body.dataset.allowBackNavigation = 'true';

document.addEventListener('DOMContentLoaded', () => {
    const elementoModal = document.getElementById('modalEgreso');
    const confirmar = document.getElementById('confirmarEgreso');
    const errorEgreso = document.getElementById('errorEgreso');
    let ingresoSeleccionado = null;
    let procesando = false;

    document.querySelectorAll('[data-dar-egreso]').forEach(boton => {
        boton.addEventListener('click', () => {
            if (procesando) return;
            ingresoSeleccionado = boton.dataset.ingresoId;
            document.getElementById('egresoIngreso').textContent = '#' + ingresoSeleccionado;
            for (const campo of ['persona', 'patente', 'empresa', 'fecha']) {
                const id = 'egreso' + campo[0].toUpperCase() + campo.slice(1);
                document.getElementById(id).textContent = boton.dataset[campo];
            }
            errorEgreso.classList.add('d-none');
            errorEgreso.replaceChildren();
            bootstrap.Modal.getOrCreateInstance(elementoModal).show();
        });
    });

    elementoModal.addEventListener('hidden.bs.modal', () => { ingresoSeleccionado = null; });

    confirmar.addEventListener('click', async () => {
        if (procesando || !ingresoSeleccionado) return;
        procesando = true;
        errorEgreso.classList.add('d-none');
        const botones = elementoModal.querySelectorAll('button');
        botones.forEach(boton => { boton.disabled = true; });
        confirmar.textContent = 'Registrando egreso...';
        let registrado = false;
        try {
            const response = await fetch(`/api/ingresos/movimientos/${encodeURIComponent(ingresoSeleccionado)}/egreso`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}'
            });
            if (response.redirected || response.status === 401) {
                window.location.href = '/login';
                return;
            }
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || data.error || 'No se pudo registrar el egreso. Intente nuevamente.');
            }
            registrado = true;
            const url = new URL(window.location.href);
            url.searchParams.delete('registrado');
            url.searchParams.set('egreso', '1');
            window.location.href = url.href;
        } catch (error) {
            errorEgreso.textContent = error.message || 'No se pudo registrar el egreso. Intente nuevamente.';
            const recargar = document.createElement('a');
            recargar.href = window.location.href;
            recargar.className = 'd-block mt-2';
            recargar.textContent = 'Actualizar listado';
            errorEgreso.appendChild(recargar);
            errorEgreso.classList.remove('d-none');
        } finally {
            procesando = registrado;
            botones.forEach(boton => { boton.disabled = registrado; });
            confirmar.textContent = registrado ? 'Egreso registrado' : 'Confirmar egreso';
        }
    });
});
