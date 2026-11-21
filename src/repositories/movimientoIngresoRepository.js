const db = require('../config/db');

class MovimientoIngresoRepository {
    async contar() {
        const [resultado] = await db.query('SELECT COUNT(*) AS total FROM ingresos_egresos');
        return Number(resultado.total);
    }

    async listar(limite, offset) {
        return db.query(
            `SELECT id, tipo_movimiento, motivo, nombre, apellido, patente, fecha_movimiento
             FROM ingresos_egresos ORDER BY fecha_movimiento DESC, id DESC LIMIT ${limite} OFFSET ${offset}`
        );
    }

    async crear(movimiento) {
        const { tipo_movimiento, motivo, nombre, apellido, patente, empresa } = movimiento;
        const sql = `INSERT INTO ingresos_egresos (tipo_movimiento, motivo, nombre, apellido, patente, empresa)
                     VALUES (?, ?, ?, ?, ?, ?)`;
        const parametros = [tipo_movimiento, motivo, nombre, apellido, patente, empresa ?? null];
        const resultado = await db.query(sql, parametros);
        return { id: resultado.insertId, ...movimiento };
    }
}

module.exports = new MovimientoIngresoRepository();
