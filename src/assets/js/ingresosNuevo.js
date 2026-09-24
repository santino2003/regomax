document.addEventListener('DOMContentLoaded', () => {
    const formIdentificar = document.getElementById('formIdentificar');
    const formPersona = document.getElementById('formPersona');
    const seleccionada = document.getElementById('personaSeleccionada');
    const alerta = document.getElementById('alertPlaceholder');
    let procesando = false;

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
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
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
            botones.forEach(boton => { boton.disabled = false; });
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
            formIdentificar.classList.remove('d-none', 'was-validated');
            formPersona.classList.add('d-none');
            seleccionada.classList.add('d-none');
            delete seleccionada.dataset.personaId;
            alerta.replaceChildren();
            document.getElementById('entrada').focus();
        });
    });
});
