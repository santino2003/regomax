const db = require('../config/db');

class MovimientoIngresoRepository {
    async contar() {
        const [resultado] = await db.query('SELECT COUNT(*) AS total FROM ingresos_egresos');
        return Number(resultado.total);
    }

    async listar(limite, offset) {
        return db.query(
            `SELECT movimiento.id, movimiento.tipo_movimiento, movimiento.motivo, movimiento.nombre,
                    movimiento.apellido, movimiento.patente, movimiento.empresa, movimiento.fecha_movimiento,
                    movimiento.ingreso_id, egreso.id AS egreso_id, egreso.fecha_movimiento AS fecha_egreso
             FROM ingresos_egresos movimiento
             LEFT JOIN ingresos_egresos egreso ON egreso.ingreso_id = movimiento.id
             ORDER BY movimiento.fecha_movimiento DESC, movimiento.id DESC LIMIT ${limite} OFFSET ${offset}`
        );
    }

    async obtenerParaEgreso(id, connection) {
        const rows = await db.query(
            `SELECT id, tipo_movimiento, motivo, nombre, apellido, patente, empresa
             FROM ingresos_egresos WHERE id = ? FOR UPDATE`, [id], connection
        );
        return rows[0] || null;
    }

    async obtenerEgreso(ingresoId, connection) {
        const rows = await db.query(
            'SELECT id FROM ingresos_egresos WHERE ingreso_id = ? FOR UPDATE', [ingresoId], connection
        );
        return rows[0] || null;
    }

    async crear(movimiento, connection = null) {
        const { tipo_movimiento, motivo, nombre, apellido, patente, empresa, ingreso_id } = movimiento;
        const sql = `INSERT INTO ingresos_egresos (tipo_movimiento, motivo, nombre, apellido, patente, empresa, ingreso_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const parametros = [tipo_movimiento, motivo, nombre, apellido, patente, empresa ?? null, ingreso_id ?? null];
        const resultado = await db.query(sql, parametros, connection);
        return { id: resultado.insertId, ...movimiento };
    }
}

module.exports = new MovimientoIngresoRepository();
