const db = require('../config/db');

class MovimientoIngresoRepository {
    async listar(pagina, limite) {
        if (!Number.isSafeInteger(pagina) || pagina < 1 || !Number.isSafeInteger(limite) || limite < 1) {
            throw new Error('Paginación inválida');
        }
        const [conteo] = await db.query('SELECT COUNT(*) AS total FROM ingresos_egresos');
        const total = Number(conteo.total);
        const paginas = Math.max(1, Math.ceil(total / limite));
        pagina = Math.min(pagina, paginas);
        const movimientos = await db.query(
            `SELECT id, tipo_movimiento, motivo, nombre, apellido, patente, fecha_movimiento
             FROM ingresos_egresos ORDER BY fecha_movimiento DESC, id DESC LIMIT ${limite} OFFSET ${(pagina - 1) * limite}`
        );
        return { movimientos, pagina, paginas, total };
    }

    async crear(movimiento) {
        const { tipo_movimiento, motivo, nombre, apellido, patente } = movimiento;
        const resultado = await db.query(
            `INSERT INTO ingresos_egresos (tipo_movimiento, motivo, nombre, apellido, patente)
             VALUES (?, ?, ?, ?, ?)`,
            [tipo_movimiento, motivo, nombre, apellido, patente]
        );
        return { id: resultado.insertId, ...movimiento };
    }
}

module.exports = new MovimientoIngresoRepository();
