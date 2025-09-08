const db = require('../config/db');
const { formatMySQLLocal, fechaActual } = require('../utils/fecha');

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
            const fechaActualStr = formatMySQLLocal(fechaActual()); // Usar utilidad de fecha
            const query = `
                INSERT INTO despachos (fecha, orden_venta_id, responsable, observaciones)
                VALUES (?, ?, ?, ?)
            `;
            const result = await db.query(query, [fechaActualStr, ordenVentaId, responsable, observaciones]);
            return result.insertId;
        } catch (error) {
            console.error('Error al crear despacho:', error);
            throw error;
        }
    }
    
    // Agregar detalle de bolsón a un despacho (ahora incluye fecha_despacho)
    async agregarDetalleBolson(despachoId, bolsonCodigo, producto, peso, precinto) {
        try {
            const fechaDespacho = formatMySQLLocal(fechaActual()); // Usar utilidad de fecha
            const query = `
                INSERT INTO despachos_detalle (despacho_id, bolson_codigo, producto, peso, precinto, fecha_despacho)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            await db.query(query, [despachoId, bolsonCodigo, producto, peso, precinto, fechaDespacho]);
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
                       dd.peso,
                       dd.precinto
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
                        peso: row.peso,
                        precinto: row.precinto
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
    
    // SUMATORIA DE DESPACHOS POR PRODUCTO PARA UNA FECHA
    async obtenerDespachosPorProducto(fecha /* 'YYYY-MM-DD' */) {
        try {
            // Convertir a formato de fecha para MySQL (inicio y fin del día)
            const fechaInicio = `${fecha} 00:00:00`;
            const fechaFin = `${fecha} 23:59:59`;
            
            const query = `
                SELECT 
                    dd.producto AS productoId,
                    p.nombre AS nombreProducto,
                    COUNT(dd.id) AS cantidadBolsones,
                    SUM(dd.peso) AS pesoTotal
                FROM despachos_detalle dd
                JOIN despachos d ON dd.despacho_id = d.id
                LEFT JOIN productos p ON dd.producto = p.id
                WHERE d.fecha BETWEEN ? AND ?
                GROUP BY dd.producto, p.nombre
                ORDER BY p.nombre ASC
            `;
            
            const result = await db.query(query, [fechaInicio, fechaFin]);
            return result;
        } catch (error) {
            console.error('Error al obtener despachos por producto:', error);
            throw error;
        }
    }
    
    // Despachos del mes HASTA una fecha específica (para el reporte mensual)
    async obtenerDespachadosDelMesHastaFecha(fecha /* 'YYYY-MM-DD' */) {
        try {
            // Importar la función de utilidad para obtener el rango del mes operativo
            const { ventanaMesOperativo, formatMySQLLocal, parseLocalDate } = require('../utils/fecha');
            
            console.log(`[DEBUG] Fecha solicitada original: ${fecha}`);
            console.log(`[DEBUG] Tipo de fecha: ${typeof fecha}`);
            
            // Parseamos explícitamente la fecha para asegurar el formato correcto
            const fechaObj = parseLocalDate(fecha);
            console.log(`[DEBUG] Fecha parseada: ${fechaObj}`);
            
            // Obtener el rango del mes operativo
            const { inicio, fin } = ventanaMesOperativo(fecha);
            console.log(`[DEBUG] Inicio mes operativo (objeto): ${inicio}`);
            console.log(`[DEBUG] Fin mes operativo (objeto): ${fin}`);
            
            const inicioMesOperativo = formatMySQLLocal(inicio);
            
            // Para el límite superior, usamos el final del día de la fecha solicitada (23:59:59)
            const fechaFinDia = new Date(fechaObj);
            fechaFinDia.setHours(23, 59, 59, 999);
            const finDiaStr = formatMySQLLocal(fechaFinDia);
            
            console.log(`[DESPACHOS_MES_HASTA_FECHA] Solicitud para fecha: ${fecha}`);
            console.log(`[DESPACHOS_MES_HASTA_FECHA] Inicio mes operativo: ${inicioMesOperativo}`);
            console.log(`[DESPACHOS_MES_HASTA_FECHA] Fin día actual: ${finDiaStr}`);
            console.log(`[DESPACHOS_MES_HASTA_FECHA] Buscando despachos desde ${inicioMesOperativo} (inicio mes operativo) hasta ${finDiaStr} (fin del día de la fecha solicitada)`);
            
            // Verificar si hay despachos en este rango de fechas
            const checkQuery = `
                SELECT COUNT(*) AS total 
                FROM despachos d 
                WHERE d.fecha BETWEEN ? AND ?
            `;
            
            const checkResult = await db.query(checkQuery, [inicioMesOperativo, finDiaStr]);
            console.log(`[DESPACHOS_MES_HASTA_FECHA] Se encontraron ${checkResult[0]?.total || 0} registros de despachos entre ${inicioMesOperativo} y ${finDiaStr}`);
            
            // Consulta todos los despachos para depuración
            const todosDespachos = await db.query(`
                SELECT d.id, d.fecha, COUNT(dd.id) as total_detalles
                FROM despachos d
                LEFT JOIN despachos_detalle dd ON d.id = dd.despacho_id
                GROUP BY d.id, d.fecha
                ORDER BY d.fecha DESC
                LIMIT 20
            `);
            
            console.log('[DEBUG] Todos los despachos disponibles:');
            for (const desp of todosDespachos) {
                console.log(`[DEBUG] - Despacho ID: ${desp.id}, Fecha: ${desp.fecha}, Detalles: ${desp.total_detalles}`);
            }
            
            // Consulta de despachos específicamente para el día de hoy
            const despachosHoy = await db.query(`
                SELECT d.id, d.fecha, COUNT(dd.id) as total_detalles, 
                       GROUP_CONCAT(DISTINCT dd.producto) as productos
                FROM despachos d
                LEFT JOIN despachos_detalle dd ON d.id = dd.despacho_id
                WHERE DATE(d.fecha) = DATE(?)
                GROUP BY d.id, d.fecha
            `, [fecha]);
            
            console.log(`[DEBUG] Despachos para hoy (${fecha}):`);
            for (const desp of despachosHoy) {
                console.log(`[DEBUG] - Despacho ID: ${desp.id}, Fecha: ${desp.fecha}, Detalles: ${desp.total_detalles}, Productos: ${desp.productos}`);
            }
            
            // Ahora consulta principal para obtener los despachos por producto
            console.log(`[DEBUG] Ejecutando consulta principal con rango: ${inicioMesOperativo} - ${finDiaStr}`);
            const query = `
                SELECT 
                    dd.producto AS productoId,
                    p.nombre AS nombreProducto,
                    COUNT(dd.id) AS cantidadBolsones,
                    SUM(dd.peso) AS pesoTotal,
                    dd.producto AS producto_id_real,
                    COALESCE(p.nombre, CONCAT('Producto ID ', dd.producto)) AS producto_nombre_real
                FROM despachos_detalle dd
                JOIN despachos d ON dd.despacho_id = d.id
                LEFT JOIN productos p ON dd.producto = p.id
                WHERE d.fecha BETWEEN ? AND ?
                GROUP BY dd.producto, p.nombre
                ORDER BY p.nombre ASC
            `;
            
            const result = await db.query(query, [inicioMesOperativo, finDiaStr]);
            
            console.log(`[DESPACHOS_MES_HASTA_FECHA] Se encontraron ${result.length} productos despachados entre ${inicioMesOperativo} y ${finDiaStr}`);
            console.log(`[DEBUG] Resultado completo: ${JSON.stringify(result)}`);
            
            // Mostrar detalle de cada producto encontrado
            for (let i = 0; i < result.length; i++) {
                const prod = result[i];
                console.log(`[DESPACHOS_MES_HASTA_FECHA] Producto ${i+1}: ID=${prod.productoId}, Nombre=${prod.nombreProducto}, Cantidad=${prod.cantidadBolsones}, Peso=${prod.pesoTotal}`);
            }
            
            // Si no se encontraron productos, hacer diagnósticos adicionales
            if (result.length === 0) {
                console.log(`[DESPACHOS_MES_HASTA_FECHA] ¡ADVERTENCIA! No se encontraron productos despachados en el mes hasta ${fecha}. Verificar consulta SQL y datos.`);
                
                // Consulta adicional para diagnóstico - verificar si hay despachos con fecha de hoy
                const hoyQuery = `
                    SELECT 
                        COUNT(*) AS total,
                        GROUP_CONCAT(DISTINCT DATE(d.fecha)) AS fechas
                    FROM despachos_detalle dd
                    JOIN despachos d ON dd.despacho_id = d.id
                    WHERE DATE(d.fecha) = DATE(?)
                `;
                const hoyResult = await db.query(hoyQuery, [fecha]);
                console.log(`[DESPACHOS_MES_HASTA_FECHA] Despachos con fecha de hoy (${fecha}): ${hoyResult[0]?.total || 0}, fechas: ${hoyResult[0]?.fechas || 'ninguna'}`);
                
                // Consulta específica para diagnosticar el problema con los despachos de hoy
                const infoDespachos = `
                    SELECT 
                        d.id AS despacho_id, 
                        d.fecha AS despacho_fecha, 
                        d.orden_venta_id,
                        d.responsable,
                        dd.id AS detalle_id,
                        dd.producto, 
                        dd.peso,
                        dd.bolson_codigo
                    FROM despachos d
                    JOIN despachos_detalle dd ON d.id = dd.despacho_id
                    WHERE DATE(d.fecha) = DATE(?)
                `;
                console.log(`[DEBUG] Ejecutando consulta de diagnóstico para fecha: ${fecha}`);
                const infoResult = await db.query(infoDespachos, [fecha]);
                console.log(`[DEBUG] Detalles de despachos para hoy (${fecha}), cantidad: ${infoResult.length}`);
                for (const item of infoResult) {
                    console.log(`[DEBUG] Despacho ID=${item.despacho_id}, Fecha=${item.despacho_fecha}, Orden=${item.orden_venta_id}, Producto=${item.producto}, Peso=${item.peso}`);
                }
                
                // Hacer prueba inversa: consultar por ID de producto específico
                if (infoResult.length > 0) {
                    const primerProducto = infoResult[0].producto;
                    const pruebaProducto = `
                        SELECT 
                            COUNT(*) AS total
                        FROM despachos_detalle dd
                        JOIN despachos d ON dd.despacho_id = d.id
                        WHERE dd.producto = ?
                            AND d.fecha BETWEEN ? AND ?
                    `;
                    console.log(`[DEBUG] Probando búsqueda directa para producto ID: ${primerProducto}`);
                    const pruebaResult = await db.query(pruebaProducto, [primerProducto, inicioMesOperativo, finDiaStr]);
                    console.log(`[DEBUG] Resultado prueba producto ${primerProducto}: ${pruebaResult[0]?.total || 0} coincidencias`);
                }
                
                // Consulta extra para diagnóstico - verificar si hay detalles de despacho en general
                const diagnosticoQuery = `
                    SELECT 
                        COUNT(*) AS total,
                        GROUP_CONCAT(DISTINCT DATE(d.fecha)) AS fechas_disponibles
                    FROM despachos_detalle dd
                    JOIN despachos d ON dd.despacho_id = d.id
                    ORDER BY d.fecha DESC
                    LIMIT 20
                `;
                const diagnostico = await db.query(diagnosticoQuery);
                console.log(`[DESPACHOS_MES_HASTA_FECHA] Total de registros en despachos_detalle: ${diagnostico[0]?.total || 0}`);
                console.log(`[DESPACHOS_MES_HASTA_FECHA] Fechas de despachos disponibles: ${diagnostico[0]?.fechas_disponibles || 'ninguna'}`);
                
                // Verificar formato de fecha en la base de datos
                const formatoFecha = `
                    SELECT 
                        d.id,
                        d.fecha,
                        DATE_FORMAT(d.fecha, '%Y-%m-%d') AS fecha_formateada,
                        YEAR(d.fecha) AS anio,
                        MONTH(d.fecha) AS mes,
                        DAY(d.fecha) AS dia
                    FROM despachos d
                    ORDER BY d.fecha DESC
                    LIMIT 5
                `;
                const formatoResult = await db.query(formatoFecha);
                console.log(`[DEBUG] Verificación de formato de fechas en la BD:`);
                for (const row of formatoResult) {
                    console.log(`[DEBUG] ID=${row.id}, Fecha Raw=${row.fecha}, Formateada=${row.fecha_formateada}, Año=${row.anio}, Mes=${row.mes}, Día=${row.dia}`);
                }
            }
            
            return result;
        } catch (error) {
            console.error('Error al obtener despachos del mes hasta fecha específica:', error);
            console.error('Error stack:', error.stack);
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
    
    // Obtener todos los bolsones despachados with paginación
    async obtenerBolsonesDespachados(page = 1, limit = 10, filtros = {}) {
        try {
            // Validación segura de números
            const lim = Number.isFinite(+limit) ? Math.max(1, +limit) : 10;
            const p = Number.isFinite(+page) ? Math.max(1, +page) : 1;
            const off = (p - 1) * lim;
            
            // Construir consulta base - excluir los despachos manuales
            let whereConditions = ['(dd.es_manual = 0 OR dd.es_manual IS NULL)'];
            const filterParams = [];
            
            // Aplicar filtros si existen
            if (filtros.ordenId) {
                whereConditions.push('d.orden_venta_id = ?');
                filterParams.push(filtros.ordenId);
            }
            
            if (filtros.producto) {
                whereConditions.push('CAST(dd.producto AS CHAR) LIKE ?');
                filterParams.push(`%${filtros.producto}%`);
            }
            
            if (filtros.codigo) {
                whereConditions.push('dd.bolson_codigo LIKE ?');
                filterParams.push(`%${filtros.codigo}%`);
            }
            
            if (filtros.precinto) {
                whereConditions.push('dd.precinto LIKE ?');
                filterParams.push(`%${filtros.precinto}%`);
            }
            
            if (filtros.fechaDesde) {
                whereConditions.push('d.fecha >= ?');
                filterParams.push(filtros.fechaDesde);
            }
            
            if (filtros.fechaHasta) {
                whereConditions.push('d.fecha <= ?');
                filterParams.push(filtros.fechaHasta);
            }
            
            // Construir la cláusula WHERE
            const whereClause = whereConditions.join(' AND ');
            
            // Consulta principal: NO parametrizamos LIMIT/OFFSET
            const selectSql = `
                SELECT dd.id, dd.bolson_codigo, dd.producto, dd.peso, dd.precinto,
                       d.fecha, d.responsable, d.orden_venta_id
                FROM despachos_detalle dd
                JOIN despachos d ON dd.despacho_id = d.id
                WHERE ${whereClause}
                ORDER BY d.fecha DESC, dd.id DESC 
                LIMIT ${lim} OFFSET ${off}
            `;
            
            const result = await db.query(selectSql, filterParams);
            
            // Consulta para contar: mismos parámetros de filtro
            const countSql = `
                SELECT COUNT(*) as total 
                FROM despachos_detalle dd 
                JOIN despachos d ON dd.despacho_id = d.id
                WHERE ${whereClause}
            `;
            
            const countResult = await db.query(countSql, filterParams);
            const total = countResult[0]?.total ?? 0;
            
            return {
                data: result,
                pagination: {
                    total,
                    page: p,
                    limit: lim,
                    totalPages: Math.ceil(total / lim)
                }
            };
        } catch (error) {
            console.error('Error al obtener bolsones despachados:', error);
            console.error('Detalles del error:', error.message, error.stack);
            throw error;
        }
    }
    
    // Agregar detalle de producto manual a un despacho (para productos sin códigos)
    async agregarDetalleManual(despachoId, codigoManual, producto, peso) {
        try {
            const fechaDespacho = formatMySQLLocal(fechaActual()); // Usar utilidad de fecha
            await db.query(
                `INSERT INTO despachos_detalle (despacho_id, bolson_codigo, producto, peso, es_manual, fecha_despacho) 
                 VALUES (?, ?, ?, ?, 1, ?)`,
                [despachoId, codigoManual, producto, peso, fechaDespacho]
            );
        } catch (error) {
            console.error('Error al agregar detalle manual al despacho:', error);
            throw error;
        }
    }
}

module.exports = new DespachoRepository();