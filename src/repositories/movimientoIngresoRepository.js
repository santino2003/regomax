const db = require('../config/db');

class MovimientoIngresoRepository {
    async obtenerDetalle(id) {
        const rows = await db.query(
            `SELECT movimiento.*, egreso.id AS egreso_id, egreso.fecha_movimiento AS fecha_egreso,
                    ingreso.fecha_movimiento AS fecha_ingreso, ingreso.archivo_jpg AS archivo_ingreso,
                    orden.codigo_venta
             FROM ingresos_egresos movimiento
             LEFT JOIN ingresos_egresos egreso ON egreso.ingreso_id = movimiento.id
             LEFT JOIN ingresos_egresos ingreso ON ingreso.id = movimiento.ingreso_id
             LEFT JOIN ordenes_venta orden ON orden.id = COALESCE(movimiento.orden_venta_id, ingreso.orden_venta_id)
             WHERE movimiento.id = ?`, [id]
        );
        return rows[0] || null;
    }

    async contar() {
        const [resultado] = await db.query('SELECT COUNT(*) AS total FROM ingresos_egresos');
        return Number(resultado.total);
    }

    async listar(limite, offset) {
        return db.query(
            `SELECT movimiento.id, movimiento.tipo_movimiento, movimiento.motivo, movimiento.nombre,
                    movimiento.apellido, movimiento.patente, movimiento.empresa, movimiento.fecha_movimiento,
                    movimiento.ingreso_id,
                    egreso.id AS egreso_id, egreso.fecha_movimiento AS fecha_egreso
             FROM ingresos_egresos movimiento
             LEFT JOIN ingresos_egresos egreso ON egreso.ingreso_id = movimiento.id
             ORDER BY CASE WHEN movimiento.tipo_movimiento = 'INGRESO' AND egreso.id IS NULL THEN 0 ELSE 1 END,
                      movimiento.fecha_movimiento DESC, movimiento.id DESC LIMIT ${limite} OFFSET ${offset}`
        );
    }

    async obtenerParaEgreso(id, connection) {
        const rows = await db.query(
            `SELECT id, tipo_movimiento, motivo, nombre, apellido, patente, empresa, orden_venta_id, archivo_jpg
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
        const { tipo_movimiento, motivo, nombre, apellido, patente, empresa, ingreso_id, orden_venta_id, archivo_jpg } = movimiento;
        const sql = `INSERT INTO ingresos_egresos (tipo_movimiento, motivo, nombre, apellido, patente, empresa, ingreso_id, orden_venta_id, archivo_jpg)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const parametros = [tipo_movimiento, motivo, nombre, apellido, patente, empresa ?? null, ingreso_id ?? null, orden_venta_id ?? null, archivo_jpg ?? null];
        const resultado = await db.query(sql, parametros, connection);
        return { id: resultado.insertId, ...movimiento };
    }

    async actualizar(id, movimiento, connection) {
        const { motivo, nombre, apellido, patente, empresa, orden_venta_id, archivo_jpg } = movimiento;
        await db.query(
            `UPDATE ingresos_egresos SET motivo = ?, nombre = ?, apellido = ?, patente = ?,
             empresa = ?, orden_venta_id = ?, archivo_jpg = ? WHERE id = ? AND tipo_movimiento = 'INGRESO'`,
            [motivo, nombre, apellido, patente, empresa, orden_venta_id ?? null, archivo_jpg ?? null, id], connection
        );
    }
}

module.exports = new MovimientoIngresoRepository();
