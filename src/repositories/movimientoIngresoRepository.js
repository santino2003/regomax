const db = require('../config/db');
const { formatMySQLLocal } = require('../utils/fecha');

class MovimientoIngresoRepository {
    async obtenerIngresoPersonalPendiente(personalId, connection) {
        const rows = await db.query(`SELECT movimiento.id FROM ingresos_egresos movimiento
            LEFT JOIN ingresos_egresos egreso ON egreso.ingreso_id = movimiento.id
            WHERE movimiento.personal_id = ? AND movimiento.tipo_movimiento = 'INGRESO' AND egreso.id IS NULL LIMIT 1`, [personalId], connection);
        return rows[0] || null;
    }
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

    construirFiltros(filtros = {}) {
        const condiciones = [];
        const params = [];
        for (const [campo, columna] of [['persona', "CONCAT_WS(' ', movimiento.nombre, movimiento.apellido)"], ['patente', 'movimiento.patente'], ['empresa', 'movimiento.empresa']]) {
            for (const termino of (filtros[campo] || '').split(/\s+/).filter(Boolean)) {
                condiciones.push(`${columna} LIKE ?`);
                params.push(`%${termino}%`);
            }
        }
        for (const campo of ['motivo', 'tipo_movimiento']) {
            if (filtros[campo]) { condiciones.push(`movimiento.${campo} = ?`); params.push(filtros[campo]); }
        }
        if (filtros.estado === 'pendientes') condiciones.push("movimiento.tipo_movimiento = 'INGRESO' AND egreso.id IS NULL");
        if (filtros.estado === 'egresados') condiciones.push("(movimiento.tipo_movimiento = 'EGRESO' OR egreso.id IS NOT NULL)");
        if (filtros.fecha_desde) { condiciones.push('movimiento.fecha_movimiento >= ?'); params.push(`${filtros.fecha_desde} 00:00:00`); }
        if (filtros.fecha_hasta) { condiciones.push('movimiento.fecha_movimiento < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(`${filtros.fecha_hasta} 00:00:00`); }
        return { where: condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : '', params };
    }

    async contar(filtros = {}) {
        const { where, params } = this.construirFiltros(filtros);
        const [resultado] = await db.query(`SELECT COUNT(*) AS total FROM ingresos_egresos movimiento
            LEFT JOIN ingresos_egresos egreso ON egreso.ingreso_id = movimiento.id ${where}`, params);
        return Number(resultado.total);
    }

    async listar(limite, offset, filtros = {}) {
        const { where, params } = this.construirFiltros(filtros);
        return db.query(
            `SELECT movimiento.id, movimiento.tipo_movimiento, movimiento.motivo, movimiento.nombre,
                    movimiento.apellido, movimiento.patente, movimiento.empresa, movimiento.fecha_movimiento,
                    movimiento.ingreso_id,
                    egreso.id AS egreso_id, egreso.fecha_movimiento AS fecha_egreso
             FROM ingresos_egresos movimiento
             LEFT JOIN ingresos_egresos egreso ON egreso.ingreso_id = movimiento.id
             ${where}
             ORDER BY CASE WHEN movimiento.tipo_movimiento = 'INGRESO' AND egreso.id IS NULL THEN 0 ELSE 1 END,
                      movimiento.fecha_movimiento DESC, movimiento.id DESC LIMIT ${limite} OFFSET ${offset}`, params
        );
    }

    async obtenerParaEgreso(id, connection) {
        const rows = await db.query(
            `SELECT id, tipo_movimiento, motivo, nombre, apellido, patente, empresa, orden_venta_id, archivo_jpg, personal_id, auto, cargo, turno, descripcion, empresa_ingreso_id
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
        const fechaMovimiento = new Date();
        fechaMovimiento.setMilliseconds(0);
        const sql = `INSERT INTO ingresos_egresos (tipo_movimiento, motivo, nombre, apellido, patente, empresa, ingreso_id, orden_venta_id, archivo_jpg, personal_id, auto, cargo, turno, descripcion, empresa_ingreso_id, fecha_movimiento)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const parametros = [tipo_movimiento, motivo, nombre, apellido, patente, empresa ?? null, ingreso_id ?? null, orden_venta_id ?? null, archivo_jpg ?? null,
            movimiento.personal_id ?? null, movimiento.auto ?? null, movimiento.cargo ?? null, movimiento.turno ?? null, movimiento.descripcion ?? null, movimiento.empresa_ingreso_id ?? null,
            formatMySQLLocal(fechaMovimiento)];
        const resultado = await db.query(sql, parametros, connection);
        return { id: resultado.insertId, ...movimiento, fecha_movimiento: fechaMovimiento };
    }

    async actualizar(id, movimiento, connection) {
        const { motivo, nombre, apellido, patente, empresa, orden_venta_id, archivo_jpg } = movimiento;
        await db.query(
            `UPDATE ingresos_egresos SET motivo = ?, nombre = ?, apellido = ?, patente = ?,
             empresa = ?, orden_venta_id = ?, archivo_jpg = ?, auto = ?, cargo = ?, turno = ?, descripcion = ?, empresa_ingreso_id = ? WHERE id = ? AND tipo_movimiento = 'INGRESO'`,
            [motivo, nombre, apellido, patente || null, empresa, orden_venta_id ?? null, archivo_jpg ?? null,
                movimiento.auto ?? null, movimiento.cargo ?? null, movimiento.turno ?? null, movimiento.descripcion ?? null, movimiento.empresa_ingreso_id ?? null, id], connection
        );
    }
}

module.exports = new MovimientoIngresoRepository();
