const db = require('../config/db');

class PersonaRepository {
    async obtenerPorDni(dni) {
        const rows = await db.query('SELECT id, nombre, apellido, dni, sexo FROM personas WHERE dni = ?', [dni]);
        return rows[0] || null;
    }

    async crear(persona) {
        try {
            await db.query('INSERT INTO personas (nombre, apellido, dni, sexo) VALUES (?, ?, ?, ?)',
                [persona.nombre, persona.apellido, persona.dni, persona.sexo]);
        } catch (error) {
            if (error.code !== 'ER_DUP_ENTRY') throw error;
        }
        return this.obtenerPorDni(persona.dni);
    }
}

module.exports = new PersonaRepository();
