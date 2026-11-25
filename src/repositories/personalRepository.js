const db = require('../config/db');

class PersonalRepository {
    async listar(soloActivos = false) {
        return db.query(`SELECT id, nombre, apellido, patente, auto, cargo, turno, activo FROM personal
            ${soloActivos ? 'WHERE activo = 1' : ''} ORDER BY apellido, nombre, id`);
    }

    async obtenerPorId(id, connection) {
        const rows = await db.query(`SELECT id, nombre, apellido, patente, auto, cargo, turno, activo
            FROM personal WHERE id = ?${connection ? ' FOR UPDATE' : ''}`, [id], connection);
        return rows[0] || null;
    }

    async guardar(datos, id = null) {
        const valores = [datos.nombre, datos.apellido, datos.patente, datos.auto, datos.cargo, datos.turno, datos.activo];
        if (id) {
            await db.query('UPDATE personal SET nombre = ?, apellido = ?, patente = ?, auto = ?, cargo = ?, turno = ?, activo = ? WHERE id = ?', [...valores, id]);
            return { id, ...datos };
        }
        const resultado = await db.query('INSERT INTO personal (nombre, apellido, patente, auto, cargo, turno, activo) VALUES (?, ?, ?, ?, ?, ?, ?)', valores);
        return { id: resultado.insertId, ...datos };
    }

    async darDeBaja(id) {
        await db.query('UPDATE personal SET activo = 0 WHERE id = ?', [id]);
    }
}
module.exports = new PersonalRepository();
