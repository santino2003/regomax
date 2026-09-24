const personaRepository = require('../repositories/personaRepository');

class IngresoService {
    errorValidacion(message) {
        const error = new Error(message);
        error.status = 400;
        return error;
    }

    normalizarDni(valor) {
        const dni = typeof valor === 'string' ? valor.trim() : '';
        if (!/^\d{7,8}$/.test(dni) || Number(dni) < 1000000) {
            throw this.errorValidacion('Ingrese un DNI válido de 7 u 8 dígitos, sin puntos.');
        }
        return String(Number(dni));
    }

    validarPersona(datos) {
        const persona = { dni: this.normalizarDni(datos.dni) };
        for (const campo of ['nombre', 'apellido']) {
            const valor = typeof datos[campo] === 'string' ? datos[campo].trim() : '';
            if (!valor || valor.length > 100 || /[\x00-\x1f@\\]/.test(valor)) {
                throw this.errorValidacion(`El ${campo} es obligatorio y debe tener hasta 100 caracteres.`);
            }
            persona[campo] = valor;
        }
        persona.sexo = typeof datos.sexo === 'string' ? datos.sexo.trim().toUpperCase() : '';
        if (!['M', 'F', 'X'].includes(persona.sexo)) {
            throw this.errorValidacion('Seleccione un sexo válido.');
        }
        return persona;
    }

    async identificar(entrada) {
        if (typeof entrada !== 'string' || entrada.length > 1000) {
            throw this.errorValidacion('Ingrese el DNI o escanee el documento.');
        }
        const campos = entrada.trim().split(/\\*@/).map(valor => valor.trim());
        const escaneado = campos.length > 1;
        if (escaneado && campos.length < 5) {
            throw this.errorValidacion('El escaneo del DNI está incompleto. Vuelva a escanearlo.');
        }
        const dni = this.normalizarDni(escaneado ? campos[4] : entrada);
        const existente = await personaRepository.obtenerPorDni(dni);
        if (existente) return { persona: existente, requiereRegistro: false };
        if (!escaneado) return { dni, requiereRegistro: true };
        const persona = this.validarPersona({ dni, apellido: campos[1], nombre: campos[2], sexo: campos[3] });
        return { persona: await personaRepository.crear(persona), requiereRegistro: false };
    }

    async registrar(datos) {
        const persona = this.validarPersona(datos);
        const existente = await personaRepository.obtenerPorDni(persona.dni);
        return existente || personaRepository.crear(persona);
    }
}

module.exports = new IngresoService();
