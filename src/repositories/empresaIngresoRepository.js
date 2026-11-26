const db = require('../config/db');

class EmpresaIngresoRepository {
    listar(soloActivas = false) {
        return db.query(`SELECT id, nombre, descripcion, activo FROM empresas_ingresos ${soloActivas ? 'WHERE activo = 1' : ''} ORDER BY nombre, id`);
    }
    async obtener(id, connection) {
        const rows = await db.query(`SELECT id, nombre, descripcion, activo FROM empresas_ingresos WHERE id = ?${connection ? ' FOR UPDATE' : ''}`, [id], connection);
        return rows[0] || null;
    }
    async guardar(datos, id) {
        if (id) await db.query('UPDATE empresas_ingresos SET nombre = ?, descripcion = ?, activo = ? WHERE id = ?', [datos.nombre, datos.descripcion, datos.activo, id]);
        else {
            const resultado = await db.query('INSERT INTO empresas_ingresos (nombre, descripcion, activo) VALUES (?, ?, ?)', [datos.nombre, datos.descripcion, datos.activo]);
            id = resultado.insertId;
        }
        return { id, ...datos };
    }
    async darDeBaja(id) { await db.query('UPDATE empresas_ingresos SET activo = 0 WHERE id = ?', [id]); }
}
module.exports = new EmpresaIngresoRepository();
