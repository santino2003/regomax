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
    
    // Agregar detalle de producto (ahora guarda cantidad_inicial)
    async agregarDetalleOrden(ordenId, producto, cantidad) {
        await db.query(
            `INSERT INTO ordenes_venta_detalle (orden_venta_id, producto, cantidad, cantidad_inicial) 
             VALUES (?, ?, ?, ?)`,
            [ordenId, producto, cantidad, cantidad]
        );
    }
    
    // Obtener orden completa con sus productos
    async obtenerPorId(id) {
        const results = await db.query(
            `SELECT ov.*, ovd.id as detalle_id, ovd.producto, ovd.cantidad, ovd.cantidad_inicial 
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
            codigo_venta: results[0].codigo_venta || `OV-${results[0].id}`, // Usar código existente o generar OV-X
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
                    codigo_venta: row.codigo_venta || `OV-${row.id}`, // Usar código existente o generar OV-X
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
    
    // Actualizar los datos básicos de una orden
    async actualizarDatosOrden(id, datosOrden) {
        // Construir la consulta SQL dinámicamente basada en los campos proporcionados
        const campos = [];
        const valores = [];

        // Agregar campos que no sean nulos
        if (datosOrden.fecha) {
            campos.push('fecha = ?');
            valores.push(datosOrden.fecha);
        }
        
        if (datosOrden.cliente) {
            campos.push('cliente = ?');
            valores.push(datosOrden.cliente);
        }
        
        if (datosOrden.cliente_final !== undefined) {
            campos.push('cliente_final = ?');
            valores.push(datosOrden.cliente_final);
        }
        
        if (datosOrden.codigo_venta !== undefined) {
            campos.push('codigo_venta = ?');
            valores.push(datosOrden.codigo_venta);
        }
        
        if (datosOrden.observaciones !== undefined) {
            campos.push('observaciones = ?');
            valores.push(datosOrden.observaciones);
        }
        
        if (datosOrden.estado) {
            campos.push('estado = ?');
            valores.push(datosOrden.estado);
        }
        
        // Si no hay campos para actualizar, retornar
        if (campos.length === 0) return;
        
        // Agregar el id al final de los valores
        valores.push(id);
        
        // Construir y ejecutar la consulta
        const query = `UPDATE ordenes_venta SET ${campos.join(', ')} WHERE id = ?`;
        await db.query(query, valores);
    }
    
    // Eliminar los detalles (productos) de una orden
    async eliminarDetallesOrden(ordenId) {
        await db.query('DELETE FROM ordenes_venta_detalle WHERE orden_venta_id = ?', [ordenId]);
    }
    
    // Obtener todas las órdenes por estado y con productos en stock
    async obtenerPorEstado(estado) {
        const results = await db.query(
            `SELECT DISTINCT ov.*, ovd.id as detalle_id, ovd.producto, ovd.cantidad 
             FROM ordenes_venta ov
             LEFT JOIN ordenes_venta_detalle ovd ON ov.id = ovd.orden_venta_id
             LEFT JOIN productos p ON ovd.producto = p.nombre
             WHERE ov.estado = ? AND p.en_stock = TRUE
             ORDER BY ov.id DESC`,
            [estado]
        );
        if (!results || results.length === 0) {
            return [];
        }
        // Agrupar resultados por orden
        const ordenesMap = new Map();
        results.forEach(row => {
            if (!ordenesMap.has(row.id)) {
                ordenesMap.set(row.id, {
                    id: row.id,
                    fecha: row.fecha,
                    cliente: row.cliente,
                    cliente_final: row.cliente_final,
                    codigo_venta: row.codigo_venta || `OV-${row.id}`,
                    observaciones: row.observaciones,
                    responsable: row.responsable,
                    estado: row.estado,
                    productos: []
                });
            }
            if (row.detalle_id) {
                ordenesMap.get(row.id).productos.push({
                    id: row.detalle_id,
                    producto: row.producto,
                    cantidad: row.cantidad
                });
            }
        });
        return Array.from(ordenesMap.values());
    }
}

module.exports = new OrdenDeVentaRepository();