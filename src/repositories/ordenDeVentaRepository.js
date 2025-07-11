const db = require('../config/db');

class OrdenDeVentaRepository {
    // Métodos para transacciones
    async iniciarTransaccion() {
        await db.query('START TRANSACTION');
    }
    
    async confirmarTransaccion() {
        await db.query('COMMIT');
    }
    
    async revertirTransaccion() {
        await db.query('ROLLBACK');
    }
    
    // Crear la orden principal
    async crearOrdenVenta(fecha, cliente, clienteFinal, codigoVenta, observaciones, responsable) {
        const result = await db.query(
            `INSERT INTO ordenes_venta (fecha, cliente, cliente_final, codigo_venta, observaciones, responsable) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [fecha, cliente, clienteFinal, codigoVenta, observaciones, responsable]
        );
        return result.insertId;
    }
    
    // Agregar detalle de producto
    async agregarDetalleOrden(ordenId, producto, cantidad) {
        await db.query(
            `INSERT INTO ordenes_venta_detalle (orden_venta_id, producto, cantidad) 
             VALUES (?, ?, ?)`,
            [ordenId, producto, cantidad]
        );
    }
    
    // Obtener orden completa con sus productos
    async obtenerPorId(id) {
        const results = await db.query(
            `SELECT ov.*, ovd.id as detalle_id, ovd.producto, ovd.cantidad 
             FROM ordenes_venta ov
             LEFT JOIN ordenes_venta_detalle ovd ON ov.id = ovd.orden_venta_id
             WHERE ov.id = ?`,
            [id]
        );
        
        if (!results || results.length === 0) return null;
        
        // Procesar los resultados para estructurarlos adecuadamente
        const orden = {
            id: results[0].id,
            fecha: results[0].fecha,
            cliente: results[0].cliente,
            cliente_final: results[0].cliente_final,
            codigo_venta: results[0].codigo_venta,
            observaciones: results[0].observaciones,
            responsable: results[0].responsable,
            estado: results[0].estado,
            productos: []
        };
        
        // Extraer los productos de los resultados del JOIN
        results.forEach(row => {
            if (row.detalle_id) { // Asegurarse que hay detalle
                orden.productos.push({
                    id: row.detalle_id,
                    producto: row.producto,
                    cantidad: row.cantidad
                });
            }
        });
        
        return orden;
    }
    
    // Método actualizado para obtener todas las órdenes con paginación y ordenación
    async obtenerTodas(page = 1, limit = 10, sortBy = 'id', sortOrder = 'DESC') {
        const offset = (page - 1) * limit;
        
        // Consultar datos con paginación
        const results = await db.query(
            `SELECT ov.*, ovd.id as detalle_id, ovd.producto, ovd.cantidad 
             FROM ordenes_venta ov
             LEFT JOIN ordenes_venta_detalle ovd ON ov.id = ovd.orden_venta_id
             ORDER BY ov.${sortBy} ${sortOrder}
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        
        // Obtener el total de registros para la paginación
        const countResult = await db.query('SELECT COUNT(DISTINCT id) as total FROM ordenes_venta');
        const total = countResult[0].total;
        
        if (!results || results.length === 0) {
            return {
                data: [],
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            };
        }
        
        // Map para agrupar por ID de orden
        const ordenesMap = new Map();
        
        // Procesar resultados para agrupar los productos por orden
        results.forEach(row => {
            // Si no existe la orden en el map, la creamos
            if (!ordenesMap.has(row.id)) {
                ordenesMap.set(row.id, {
                    id: row.id,
                    fecha: row.fecha,
                    cliente: row.cliente,
                    cliente_final: row.cliente_final,
                    codigo_venta: row.codigo_venta,
                    observaciones: row.observaciones,
                    responsable: row.responsable,
                    estado: row.estado,
                    productos: []
                });
            }
            
            // Agregamos el producto a la orden correspondiente
            if (row.detalle_id) {
                ordenesMap.get(row.id).productos.push({
                    id: row.detalle_id,
                    producto: row.producto,
                    cantidad: row.cantidad
                });
            }
        });
        
        // Convertir el Map a un array de órdenes
        return {
            data: Array.from(ordenesMap.values()),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = new OrdenDeVentaRepository();