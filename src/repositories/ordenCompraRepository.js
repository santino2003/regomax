const db = require('../config/db');

class OrdenCompraRepository {
    /**
     * Verificar si un código de orden ya existe
     */
    async existeCodigo(codigo) {
        try {
            const result = await db.query('SELECT id FROM ordenes_compra WHERE codigo = ?', [codigo]);
            return result.length > 0;
        } catch (error) {
            console.error('Error al verificar código:', error);
            throw error;
        }
    }

    /**
     * Crear una nueva orden de compra con sus items
     */
    async crearOrdenCompra(ordenData, items = []) {
        const connection = await db.pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Insertar la orden de compra
            const [result] = await connection.query(
                `INSERT INTO ordenes_compra (
                    codigo, estado, fecha_entrega_solicitada, fecha_entrega_proveedor,
                    condicion, asunto, archivo_adjunto, proveedor_id, creado_por
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    ordenData.codigo,
                    ordenData.estado || 'Abierta',
                    ordenData.fecha_entrega_solicitada || null,
                    ordenData.fecha_entrega_proveedor || null,
                    ordenData.condicion,
                    ordenData.asunto || null,
                    ordenData.archivo_adjunto || null,
                    ordenData.proveedor_id || null,
                    ordenData.creado_por
                ]
            );
            
            const ordenId = result.insertId;
            
            // Insertar los items si existen
            if (items && items.length > 0) {
                for (const item of items) {
                    await connection.query(
                        `INSERT INTO ordenes_compra_items (
                            orden_compra_id, bien_id, cantidad, cantidad_recibida,
                            unidad_medida_id, proveedor_sugerido_id, descripcion, 
                            centro_costo, precio_unitario
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            ordenId,
                            item.bien_id,
                            item.cantidad,
                            item.cantidad_recibida || 0,
                            item.unidad_medida_id || null,
                            item.proveedor_sugerido_id || null,
                            item.descripcion || null,
                            item.centro_costo || null,
                            item.precio_unitario || null
                        ]
                    );
                }
            }
            
            await connection.commit();
            return { id: ordenId, codigo: ordenData.codigo };
        } catch (error) {
            await connection.rollback();
            console.error('Error en OrdenCompraRepository.crearOrdenCompra:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Modificar una orden de compra existente
     */
    async modificarOrdenCompra(id, ordenData, items = []) {
        const connection = await db.pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Actualizar la orden de compra
            await connection.query(
                `UPDATE ordenes_compra SET 
                    estado = ?,
                    fecha_entrega_solicitada = ?, 
                    fecha_entrega_proveedor = ?,
                    condicion = ?, 
                    asunto = ?, 
                    proveedor_id = ?
                WHERE id = ?`,
                [
                    ordenData.estado,
                    ordenData.fecha_entrega_solicitada || null,
                    ordenData.fecha_entrega_proveedor || null,
                    ordenData.condicion,
                    ordenData.asunto || null,
                    ordenData.proveedor_id || null,
                    id
                ]
            );
            
            // Actualizar items: eliminar todos y volver a insertar
            await connection.query('DELETE FROM ordenes_compra_items WHERE orden_compra_id = ?', [id]);
            
            if (items && items.length > 0) {
                for (const item of items) {
                    await connection.query(
                        `INSERT INTO ordenes_compra_items (
                            orden_compra_id, bien_id, cantidad, cantidad_recibida,
                            unidad_medida_id, proveedor_sugerido_id, descripcion, 
                            centro_costo, precio_unitario
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            id,
                            item.bien_id,
                            item.cantidad,
                            item.cantidad_recibida || 0,
                            item.unidad_medida_id || null,
                            item.proveedor_sugerido_id || null,
                            item.descripcion || null,
                            item.centro_costo || null,
                            item.precio_unitario || null
                        ]
                    );
                }
            }
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error('Error en OrdenCompraRepository.modificarOrdenCompra:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Actualizar solo el estado de la orden
     */
    async actualizarEstado(id, nuevoEstado) {
        try {
            await db.query(
                'UPDATE ordenes_compra SET estado = ? WHERE id = ?',
                [nuevoEstado, id]
            );
            return true;
        } catch (error) {
            console.error('Error en OrdenCompraRepository.actualizarEstado:', error);
            throw error;
        }
    }

    /**
     * Actualizar cantidad recibida de un item (solo en estado En Proceso)
     */
    async actualizarCantidadRecibida(itemId, cantidadRecibida) {
        try {
            await db.query(
                'UPDATE ordenes_compra_items SET cantidad_recibida = ? WHERE id = ?',
                [cantidadRecibida, itemId]
            );
            return true;
        } catch (error) {
            console.error('Error en OrdenCompraRepository.actualizarCantidadRecibida:', error);
            throw error;
        }
    }

    /**
     * Actualizar archivo adjunto
     */
    async actualizarArchivo(id, rutaArchivo) {
        try {
            await db.query(
                'UPDATE ordenes_compra SET archivo_adjunto = ? WHERE id = ?',
                [rutaArchivo, id]
            );
            return true;
        } catch (error) {
            console.error('Error en OrdenCompraRepository.actualizarArchivo:', error);
            throw error;
        }
    }

    /**
     * Actualizar el código de una orden
     */
    async actualizarCodigo(id, codigo) {
        try {
            await db.query(
                'UPDATE ordenes_compra SET codigo = ? WHERE id = ?',
                [codigo, id]
            );
            return true;
        } catch (error) {
            console.error('Error en OrdenCompraRepository.actualizarCodigo:', error);
            throw error;
        }
    }

    /**
     * Eliminar una orden de compra
     */
    async eliminarOrdenCompra(id) {
        try {
            // Los items se eliminan en cascada por la FK
            await db.query('DELETE FROM ordenes_compra WHERE id = ?', [id]);
            return true;
        } catch (error) {
            console.error('Error en OrdenCompraRepository.eliminarOrdenCompra:', error);
            throw error;
        }
    }

    /**
     * Obtener todas las ordenes de compra con filtros y paginación
     */
    async obtenerTodas(filtros = {}, pagina = 1, limite = 50) {
        try {
            // Asegurar que pagina y limite sean enteros válidos
            const paginaInt = parseInt(pagina) || 1;
            const limiteInt = parseInt(limite) || 50;
            const offset = (paginaInt - 1) * limiteInt;
            
            let whereConditions = [];
            let params = [];

            // Aplicar filtros
            if (filtros.estado) {
                whereConditions.push('oc.estado = ?');
                params.push(filtros.estado);
            }

            if (filtros.proveedor_id) {
                whereConditions.push('oc.proveedor_id = ?');
                params.push(filtros.proveedor_id);
            }

            if (filtros.condicion) {
                whereConditions.push('oc.condicion = ?');
                params.push(filtros.condicion);
            }

            if (filtros.fecha_desde) {
                whereConditions.push('oc.created_at >= ?');
                params.push(filtros.fecha_desde);
            }

            if (filtros.fecha_hasta) {
                whereConditions.push('oc.created_at <= ?');
                params.push(filtros.fecha_hasta);
            }

            if (filtros.bien_id) {
                whereConditions.push('oci.bien_id = ?');
                params.push(filtros.bien_id);
            }

            if (filtros.busqueda) {
                whereConditions.push('(oc.codigo LIKE ? OR oc.asunto LIKE ? OR b.nombre LIKE ?)');
                params.push(`%${filtros.busqueda}%`, `%${filtros.busqueda}%`, `%${filtros.busqueda}%`);
            }

            const whereClause = whereConditions.length > 0 
                ? 'WHERE ' + whereConditions.join(' AND ') 
                : '';

            // Consulta principal con joins
            // IMPORTANTE: No usar placeholders ? para LIMIT y OFFSET debido a limitaciones de MySQL
            const query = `
                SELECT 
                    oc.*,
                    p.nombre as proveedor_nombre,
                    COUNT(DISTINCT oci.id) as total_items
                FROM ordenes_compra oc
                LEFT JOIN proveedores p ON oc.proveedor_id = p.id
                LEFT JOIN ordenes_compra_items oci ON oc.id = oci.orden_compra_id
                LEFT JOIN bienes b ON oci.bien_id = b.id
                ${whereClause}
                GROUP BY oc.id
                ORDER BY oc.created_at DESC
                LIMIT ${limiteInt} OFFSET ${offset}
            `;

            const ordenes = await db.query(query, params);

            // Contar total de registros
            const countQuery = `
                SELECT COUNT(DISTINCT oc.id) as total
                FROM ordenes_compra oc
                LEFT JOIN ordenes_compra_items oci ON oc.id = oci.orden_compra_id
                LEFT JOIN bienes b ON oci.bien_id = b.id
                ${whereClause}
            `;
            const [countResult] = await db.query(countQuery, params);

            return {
                ordenes,
                total: countResult.total,
                pagina: paginaInt,
                totalPaginas: Math.ceil(countResult.total / limiteInt)
            };
        } catch (error) {
            console.error('Error en OrdenCompraRepository.obtenerTodas:', error);
            throw error;
        }
    }

    /**
     * Obtener una orden de compra por ID con todos sus detalles
     */
    async obtenerPorId(id) {
        try {
            // Obtener la orden
            const [orden] = await db.query(
                `SELECT 
                    oc.*,
                    p.nombre as proveedor_nombre,
                    p.telefono as proveedor_telefono,
                    p.email as proveedor_email
                FROM ordenes_compra oc
                LEFT JOIN proveedores p ON oc.proveedor_id = p.id
                WHERE oc.id = ?`,
                [id]
            );

            if (!orden) {
                return null;
            }

            // Obtener los items
            const items = await db.query(
                `SELECT 
                    oci.*,
                    b.codigo as bien_codigo,
                    b.nombre as bien_nombre,
                    b.descripcion as bien_descripcion,
                    um.nombre as unidad_medida_nombre,
                    um.nombre_lindo as unidad_medida_nombre_lindo,
                    ps.nombre as proveedor_sugerido_nombre
                FROM ordenes_compra_items oci
                INNER JOIN bienes b ON oci.bien_id = b.id
                LEFT JOIN unidades_medida um ON oci.unidad_medida_id = um.id
                LEFT JOIN proveedores ps ON oci.proveedor_sugerido_id = ps.id
                WHERE oci.orden_compra_id = ?
                ORDER BY oci.id`,
                [id]
            );

            orden.items = items;
            return orden;
        } catch (error) {
            console.error('Error en OrdenCompraRepository.obtenerPorId:', error);
            throw error;
        }
    }

    /**
     * Obtener una orden por su código
     */
    async obtenerPorCodigo(codigo) {
        try {
            const [orden] = await db.query(
                'SELECT * FROM ordenes_compra WHERE codigo = ?',
                [codigo]
            );
            return orden || null;
        } catch (error) {
            console.error('Error en OrdenCompraRepository.obtenerPorCodigo:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de ordenes de compra
     */
    async obtenerEstadisticas() {
        try {
            const stats = await db.query(`
                SELECT 
                    estado,
                    COUNT(*) as cantidad,
                    SUM(
                        (SELECT SUM(oci.cantidad * oci.precio_unitario) 
                         FROM ordenes_compra_items oci 
                         WHERE oci.orden_compra_id = oc.id)
                    ) as monto_total
                FROM ordenes_compra oc
                GROUP BY estado
            `);
            return stats;
        } catch (error) {
            console.error('Error en OrdenCompraRepository.obtenerEstadisticas:', error);
            throw error;
        }
    }
}

module.exports = new OrdenCompraRepository();
