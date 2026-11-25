const db = require('../config/db');

class PersonalRepository {
    async contarMovimientos(id) {
        const [resultado] = await db.query('SELECT COUNT(*) AS total FROM ingresos_egresos WHERE personal_id = ?', [id]);
        return Number(resultado.total);
    }

    async listarMovimientos(id, limite, offset) {
        return db.query(`SELECT movimiento.id, movimiento.tipo_movimiento, movimiento.fecha_movimiento,
            movimiento.nombre, movimiento.apellido, movimiento.patente, movimiento.auto, movimiento.cargo,
            movimiento.turno, movimiento.ingreso_id, egreso.id AS egreso_id
            FROM ingresos_egresos movimiento
            LEFT JOIN ingresos_egresos egreso ON egreso.ingreso_id = movimiento.id
            WHERE movimiento.personal_id = ?
            ORDER BY movimiento.fecha_movimiento DESC, movimiento.id DESC LIMIT ${limite} OFFSET ${offset}`, [id]);
    }

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
