const db2 = require('../config/db');
const { formatMySQLLocal: fmtLocal, ventanaTurnoDiario: turnoDiario } = require('../utils/fecha');

class DespachoRepository {
  async iniciarTransaccion(){ await db2.query('START TRANSACTION'); }
  async confirmarTransaccion(){ await db2.query('COMMIT'); }
  async revertirTransaccion(){ await db2.query('ROLLBACK'); }

  async verificarBolsonDespachado(bolsonCodigo){
    try {
      const result = await db2.query(`SELECT * FROM despachos_detalle WHERE bolson_codigo = ?`, [bolsonCodigo]);
      return result.length > 0 ? result[0] : null;
    } catch (e) {
      console.error('Error al verificar bolsón despachado:', e);
      throw e;
    }
  }

  async obtenerPorOrden(ordenVentaId){
    try {
      const rows = await db2.query(`
        SELECT d.id, d.fecha, d.responsable, d.orden_venta_id, d.observaciones,
               dd.id AS detalle_id, dd.bolson_codigo, dd.producto, dd.peso, dd.precinto
        FROM despachos d
        LEFT JOIN despachos_detalle dd ON dd.despacho_id = d.id
        WHERE d.orden_venta_id = ?
        ORDER BY d.fecha DESC, d.id DESC
      `, [ordenVentaId]);

      const map = new Map();
      rows.forEach(row => {
        if (!map.has(row.id)){
          map.set(row.id, {
            id: row.id,
            fecha: row.fecha,
            responsable: row.responsable,
            orden_venta_id: row.orden_venta_id,
            observaciones: row.observaciones,
            bolsones: []
          });
        }
        if (row.detalle_id){
          map.get(row.id).bolsones.push({
            id: row.detalle_id,
            codigo: row.bolson_codigo,
            producto: row.producto,
            peso: row.peso,
            precinto: row.precinto
          });
        }
      });
      return Array.from(map.values());
    } catch (e) {
      console.error('Error al obtener despachos por orden:', e);
      throw e;
    }
  }

  // SUMATORIA DE DESPACHOS POR PRODUCTO PARA UNA FECHA (ventana 06->05:59)
  async obtenerDespachosPorProducto(fecha /* 'YYYY-MM-DD' */){
    try {
      const { inicio, fin } = turnoDiario(fecha);
      const iniStr = fmtLocal(inicio);
      const finStr = fmtLocal(fin);

      const result = await db2.query(`
        SELECT 
          b.producto AS productoId,
          p.nombre   AS nombreProducto,
          COUNT(b.id) AS cantidadBolsones,
          SUM(b.peso) AS pesoTotal
        FROM bolsones b
        LEFT JOIN productos p ON b.producto = p.id
        WHERE b.despachado = 1
          AND CONCAT(b.fecha, ' ', b.hora) BETWEEN ? AND ?
        GROUP BY b.producto, p.nombre
        ORDER BY p.nombre ASC
      `, [iniStr, finStr]);

      return result;
    } catch (e) {
      console.error('Error al obtener despachos por producto (turno):', e);
      throw e;
    }
  }

  async crearDespacho({ fecha = new Date(), responsable, orden_venta_id, observaciones }){
    const fechaStr = fmtLocal(new Date(fecha));
    const res = await db2.query(
      `INSERT INTO despachos (fecha, responsable, orden_venta_id, observaciones) VALUES (?, ?, ?, ?)`,
      [fechaStr, responsable, orden_venta_id, observaciones || null]
    );
    return res.insertId;
  }

  async agregarDetalleManual({ despachoId, codigoManual, producto, peso }){
    const fechaDespacho = fmtLocal(new Date());
    await db2.query(
      `INSERT INTO despachos_detalle (despacho_id, bolson_codigo, producto, peso, es_manual, fecha_despacho)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [despachoId, codigoManual, producto, peso, fechaDespacho]
    );
    return true;
  }
}

module.exports = new DespachoRepository();