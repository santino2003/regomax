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
                observaciones
            } = pagoData;

            const result = await db.query(
                `INSERT INTO pagos (
                    orden_compra_id,
                    bien_id,
                    proveedor_id,
                    tipo_pago,
                    cantidad_recibida,
                    precio_unitario,
                    monto_pago,
                    fecha_pago,
                    registrado_por,
                    observaciones
                ) VALUES (?, ?, ?, 'RECEPCION', ?, ?, ?, ?, ?, ?)`,
                [
                    ordenCompraId,
                    bienId,
                    proveedorId,
                    cantidadRecibida,
                    precioUnitario,
                    montoPago,
                    fechaPago,
                    registradoPor,
                    observaciones || null
                ]
            );

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
                observaciones
            } = pagoData;

            const result = await db.query(
                `INSERT INTO pagos (
                    orden_compra_id,
                    proveedor_id,
                    tipo_pago,
                    monto_pago,
                    monto_adelanto,
                    fecha_pago,
                    registrado_por,
                    observaciones
                ) VALUES (?, ?, 'ADELANTO', ?, ?, ?, ?, ?)`,
                [
                    ordenCompraId,
                    proveedorId,
                    montoAdelanto,
                    montoAdelanto,
                    fechaPago,
                    registradoPor,
                    observaciones || null
                ]
            );

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
                observaciones
            } = pagoData;

            const result = await db.query(
                `INSERT INTO pagos (
                    orden_compra_id,
                    proveedor_id,
                    tipo_pago,
                    monto_pago,
                    monto_total,
                    monto_adelanto,
                    fecha_pago,
                    registrado_por,
                    observaciones
                ) VALUES (?, ?, 'SALDO_COMPLETO', ?, ?, ?, ?, ?, ?)`,
                [
                    ordenCompraId,
                    proveedorId,
                    saldoAPagar,
                    montoTotal,
                    montoAdelanto,
                    fechaPago,
                    registradoPor,
                    observaciones || null
                ]
            );

            return { id: result.insertId };
        } catch (error) {
            console.error('Error en PagoRepository.registrarPagoSaldoCompleto:', error);
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

            // Aplicar filtros
            if (filtros.orden_codigo) {
                query += ' AND oc.codigo LIKE ?';
                params.push(`%${filtros.orden_codigo}%`);
            }

            if (filtros.proveedor) {
                query += ' AND pr.nombre LIKE ?';
                params.push(`%${filtros.proveedor}%`);
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

            if (filtros.bien_nombre) {
                query += ' AND b.nombre LIKE ?';
                params.push(`%${filtros.bien_nombre}%`);
            }

            // Ordenar por fecha más reciente
            query += ' ORDER BY p.fecha_pago DESC, p.fecha_registro DESC';

            // Obtener total de registros
            const countQuery = `
                SELECT COUNT(*) as total
                FROM pagos p
                LEFT JOIN bienes b ON p.bien_id = b.id
                JOIN proveedores pr ON p.proveedor_id = pr.id
                JOIN ordenes_compra oc ON p.orden_compra_id = oc.id
                WHERE 1=1
            `;
            
            // Reconstruir los filtros para el count
            let countQueryWithFilters = countQuery;
            const countParams = [];

            if (filtros.orden_codigo) {
                countQueryWithFilters += ' AND oc.codigo LIKE ?';
                countParams.push(`%${filtros.orden_codigo}%`);
            }

            if (filtros.proveedor) {
                countQueryWithFilters += ' AND pr.nombre LIKE ?';
                countParams.push(`%${filtros.proveedor}%`);
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

            if (filtros.bien_nombre) {
                countQueryWithFilters += ' AND b.nombre LIKE ?';
                countParams.push(`%${filtros.bien_nombre}%`);
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
}

module.exports = new PagoRepository();
