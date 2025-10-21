const db = require('../config/db');
const { formatMySQLLocal, parseLocalDate, ventanaTurnoDiario, ventanaMesOperativo } = require('../utils/fecha');


class ReporteARRepository {
    
    async obtenerStockTotal(fecha) {
        try {
            const { fin } = ventanaTurnoDiario(fecha); // fin del día de la fecha solicitada
            const finStr = formatMySQLLocal(fin);
            
            // Consulta para obtener la sumatoria total de bolsones por producto en stock
            // Solo incluye bolsones no despachados o despachados después de la fecha consultada
            const result = await db.query(`
                SELECT 
                    p.id as producto_id,
                    p.nombre AS producto,
                    p.en_stock,
                    COALESCE(SUM(b.peso), 0) AS pesoTotal,
                    COUNT(b.id) as cantidad_bolsones
                FROM 
                    productos p
                LEFT JOIN 
                    bolsones b ON b.producto = p.nombre AND CONCAT(b.fecha, ' ', b.hora) <= ?
                LEFT JOIN 
                    despachos_detalle dd ON dd.bolson_codigo = b.codigo
                LEFT JOIN 
                    despachos d ON d.id = dd.despacho_id
                WHERE 
                    p.en_stock = 1
                    AND (b.id IS NULL OR b.despachado = 0 OR d.fecha > ? OR d.id IS NULL)
                GROUP BY 
                    p.id, p.nombre, p.en_stock
                ORDER BY 
                    p.nombre ASC
            `, [finStr, finStr]);
            
            return result;
        } catch (error) {
            console.error('Error al obtener la suma total de productos en stock:', error);
            throw error;
        }
    }
    
    async obtenerProduccionTotal(fecha) {
        try {
            const { inicio, fin } = ventanaTurnoDiario(fecha); // fin del día de la fecha solicitada
            const inicioStr = formatMySQLLocal(inicio);
            const finStr = formatMySQLLocal(fin);
            
            // Consulta para obtener la producción total del día para productos en stock
            const result = await db.query(`
                SELECT 
                    p.id as producto_id,
                    p.nombre AS producto,
                    p.en_stock,
                    COALESCE(SUM(b.peso), 0) AS pesoTotal,
                    COUNT(b.id) as cantidad_bolsones
                FROM 
                    productos p
                LEFT JOIN 
                    bolsones b ON b.producto = p.nombre AND CONCAT(b.fecha, ' ', b.hora) BETWEEN ? AND ?
                WHERE 
                    p.en_stock = 1
                GROUP BY 
                    p.id, p.nombre, p.en_stock
                ORDER BY 
                    p.nombre ASC
            `, [inicioStr, finStr]);
            
            return result;
        } catch (error) {
            console.error('Error al obtener la producción total del día:', error);
            throw error;
        }
    }
    
    async obtenerLogisticasDetalle(fecha) {
        try {
            // Obtener la ventana de tiempo del día operativo
            const { inicio, fin } = ventanaTurnoDiario(fecha);
            const inicioStr = formatMySQLLocal(inicio);
            const finStr = formatMySQLLocal(fin);
            
            // Consulta para obtener los despachos del día agrupados por cliente final (orden de venta)
            const result = await db.query(`
                SELECT 
                    MIN(d.id) as despacho_id,
                    d.orden_venta_id,
                    ov.cliente_final as cliente,
                    SUM(dd.peso) AS pesoTotal,
                    COUNT(dd.id) AS cantidadBolsones
                FROM 
                    despachos d
                JOIN 
                    despachos_detalle dd ON dd.despacho_id = d.id
                LEFT JOIN 
                    ordenes_venta ov ON ov.id = d.orden_venta_id
                WHERE 
                    d.fecha BETWEEN ? AND ?
                GROUP BY 
                    d.orden_venta_id, ov.cliente_final
                ORDER BY 
                    pesoTotal DESC
            `, [inicioStr, finStr]);
            
            return result;
        } catch (error) {
            console.error('Error al obtener detalle de logísticas del día:', error);
            throw error;
        }
    }
}

module.exports = new ReporteARRepository();