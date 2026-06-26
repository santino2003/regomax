const db = require('../config/db');

class PagoRepository {
    /**
     * Registrar un pago por recepción de bienes
     */
    async registrarPagoRecepcion(pagoData) {
        try {
            const {
                ordenCompraId,
                bienId,
                proveedorId,
                cantidadRecibida,
                precioUnitario,
                montoPago,
                fechaPago,
                registradoPor,
                observaciones,
                moneda,
                connection
            } = pagoData;

            const sql =
                `INSERT INTO pagos (
                    orden_compra_id,
                    bien_id,
                    proveedor_id,
                    tipo_pago,
                    cantidad_recibida,
                    precio_unitario,
                    monto_pago,
                    moneda,
                    fecha_pago,
                    registrado_por,
                    observaciones
                ) VALUES (?, ?, ?, 'RECEPCION', ?, ?, ?, ?, ?, ?, ?)`;
            const params = [
                ordenCompraId,
                bienId,
                proveedorId,
                cantidadRecibida,
                precioUnitario,
                montoPago,
                moneda || 'ARS',
                fechaPago,
                registradoPor,
                observaciones || null
            ];

            let result;
            if (connection) {
                const [insertResult] = await connection.query(sql, params);
                result = insertResult;
            } else {
                result = await db.query(sql, params);
            }

            return { id: result.insertId };
        } catch (error) {
            console.error('Error en PagoRepository.registrarPagoRecepcion:', error);
            throw error;
        }
    }

    /**
     * Registrar un adelanto de pago
     */
    async registrarAdelanto(pagoData) {
        try {
            const {
                ordenCompraId,
                proveedorId,
                montoAdelanto,
                fechaPago,
                registradoPor,
                observaciones,
                moneda,
                connection
            } = pagoData;

            const sql =
                `INSERT INTO pagos (
                    orden_compra_id,
                    proveedor_id,
                    tipo_pago,
                    monto_pago,
                    monto_adelanto,
                    moneda,
                    fecha_pago,
                    registrado_por,
                    observaciones
                ) VALUES (?, ?, 'ADELANTO', ?, ?, ?, ?, ?, ?)`;
            const params = [
                ordenCompraId,
                proveedorId,
                montoAdelanto,
                montoAdelanto,
                moneda || 'ARS',
                fechaPago,
                registradoPor,
                observaciones || null
            ];

            let result;
            if (connection) {
                const [insertResult] = await connection.query(sql, params);
                result = insertResult;
            } else {
                result = await db.query(sql, params);
            }

            return { id: result.insertId };
        } catch (error) {
            console.error('Error en PagoRepository.registrarAdelanto:', error);
            throw error;
        }
    }

    /**
     * Registrar el pago del saldo completo
     */
    async registrarPagoSaldoCompleto(pagoData) {
        try {
            const {
                ordenCompraId,
                proveedorId,
                montoTotal,
                montoAdelanto,
                saldoAPagar,
                fechaPago,
                registradoPor,
                observaciones,
                moneda,
                connection
            } = pagoData;

            const sql =
                `INSERT INTO pagos (
                    orden_compra_id,
                    proveedor_id,
                    tipo_pago,
                    monto_pago,
                    monto_total,
                    monto_adelanto,
                    moneda,
                    fecha_pago,
                    registrado_por,
                    observaciones
                ) VALUES (?, ?, 'SALDO_COMPLETO', ?, ?, ?, ?, ?, ?, ?)`;
            const params = [
                ordenCompraId,
                proveedorId,
                saldoAPagar,
                montoTotal,
                montoAdelanto,
                moneda || 'ARS',
                fechaPago,
                registradoPor,
                observaciones || null
            ];

            let result;
            if (connection) {
                const [insertResult] = await connection.query(sql, params);
                result = insertResult;
            } else {
                result = await db.query(sql, params);
            }

            return { id: result.insertId };
        } catch (error) {
            console.error('Error en PagoRepository.registrarPagoSaldoCompleto:', error);
            throw error;
        }
    }

    /**
     * Registrar un pago múltiple (comprobante único)
     */
    async registrarPagoMultiple(pagoData) {
        try {
            const {
                ordenCompraId,
                proveedorId,
                montoPago,
                fechaPago,
                registradoPor,
                observaciones,
                moneda,
                connection
            } = pagoData;

            const sql =
                `INSERT INTO pagos (
                    orden_compra_id,
                    bien_id,
                    proveedor_id,
                    tipo_pago,
                    monto_pago,
                    moneda,
                    fecha_pago,
                    registrado_por,
                    observaciones
                ) VALUES (?, NULL, ?, 'MULTIPLE', ?, ?, ?, ?, ?)`;
            const params = [
                ordenCompraId,
                proveedorId,
                montoPago,
                moneda || 'ARS',
                fechaPago,
                registradoPor,
                observaciones || null
            ];

            let result;
            if (connection) {
                const [insertResult] = await connection.query(sql, params);
                result = insertResult;
            } else {
                result = await db.query(sql, params);
            }

            return { id: result.insertId };
        } catch (error) {
            console.error('Error en PagoRepository.registrarPagoMultiple:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los pagos de una orden de compra
     */
    async obtenerPagosPorOrden(ordenCompraId) {
        try {
            const pagos = await db.query(
                `SELECT 
                    p.*,
                    b.nombre AS bien_nombre,
                    b.codigo AS bien_codigo,
                    pr.nombre AS proveedor_nombre,
                    oc.codigo AS orden_codigo
                FROM pagos p
                LEFT JOIN bienes b ON p.bien_id = b.id
                JOIN proveedores pr ON p.proveedor_id = pr.id
                JOIN ordenes_compra oc ON p.orden_compra_id = oc.id
                WHERE p.orden_compra_id = ?
                ORDER BY p.fecha_registro DESC`,
                [ordenCompraId]
            );

            return pagos;
        } catch (error) {
            console.error('Error en PagoRepository.obtenerPagosPorOrden:', error);
            throw error;
        }
    }

    /**
     * Obtener pagos por proveedor en un rango de fechas
     */
    async obtenerPagosPorProveedor(proveedorId, fechaInicio = null, fechaFin = null) {
        try {
            let query = `
                SELECT 
                    p.*,
                    b.nombre AS bien_nombre,
                    b.codigo AS bien_codigo,
                    pr.nombre AS proveedor_nombre,
                    oc.codigo AS orden_codigo
                FROM pagos p
                LEFT JOIN bienes b ON p.bien_id = b.id
                JOIN proveedores pr ON p.proveedor_id = pr.id
                JOIN ordenes_compra oc ON p.orden_compra_id = oc.id
                WHERE p.proveedor_id = ?
            `;
            
            const params = [proveedorId];

            if (fechaInicio) {
                query += ' AND p.fecha_pago >= ?';
                params.push(fechaInicio);
            }

            if (fechaFin) {
                query += ' AND p.fecha_pago <= ?';
                params.push(fechaFin);
            }

            query += ' ORDER BY p.fecha_pago DESC, p.fecha_registro DESC';

            const pagos = await db.query(query, params);
            return pagos;
        } catch (error) {
            console.error('Error en PagoRepository.obtenerPagosPorProveedor:', error);
            throw error;
        }
    }

    /**
     * Obtener total de adelantos para una orden de compra
     */
    async obtenerTotalAdelantos(ordenCompraId) {
        try {
            const result = await db.query(
                `SELECT COALESCE(SUM(monto_pago), 0) as total_adelantos
                FROM pagos
                WHERE orden_compra_id = ? AND tipo_pago = 'ADELANTO'`,
                [ordenCompraId]
            );

            return result.length > 0 ? parseFloat(result[0].total_adelantos) : 0;
        } catch (error) {
            console.error('Error en PagoRepository.obtenerTotalAdelantos:', error);
            throw error;
        }
    }

    /**
     * Obtener resumen de pagos por fecha
     */
    async obtenerResumenPorFecha(fechaInicio, fechaFin) {
        try {
            const resumen = await db.query(
                `SELECT 
                    p.fecha_pago,
                    p.tipo_pago,
                    pr.nombre AS proveedor_nombre,
                    COUNT(*) as cantidad_pagos,
                    SUM(p.monto_pago) as total_monto
                FROM pagos p
                JOIN proveedores pr ON p.proveedor_id = pr.id
                WHERE p.fecha_pago BETWEEN ? AND ?
                GROUP BY p.fecha_pago, p.tipo_pago, pr.nombre
                ORDER BY p.fecha_pago DESC, pr.nombre`,
                [fechaInicio, fechaFin]
            );

            return resumen;
        } catch (error) {
            console.error('Error en PagoRepository.obtenerResumenPorFecha:', error);
            throw error;
        }
    }

    /**
     * Eliminar un pago (solo para correcciones)
     */
    async eliminarPago(pagoId) {
        try {
            await db.query('DELETE FROM pagos WHERE id = ?', [pagoId]);
            return { success: true };
        } catch (error) {
            console.error('Error en PagoRepository.eliminarPago:', error);
            throw error;
        }
    }

    /**
     * Eliminar pagos de contrafactura (ADELANTO y SALDO_COMPLETO) de una orden
     * Esto se usa cuando se edita una orden a contrafactura para evitar duplicados
     */
    async eliminarPagosContrafactura(ordenCompraId, connection = null) {
        try {
            const sql = `DELETE FROM pagos 
                WHERE orden_compra_id = ? 
                AND tipo_pago IN ('ADELANTO', 'SALDO_COMPLETO')`;
            const params = [ordenCompraId];

            let result;
            if (connection) {
                const [deleteResult] = await connection.query(sql, params);
                result = deleteResult;
            } else {
                result = await db.query(sql, params);
            }
            
            console.log(`🗑️ Eliminados ${result.affectedRows || 0} pagos de contrafactura de la orden ${ordenCompraId}`);
            return { success: true, deletedCount: result.affectedRows || 0 };
        } catch (error) {
            console.error('Error en PagoRepository.eliminarPagosContrafactura:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los pagos de contrafactura (ADELANTO y SALDO_COMPLETO) de una orden
     * Método optimizado que obtiene todos los pagos en una sola consulta
     */
    async obtenerPagosContrafacturaPorOrden(ordenCompraId) {
        try {
            const pagos = await db.query(
                `SELECT * FROM pagos 
                WHERE orden_compra_id = ? 
                AND tipo_pago IN ('ADELANTO', 'SALDO_COMPLETO')
                ORDER BY tipo_pago, fecha_registro DESC`,
                [ordenCompraId]
            );
            
            // Separar por tipo para facilitar el procesamiento
            return {
                adelantos: pagos.filter(p => p.tipo_pago === 'ADELANTO'),
                saldos: pagos.filter(p => p.tipo_pago === 'SALDO_COMPLETO'),
                todos: pagos
            };
        } catch (error) {
            console.error('Error en PagoRepository.obtenerPagosContrafacturaPorOrden:', error);
            throw error;
        }
    }

    /**
     * Obtener pagos de adelanto de una orden
     */
    async obtenerAdelantosPorOrden(ordenCompraId) {
        try {
            const pagos = await db.query(
                `SELECT * FROM pagos 
                WHERE orden_compra_id = ? 
                AND tipo_pago = 'ADELANTO'
                ORDER BY fecha_registro DESC`,
                [ordenCompraId]
            );
            return pagos;
        } catch (error) {
            console.error('Error en PagoRepository.obtenerAdelantosPorOrden:', error);
            throw error;
        }
    }

    /**
     * Obtener pagos de saldo completo de una orden
     */
    async obtenerSaldosCompletosPorOrden(ordenCompraId) {
        try {
            const pagos = await db.query(
                `SELECT * FROM pagos 
                WHERE orden_compra_id = ? 
                AND tipo_pago = 'SALDO_COMPLETO'
                ORDER BY fecha_registro DESC`,
                [ordenCompraId]
            );
            return pagos;
        } catch (error) {
            console.error('Error en PagoRepository.obtenerSaldosCompletosPorOrden:', error);
            throw error;
        }
    }

    /**
     * Actualizar un adelanto existente
     */
    async actualizarAdelanto(pagoId, montoAdelanto, fechaPago) {
        try {
            await db.query(
                `UPDATE pagos 
                SET monto_pago = ?,
                    monto_adelanto = ?,
                    fecha_pago = ?
                WHERE id = ? AND tipo_pago = 'ADELANTO'`,
                [montoAdelanto, montoAdelanto, fechaPago, pagoId]
            );
            return { success: true };
        } catch (error) {
            console.error('Error en PagoRepository.actualizarAdelanto:', error);
            throw error;
        }
    }

    /**
     * Actualizar un pago de saldo completo existente
     */
    async actualizarSaldoCompleto(pagoId, montoTotal, montoAdelanto, saldoAPagar, fechaPago) {
        try {
            await db.query(
                `UPDATE pagos 
                SET monto_pago = ?,
                    monto_total = ?,
                    monto_adelanto = ?,
                    fecha_pago = ?
                WHERE id = ? AND tipo_pago = 'SALDO_COMPLETO'`,
                [saldoAPagar, montoTotal, montoAdelanto, fechaPago, pagoId]
            );
            return { success: true };
        } catch (error) {
            console.error('Error en PagoRepository.actualizarSaldoCompleto:', error);
            throw error;
        }
    }

    /**
     * Obtener un pago por ID
     */
    async obtenerPorId(pagoId) {
        try {
            const pagos = await db.query(
                `SELECT 
                    p.*,
                    b.nombre AS bien_nombre,
                    b.codigo AS bien_codigo,
                    pr.nombre AS proveedor_nombre,
                    oc.codigo AS orden_codigo
                FROM pagos p
                LEFT JOIN bienes b ON p.bien_id = b.id
                JOIN proveedores pr ON p.proveedor_id = pr.id
                JOIN ordenes_compra oc ON p.orden_compra_id = oc.id
                WHERE p.id = ?`,
                [pagoId]
            );

            return pagos.length > 0 ? pagos[0] : null;
        } catch (error) {
            console.error('Error en PagoRepository.obtenerPorId:', error);
            throw error;
        }
    }

    /**
     * Obtener pagos por IDs
     */
    async obtenerPagosPorIds(pagoIds) {
        try {
            if (!pagoIds || pagoIds.length === 0) {
                return [];
            }

            const placeholders = pagoIds.map(() => '?').join(',');
            const pagos = await db.query(
                `SELECT 
                    p.*,
                    b.nombre AS bien_nombre,
                    b.codigo AS bien_codigo,
                    pr.nombre AS proveedor_nombre,
                    oc.codigo AS orden_codigo
                FROM pagos p
                LEFT JOIN bienes b ON p.bien_id = b.id
                JOIN proveedores pr ON p.proveedor_id = pr.id
                JOIN ordenes_compra oc ON p.orden_compra_id = oc.id
                WHERE p.id IN (${placeholders})`,
                pagoIds
            );

            return pagos;
        } catch (error) {
            console.error('Error en PagoRepository.obtenerPagosPorIds:', error);
            throw error;
        }
    }

    /**
     * Obtener pagos con filtros y paginación
     */
    async obtenerPagosConFiltros(filtros = {}, limit = null, offset = null) {
        try {
            // Construir la consulta base
            let query = `
                SELECT 
                    p.*,
                    b.nombre AS bien_nombre,
                    b.codigo AS bien_codigo,
                    pr.nombre AS proveedor_nombre,
                    oc.codigo AS orden_codigo
                FROM pagos p
                LEFT JOIN bienes b ON p.bien_id = b.id
                JOIN proveedores pr ON p.proveedor_id = pr.id
                JOIN ordenes_compra oc ON p.orden_compra_id = oc.id
                WHERE 1=1
            `;

            const params = [];

            // Filtro de estado pagado (por defecto solo mostrar pendientes)
            // Si filtros.pagado es undefined, mostrar solo pendientes (FALSE)
            // Si filtros.pagado es 'true', mostrar solo pagados
            // Si filtros.pagado es 'all', mostrar todos
            if (filtros.pagado === undefined || filtros.pagado === '' || filtros.pagado === 'false') {
                query += ' AND p.pagado = FALSE';
            } else if (filtros.pagado === 'true') {
                query += ' AND p.pagado = TRUE';
            }
            // Si es 'all', no agregamos filtro

            // Ocultar pagos incluidos en un pago múltiple (evitar doble conteo)
            query += " AND (p.detalle_pago IS NULL OR LOWER(p.detalle_pago) NOT LIKE '%incluido en pago%')";

            // Aplicar filtros
            if (filtros.proveedor_id) {
                query += ' AND p.proveedor_id = ?';
                params.push(filtros.proveedor_id);
            }

            if (filtros.tipo_pago) {
                query += ' AND p.tipo_pago = ?';
                params.push(filtros.tipo_pago);
            }

            if (filtros.fecha_desde) {
                query += ' AND p.fecha_pago >= ?';
                params.push(filtros.fecha_desde);
            }

            if (filtros.fecha_hasta) {
                query += ' AND p.fecha_pago <= ?';
                params.push(filtros.fecha_hasta);
            }

            // Ordenar por fecha más vieja primero (lo más antiguo arriba)
            query += ' ORDER BY p.fecha_pago ASC, p.fecha_registro ASC';

            // Obtener total de registros con los mismos filtros
            let countQuery = `
                SELECT COUNT(*) as total
                FROM pagos p
                LEFT JOIN bienes b ON p.bien_id = b.id
                JOIN proveedores pr ON p.proveedor_id = pr.id
                JOIN ordenes_compra oc ON p.orden_compra_id = oc.id
                WHERE 1=1
            `;

            // Aplicar el mismo filtro de pagado al conteo
            if (filtros.pagado === undefined || filtros.pagado === '' || filtros.pagado === 'false') {
                countQuery += ' AND p.pagado = FALSE';
            } else if (filtros.pagado === 'true') {
                countQuery += ' AND p.pagado = TRUE';
            }
            
            // Reconstruir los filtros para el count
            let countQueryWithFilters = countQuery;
            const countParams = [];

            if (filtros.proveedor_id) {
                countQueryWithFilters += ' AND p.proveedor_id = ?';
                countParams.push(filtros.proveedor_id);
            }

            if (filtros.tipo_pago) {
                countQueryWithFilters += ' AND p.tipo_pago = ?';
                countParams.push(filtros.tipo_pago);
            }

            if (filtros.fecha_desde) {
                countQueryWithFilters += ' AND p.fecha_pago >= ?';
                countParams.push(filtros.fecha_desde);
            }

            if (filtros.fecha_hasta) {
                countQueryWithFilters += ' AND p.fecha_pago <= ?';
                countParams.push(filtros.fecha_hasta);
            }

            const countResult = await db.query(countQueryWithFilters, countParams);
            const total = countResult[0].total;

            // Aplicar paginación si se especifica (insertamos directamente en la query, no como parámetros)
            if (limit !== null && offset !== null) {
                query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
            }

            // Obtener los pagos
            const pagos = await db.query(query, params);

            return {
                pagos,
                total
            };
        } catch (error) {
            console.error('Error en PagoRepository.obtenerPagosConFiltros:', error);
            throw error;
        }
    }

    /**
     * Obtener totales agregados con los mismos filtros del listado
     */
    async obtenerTotalesConFiltros(filtros = {}) {
        try {
            let query = `
                SELECT 
                    COALESCE(SUM(p.monto_pago), 0) AS total_general,
                    COALESCE(SUM(CASE WHEN p.tipo_pago = 'RECEPCION' THEN p.monto_pago ELSE 0 END), 0) AS total_recepcion,
                    COALESCE(SUM(CASE WHEN p.tipo_pago = 'ADELANTO' THEN p.monto_pago ELSE 0 END), 0) AS total_adelanto,
                    COALESCE(SUM(CASE WHEN p.tipo_pago = 'SALDO_COMPLETO' THEN p.monto_pago ELSE 0 END), 0) AS total_saldo
                FROM pagos p
                WHERE 1=1
            `;

            const params = [];

            if (filtros.pagado === undefined || filtros.pagado === '' || filtros.pagado === 'false') {
                query += ' AND p.pagado = FALSE';
            } else if (filtros.pagado === 'true') {
                query += ' AND p.pagado = TRUE';
            }

            query += " AND (p.detalle_pago IS NULL OR LOWER(p.detalle_pago) NOT LIKE '%incluido en pago%')";

            if (filtros.proveedor_id) {
                query += ' AND p.proveedor_id = ?';
                params.push(filtros.proveedor_id);
            }

            if (filtros.tipo_pago) {
                query += ' AND p.tipo_pago = ?';
                params.push(filtros.tipo_pago);
            }

            if (filtros.fecha_desde) {
                query += ' AND p.fecha_pago >= ?';
                params.push(filtros.fecha_desde);
            }

            if (filtros.fecha_hasta) {
                query += ' AND p.fecha_pago <= ?';
                params.push(filtros.fecha_hasta);
            }

            const result = await db.query(query, params);
            return result && result.length > 0 ? result[0] : {
                total_general: 0,
                total_recepcion: 0,
                total_adelanto: 0,
                total_saldo: 0
            };
        } catch (error) {
            console.error('Error en PagoRepository.obtenerTotalesConFiltros:', error);
            throw error;
        }
    }

    /**
     * Obtener totales agregados agrupados por moneda con los mismos filtros
     */
    async obtenerTotalesPorMonedaConFiltros(filtros = {}) {
        try {
            let query = `
                SELECT 
                    COALESCE(p.moneda, 'ARS') AS moneda,
                    COALESCE(SUM(p.monto_pago), 0) AS total_general,
                    COALESCE(SUM(CASE WHEN p.tipo_pago = 'RECEPCION' THEN p.monto_pago ELSE 0 END), 0) AS total_recepcion,
                    COALESCE(SUM(CASE WHEN p.tipo_pago = 'ADELANTO' THEN p.monto_pago ELSE 0 END), 0) AS total_adelanto,
                    COALESCE(SUM(CASE WHEN p.tipo_pago = 'SALDO_COMPLETO' THEN p.monto_pago ELSE 0 END), 0) AS total_saldo
                FROM pagos p
                WHERE 1=1
            `;

            const params = [];

            if (filtros.pagado === undefined || filtros.pagado === '' || filtros.pagado === 'false') {
                query += ' AND p.pagado = FALSE';
            } else if (filtros.pagado === 'true') {
                query += ' AND p.pagado = TRUE';
            }

            query += " AND (p.detalle_pago IS NULL OR LOWER(p.detalle_pago) NOT LIKE '%incluido en pago%')";

            if (filtros.proveedor_id) {
                query += ' AND p.proveedor_id = ?';
                params.push(filtros.proveedor_id);
            }

            if (filtros.tipo_pago) {
                query += ' AND p.tipo_pago = ?';
                params.push(filtros.tipo_pago);
            }

            if (filtros.fecha_desde) {
                query += ' AND p.fecha_pago >= ?';
                params.push(filtros.fecha_desde);
            }

            if (filtros.fecha_hasta) {
                query += ' AND p.fecha_pago <= ?';
                params.push(filtros.fecha_hasta);
            }

            query += ' GROUP BY COALESCE(p.moneda, \'ARS\') ORDER BY moneda ASC';

            const result = await db.query(query, params);
            return result || [];
        } catch (error) {
            console.error('Error en PagoRepository.obtenerTotalesPorMonedaConFiltros:', error);
            throw error;
        }
    }

    /**
     * Marcar un pago como pagado
     */
    async marcarComoPagado(pagoId, username, detalle = null, connection = null) {
        try {
            const sql = `UPDATE pagos 
                SET pagado = TRUE,
                    fecha_marcado_pagado = NOW(),
                    marcado_pagado_por = ?,
                    detalle_pago = ?
                WHERE id = ? AND COALESCE(pagado, FALSE) = FALSE`;
            const params = [username, detalle, pagoId];

            let result;
            if (connection) {
                const [updateResult] = await connection.execute(sql, params);
                result = updateResult;
            } else {
                result = await db.query(sql, params);
            }

            const affectedRows = result?.affectedRows || 0;

            if (affectedRows !== 1) {
                const error = new Error('No se pudo marcar el pago como pagado. Verifique el estado del pago e intente nuevamente.');
                error.statusCode = 409;
                error.affectedRows = affectedRows;
                throw error;
            }

            return { success: true, affectedRows };
        } catch (error) {
            console.error('Error en PagoRepository.marcarComoPagado:', error);
            throw error;
        }
    }

    /**
     * Marcar múltiples pagos como pagados
     */
    async marcarComoPagadoMultiple(pagoIds, username, detalle = null, connection = null) {
        try {
            if (!pagoIds || pagoIds.length === 0) {
                return { success: true };
            }

            const placeholders = pagoIds.map(() => '?').join(',');
            const sql = `UPDATE pagos 
                SET pagado = TRUE,
                    fecha_marcado_pagado = NOW(),
                    marcado_pagado_por = ?,
                    detalle_pago = ?
                WHERE id IN (${placeholders}) AND COALESCE(pagado, FALSE) = FALSE`;
            const params = [username, detalle, ...pagoIds];

            let result;
            if (connection) {
                const [updateResult] = await connection.execute(sql, params);
                result = updateResult;
            } else {
                result = await db.query(sql, params);
            }

            const affectedRows = result?.affectedRows || 0;

            if (affectedRows !== pagoIds.length) {
                const error = new Error('No se pudieron marcar todos los pagos como pagados. La operación fue cancelada; intente nuevamente.');
                error.statusCode = 409;
                error.affectedRows = affectedRows;
                error.expectedRows = pagoIds.length;
                throw error;
            }

            return { success: true, affectedRows };
        } catch (error) {
            console.error('Error en PagoRepository.marcarComoPagadoMultiple:', error);
            throw error;
        }
    }

    /**
     * Refinanciar un pago existente con cuotas variables
     * Elimina el pago original y crea nuevos pagos con montos y fechas personalizadas
     */
    async refinanciarPagoVariable(pagoId, pagoOriginal, cuotas, username, observacionesGenerales = null) {
        const connection = await db.pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Calcular total refinanciado
            const totalRefinanciado = cuotas.reduce((sum, c) => sum + parseFloat(c.monto), 0);

            // Construir observaciones base
            const observacionesBase = `REFINANCIACIÓN - Pago original ID: ${pagoId}, Monto original: $${parseFloat(pagoOriginal.monto_pago).toFixed(2)}, Total refinanciado: $${totalRefinanciado.toFixed(2)}. ${observacionesGenerales || ''}`.trim();

            // Crear las nuevas cuotas con montos y fechas personalizadas
            const cuotasCreadas = [];

            for (let i = 0; i < cuotas.length; i++) {
                const cuota = cuotas[i];
                
                // Combinar observaciones
                const observacionesCuota = `${observacionesBase} - Cuota ${cuota.numeroCuota || i + 1}/${cuotas.length}${cuota.observacion ? '. ' + cuota.observacion : ''}`;

                const [result] = await connection.execute(
                    `INSERT INTO pagos (
                        orden_compra_id,
                        bien_id,
                        proveedor_id,
                        tipo_pago,
                        cantidad_recibida,
                        precio_unitario,
                        monto_pago,
                        moneda,
                        fecha_pago,
                        registrado_por,
                        observaciones
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        pagoOriginal.orden_compra_id,
                        pagoOriginal.bien_id || null,
                        pagoOriginal.proveedor_id,
                        pagoOriginal.tipo_pago,
                        pagoOriginal.cantidad_recibida || null,
                        pagoOriginal.precio_unitario || null,
                        parseFloat(cuota.monto),
                        pagoOriginal.moneda || 'ARS',
                        cuota.fecha,
                        username,
                        observacionesCuota
                    ]
                );

                cuotasCreadas.push({
                    id: result.insertId,
                    cuota: cuota.numeroCuota || i + 1,
                    fecha: cuota.fecha,
                    monto: parseFloat(cuota.monto)
                });
            }

            // Eliminar el pago original
            await connection.execute(
                'DELETE FROM pagos WHERE id = ?',
                [pagoId]
            );

            await connection.commit();

            return {
                success: true,
                cuotasCreadas,
                pagoOriginalEliminado: pagoId,
                totalRefinanciado
            };
        } catch (error) {
            await connection.rollback();
            console.error('Error en PagoRepository.refinanciarPagoVariable:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Obtener cuotas de contrafactura de una orden de compra
     * @param {number} ordenId - ID de la orden de compra
     * @returns {Promise<Object>} - Cuotas y adelanto de la orden
     */
    async obtenerCuotasOrdenCompra(ordenId) {
        try {
            console.log(`📋 [REPOSITORY] Obteniendo cuotas para orden: ${ordenId}`);
            
            // Obtener todos los pagos de contrafactura para esta orden
            const [cuotas] = await db.query(
                `SELECT 
                    id,
                    monto_pago as monto,
                    fecha_pago as fecha,
                    tipo_pago,
                    observaciones,
                    pagado,
                    fecha_pago_realizado
                FROM pagos 
                WHERE orden_compra_id = ? AND tipo_pago IN ('SALDO_COMPLETO', 'ADELANTO')
                ORDER BY fecha_pago ASC`,
                [ordenId]
            );

            console.log(`📊 [REPOSITORY] Resultados de la BD:`, cuotas);
            console.log(`💳 [REPOSITORY] Total registros: ${cuotas ? cuotas.length : 0}`);

            if (!cuotas || cuotas.length === 0) {
                console.log(`⚠️ [REPOSITORY] Sin cuotas encontradas`);
                return {
                    cuotas: [],
                    adelanto: null
                };
            }

            // Separar adelanto de cuotas
            const adelanto = cuotas.find(c => c.tipo_pago === 'ADELANTO');
            const cuotasContrafactura = cuotas.filter(c => c.tipo_pago === 'SALDO_COMPLETO');

            console.log(`✅ [REPOSITORY] Adelanto encontrado:`, adelanto);
            console.log(`✅ [REPOSITORY] Cuotas de saldo encontradas: ${cuotasContrafactura.length}`);
            cuotasContrafactura.forEach((c, i) => {
                console.log(`   Cuota ${i+1}: ${c.fecha} - $${c.monto}`);
            });

            return {
                cuotas: cuotasContrafactura,
                adelanto: adelanto || null
            };
        } catch (error) {
            console.error('❌ [REPOSITORY] Error en PagoRepository.obtenerCuotasOrdenCompra:', error);
            throw error;
        }
    }
}

module.exports = new PagoRepository();
