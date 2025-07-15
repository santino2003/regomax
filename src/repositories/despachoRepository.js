const db = require('../config/db');

class DespachoRepository {
    // Iniciar una transacción
    async iniciarTransaccion() {
        await db.query('START TRANSACTION');
    }
    
    // Confirmar una transacción
    async confirmarTransaccion() {
        await db.query('COMMIT');
    }
    
    // Revertir una transacción
    async revertirTransaccion() {
        await db.query('ROLLBACK');
    }
    
    // Crear un nuevo despacho
    async crearDespacho(ordenVentaId, responsable, observaciones) {
        try {
            const fechaActual = new Date().toISOString().slice(0, 19).replace('T', ' '); // formato YYYY-MM-DD HH:MM:SS
            const query = `
                INSERT INTO despachos (fecha, orden_venta_id, responsable, observaciones)
                VALUES (?, ?, ?, ?)
            `;
            const result = await db.query(query, [fechaActual, ordenVentaId, responsable, observaciones]);
            return result.insertId;
        } catch (error) {
            console.error('Error al crear despacho:', error);
            throw error;
        }
    }
    
    // Agregar detalle de bolsón a un despacho (ahora incluye fecha_despacho)
    async agregarDetalleBolson(despachoId, bolsonCodigo, producto, peso) {
        try {
            const fechaDespacho = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const query = `
                INSERT INTO despachos_detalle (despacho_id, bolson_codigo, producto, peso, fecha_despacho)
                VALUES (?, ?, ?, ?, ?)
            `;
            await db.query(query, [despachoId, bolsonCodigo, producto, peso, fechaDespacho]);
            // Marcar bolsón como despachado
            const bolsonRepository = require('./bolsonRepository');
            await bolsonRepository.marcarComoDespachadoPorCodigo(bolsonCodigo);
        } catch (error) {
            console.error('Error al agregar detalle de bolsón:', error);
            throw error;
        }
    }
    
    // Verificar si un bolsón ya fue despachado
    async verificarBolsonDespachado(bolsonCodigo) {
        try {
            const query = `
                SELECT * FROM despachos_detalle WHERE bolson_codigo = ?
            `;
            const result = await db.query(query, [bolsonCodigo]);
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Error al verificar bolsón despachado:', error);
            throw error;
        }
    }
    
    // Obtener todos los despachos de una orden
    async obtenerDespachosPorOrden(ordenVentaId) {
        try {
            const query = `
                SELECT d.*, 
                       dd.id as detalle_id, 
                       dd.bolson_codigo, 
                       dd.producto, 
                       dd.peso
                FROM despachos d
                LEFT JOIN despachos_detalle dd ON d.id = dd.despacho_id
                WHERE d.orden_venta_id = ?
                ORDER BY d.fecha DESC
            `;
            const result = await db.query(query, [ordenVentaId]);
            
            // Si no hay resultados, retornar un array vacío
            if (!result || result.length === 0) return [];
            
            // Agrupar los resultados por despacho
            const despachos = new Map();
            
            result.forEach(row => {
                // Si no existe el despacho en el map, crearlo
                if (!despachos.has(row.id)) {
                    despachos.set(row.id, {
                        id: row.id,
                        fecha: row.fecha,
                        responsable: row.responsable,
                        orden_venta_id: row.orden_venta_id,
                        observaciones: row.observaciones,
                        bolsones: []
                    });
                }
                
                // Si hay detalles de bolsón, agregarlos al despacho
                if (row.detalle_id) {
                    despachos.get(row.id).bolsones.push({
                        id: row.detalle_id,
                        codigo: row.bolson_codigo,
                        producto: row.producto,
                        peso: row.peso
                    });
                }
            });
            
            // Convertir el Map en un array
            return Array.from(despachos.values());
        } catch (error) {
            console.error('Error al obtener despachos por orden:', error);
            throw error;
        }
    }
    
    // Actualizar el peso despachado en la orden de venta
    async actualizarPesoProductoOrden(ordenId, producto, pesoDespachado) {
        try {
            // Primero obtenemos los detalles actuales del producto en la orden
            const queryGet = `
                SELECT id, producto, cantidad 
                FROM ordenes_venta_detalle 
                WHERE orden_venta_id = ? AND producto = ?
            `;
            const detalleActual = await db.query(queryGet, [ordenId, producto]);
            
            if (!detalleActual || detalleActual.length === 0) {
                throw new Error(`Producto ${producto} no encontrado en la orden ${ordenId}`);
            }
            
            // Calcular el nuevo peso restante
            const pesoActual = detalleActual[0].cantidad;
            const nuevoResto = Math.max(0, pesoActual - pesoDespachado);
            
            // Actualizar el peso en la orden
            const queryUpdate = `
                UPDATE ordenes_venta_detalle 
                SET cantidad = ? 
                WHERE id = ?
            `;
            await db.query(queryUpdate, [nuevoResto, detalleActual[0].id]);
            
            return {
                pesoAnterior: pesoActual,
                pesoNuevo: nuevoResto,
                pesoDespachado: pesoDespachado
            };
        } catch (error) {
            console.error('Error al actualizar peso de producto en orden:', error);
            throw error;
        }
    }
    
    // Verificar si todos los productos de una orden están en cero
    async verificarOrdenCompleta(ordenId) {
        try {
            const query = `
                SELECT SUM(cantidad) as total_pendiente
                FROM ordenes_venta_detalle
                WHERE orden_venta_id = ?
            `;
            const result = await db.query(query, [ordenId]);
            
            // Si la suma es 0 o null, la orden está completa
            return !result[0].total_pendiente || result[0].total_pendiente <= 0;
        } catch (error) {
            console.error('Error al verificar orden completa:', error);
            throw error;
        }
    }
    
    // Actualizar el estado de una orden
    async actualizarEstadoOrden(ordenId, estado) {
        try {
            const query = `
                UPDATE ordenes_venta 
                SET estado = ? 
                WHERE id = ?
            `;
            await db.query(query, [estado, ordenId]);
        } catch (error) {
            console.error('Error al actualizar estado de orden:', error);
            throw error;
        }
    }
    
    // Obtener todos los bolsones despachados con paginación
    async obtenerBolsonesDespachados(page = 1, limit = 10, filtros = {}) {
        try {
            const offset = (page - 1) * limit;
            
            // Construir consulta base
            let query = `
                SELECT dd.id, dd.bolson_codigo, dd.producto, dd.peso,
                       d.fecha, d.responsable, d.orden_venta_id
                FROM despachos_detalle dd
                JOIN despachos d ON dd.despacho_id = d.id
            `;
            
            // Condiciones para filtros
            const condiciones = [];
            const parametros = [];
            
            if (filtros.ordenId) {
                condiciones.push('d.orden_venta_id = ?');
                parametros.push(filtros.ordenId);
            }
            
            if (filtros.producto) {
                condiciones.push('dd.producto LIKE ?');
                parametros.push(`%${filtros.producto}%`);
            }
            
            if (filtros.codigo) {
                condiciones.push('dd.bolson_codigo LIKE ?');
                parametros.push(`%${filtros.codigo}%`);
            }
            
            if (filtros.fechaDesde) {
                condiciones.push('d.fecha >= ?');
                parametros.push(filtros.fechaDesde);
            }
            
            if (filtros.fechaHasta) {
                condiciones.push('d.fecha <= ?');
                parametros.push(filtros.fechaHasta);
            }
            
            // Agregar condiciones a la consulta
            if (condiciones.length > 0) {
                query += ' WHERE ' + condiciones.join(' AND ');
            }
            
            // Agregar ordenación y paginación
            query += ' ORDER BY d.fecha DESC, dd.id DESC LIMIT ? OFFSET ?';
            parametros.push(limit, offset);
            
            const result = await db.query(query, parametros);
            
            // Consulta para contar el total con los mismos filtros
            let countQuery = 'SELECT COUNT(*) as total FROM despachos_detalle dd JOIN despachos d ON dd.despacho_id = d.id';
            
            if (condiciones.length > 0) {
                countQuery += ' WHERE ' + condiciones.join(' AND ');
            }
            
            const countResult = await db.query(countQuery, parametros.slice(0, -2)); // Eliminar limit y offset
            
            return {
                data: result,
                pagination: {
                    total: countResult[0].total,
                    page,
                    limit,
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            };
        } catch (error) {
            console.error('Error al obtener bolsones despachados:', error);
            throw error;
        }
    }
}

module.exports = new DespachoRepository();