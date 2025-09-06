const db = require('../config/db');

class PlanificacionRepository {
    /**
     * Obtiene la planificación de producción para una fecha específica
     * @param {number} anio - Año de la planificación
     * @param {number} mes - Mes de la planificación (1-12)
     * @param {number} dia - Día de la planificación
     * @returns {Promise<Object>} - Planificación para la fecha especificada
     */
    async obtenerPlanificacion(anio, mes, dia) {
        try {
            // Buscar si existe una planificación para esta fecha
            const query = `
                SELECT p.id, p.anio, p.mes, p.dia, p.fecha_creacion, p.fecha_modificacion
                FROM planificacion_produccion p
                WHERE p.anio = ? AND p.mes = ? AND p.dia = ?
            `;
            
            const planificacion = await db.query(query, [anio, mes, dia]);
            
            // Si no existe planificación para esta fecha
            if (planificacion.length === 0) {
                return null;
            }
            
            // Obtener los detalles de la planificación (productos y kilos)
            // Modificado para solo incluir productos con en_stock = 1
            const detallesQuery = `
                SELECT pd.producto_id, pd.kilos
                FROM planificacion_produccion_detalle pd
                JOIN productos p ON pd.producto_id = p.id
                WHERE pd.planificacion_id = ? AND p.en_stock = 1
            `;
            
            const detalles = await db.query(detallesQuery, [planificacion[0].id]);
            
            // Crear objeto con los detalles por producto
            const productos = {};
            detalles.forEach(detalle => {
                productos[detalle.producto_id] = detalle.kilos;
            });
            
            // Devolver la planificación completa
            return {
                id: planificacion[0].id,
                anio: planificacion[0].anio,
                mes: planificacion[0].mes,
                dia: planificacion[0].dia,
                fecha_creacion: planificacion[0].fecha_creacion,
                fecha_modificacion: planificacion[0].fecha_modificacion,
                productos
            };
        } catch (error) {
            console.error('Error al obtener planificación de producción:', error);
            throw error;
        }
    }
    
    /**
     * Guarda o actualiza una planificación de producción
     * @param {number} anio - Año de la planificación
     * @param {number} mes - Mes de la planificación (1-12)
     * @param {number} dia - Día de la planificación
     * @param {Object} productos - Objeto con producto_id como clave y kilos como valor
     * @param {number} usuarioId - ID del usuario que realiza la acción
     * @returns {Promise<Object>} - Planificación guardada
     */
    async guardarPlanificacion(anio, mes, dia, productos, usuarioId = null) {
        try {
            // Verificar si ya existe una planificación para esta fecha
            const existeQuery = `
                SELECT id FROM planificacion_produccion
                WHERE anio = ? AND mes = ? AND dia = ?
            `;
            
            const existe = await db.query(existeQuery, [anio, mes, dia]);
            let planificacionId;
            
            if (existe.length === 0) {
                // Si no existe, crear nueva planificación
                const insertQuery = `
                    INSERT INTO planificacion_produccion (anio, mes, dia, usuario_id)
                    VALUES (?, ?, ?, ?)
                `;
                
                const result = await db.query(insertQuery, [anio, mes, dia, usuarioId]);
                planificacionId = result.insertId;
            } else {
                // Si existe, actualizar la existente
                planificacionId = existe[0].id;
                
                // Eliminar detalles antiguos para reemplazarlos
                await db.query(
                    'DELETE FROM planificacion_produccion_detalle WHERE planificacion_id = ?', 
                    [planificacionId]
                );
            }
            
            // Insertar los detalles de productos
            if (Object.keys(productos).length > 0) {
                // Solo insertar productos con en_stock = 1
                const productosConStock = {};
                const productosIdsStr = Object.keys(productos).join(',');
                
                if (productosIdsStr.length > 0) {
                    const enStockQuery = `
                        SELECT id FROM productos 
                        WHERE id IN (${productosIdsStr}) AND en_stock = 1
                    `;
                    
                    const productosConStockResult = await db.query(enStockQuery);
                    const idsConStock = productosConStockResult.map(p => p.id);
                    
                    // Filtrar solo productos con stock
                    for (const [productoId, kilos] of Object.entries(productos)) {
                        if (idsConStock.includes(parseInt(productoId))) {
                            productosConStock[productoId] = kilos;
                        }
                    }
                }
                
                // Si hay productos con stock, insertarlos
                if (Object.keys(productosConStock).length > 0) {
                    const detallesValues = [];
                    const detallesParams = [];
                    
                    Object.entries(productosConStock).forEach(([productoId, kilos]) => {
                        detallesValues.push('(?, ?, ?)');
                        detallesParams.push(planificacionId, productoId, kilos);
                    });
                    
                    const insertDetallesQuery = `
                        INSERT INTO planificacion_produccion_detalle 
                        (planificacion_id, producto_id, kilos)
                        VALUES ${detallesValues.join(', ')}
                    `;
                    
                    await db.query(insertDetallesQuery, detallesParams);
                }
            }
            
            // Devolver la planificación guardada
            return this.obtenerPlanificacion(anio, mes, dia);
            
        } catch (error) {
            console.error('Error al guardar planificación de producción:', error);
            throw error;
        }
    }
    
    /**
     * Elimina una planificación de producción
     * @param {number} anio - Año de la planificación
     * @param {number} mes - Mes de la planificación (1-12)
     * @param {number} dia - Día de la planificación
     * @returns {Promise<boolean>} - true si se eliminó correctamente
     */
    async eliminarPlanificacion(anio, mes, dia) {
        try {
            const query = `
                DELETE FROM planificacion_produccion
                WHERE anio = ? AND mes = ? AND dia = ?
            `;
            
            const result = await db.query(query, [anio, mes, dia]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error al eliminar planificación de producción:', error);
            throw error;
        }
    }

    /**
     * Obtiene la planificación acumulada del mes hasta una fecha específica
     * @param {string} fecha - Fecha hasta la cual acumular en formato 'YYYY-MM-DD'
     * @returns {Promise<Object>} - Objeto con la planificación acumulada por producto
     */
    async obtenerPlanificacionAcumuladaHastaFecha(fecha) {
        try {
            // Extraer año, mes y día de la fecha
            const [anio, mes, dia] = fecha.split('-').map(Number);
            
            // Consulta para obtener todas las planificaciones del mes hasta el día indicado
            const query = `
                SELECT pp.id, pp.anio, pp.mes, pp.dia, 
                       ppd.producto_id, ppd.kilos,
                       p.nombre as nombre_producto
                FROM planificacion_produccion pp
                JOIN planificacion_produccion_detalle ppd ON pp.id = ppd.planificacion_id
                JOIN productos p ON ppd.producto_id = p.id
                WHERE pp.anio = ? AND pp.mes = ? AND pp.dia <= ? AND p.en_stock = 1
                ORDER BY pp.dia ASC
            `;
            
            const planificaciones = await db.query(query, [anio, mes, dia]);
            
            // Acumular la planificación por producto
            const acumuladoPorProducto = {};
            
            planificaciones.forEach(plan => {
                const productoId = plan.producto_id;
                
                if (!acumuladoPorProducto[productoId]) {
                    acumuladoPorProducto[productoId] = {
                        productoId,
                        nombre: plan.nombre_producto,
                        kilosAcumulados: 0
                    };
                }
                
                acumuladoPorProducto[productoId].kilosAcumulados += Number(plan.kilos || 0);
            });
            
            return {
                fecha,
                productos: Object.values(acumuladoPorProducto)
            };
        } catch (error) {
            console.error('Error al obtener planificación acumulada:', error);
            throw error;
        }
    }
}

module.exports = new PlanificacionRepository();