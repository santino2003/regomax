const db = require('../config/db');

class BienRepository {
    /**
     * Verificar si un código de bien ya existe
     */
    async existeCodigo(codigo) {
        try {
            const result = await db.query('SELECT id FROM bienes WHERE codigo = ?', [codigo]);
            return result.length > 0;
        } catch (error) {
            console.error('Error al verificar código:', error);
            throw error;
        }
    }

    /**
     * Crear un nuevo bien
     */
    async crearBien(bienData, proveedoresIds = []) {
        const connection = await db.pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // El código ya viene generado desde el service
            const codigo = bienData.codigo;
            
            // Insertar el bien
            const [result] = await connection.query(
                `INSERT INTO bienes (
                    codigo, nombre, descripcion, tipo, categoria_id, familia_id, 
                    unidad_medida_id, precio, cantidad_critica, ubicacion, 
                    almacen_defecto_id, responsable
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    codigo,
                    bienData.nombre,
                    bienData.descripcion || null,
                    bienData.tipo,
                    bienData.categoria_id || null,
                    bienData.familia_id || null,
                    bienData.unidad_medida_id || null,
                    bienData.precio || 0,
                    bienData.cantidad_critica || null,
                    bienData.ubicacion || null,
                    bienData.almacen_defecto_id || null,
                    bienData.responsable
                ]
            );
            
            const bienId = result.insertId;
            
            // Asociar proveedores si existen
            if (proveedoresIds && proveedoresIds.length > 0) {
                for (const proveedorId of proveedoresIds) {
                    await connection.query(
                        'INSERT INTO bienes_proveedores (bien_id, proveedor_id) VALUES (?, ?)',
                        [bienId, proveedorId]
                    );
                }
            }
            
            await connection.commit();
            return { id: bienId, codigo };
        } catch (error) {
            await connection.rollback();
            console.error('Error en BienRepository.crearBien:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
    
    /**
     * Modificar un bien existente
     */
    async modificarBien(id, bienData, proveedoresIds = []) {
        const connection = await db.pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Actualizar el bien
            await connection.query(
                `UPDATE bienes SET 
                    nombre = ?, 
                    descripcion = ?, 
                    tipo = ?, 
                    categoria_id = ?, 
                    familia_id = ?, 
                    unidad_medida_id = ?, 
                    precio = ?, 
                    cantidad_critica = ?, 
                    ubicacion = ?, 
                    almacen_defecto_id = ?
                WHERE id = ?`,
                [
                    bienData.nombre,
                    bienData.descripcion || null,
                    bienData.tipo,
                    bienData.categoria_id || null,
                    bienData.familia_id || null,
                    bienData.unidad_medida_id || null,
                    bienData.precio || 0,
                    bienData.cantidad_critica || null,
                    bienData.ubicacion || null,
                    bienData.almacen_defecto_id || null,
                    id
                ]
            );
            
            // Actualizar proveedores: eliminar todos y volver a insertar
            await connection.query('DELETE FROM bienes_proveedores WHERE bien_id = ?', [id]);
            
            if (proveedoresIds && proveedoresIds.length > 0) {
                for (const proveedorId of proveedoresIds) {
                    await connection.query(
                        'INSERT INTO bienes_proveedores (bien_id, proveedor_id) VALUES (?, ?)',
                        [id, proveedorId]
                    );
                }
            }
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error('Error en BienRepository.modificarBien:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Eliminar un bien
     */
    async eliminarBien(id) {
        try {
            // Verificar si hay órdenes de compra activas con este bien
            const ordenesActivas = await db.query(`
                SELECT oc.codigo, oc.estado 
                FROM ordenes_compra_items oci
                INNER JOIN ordenes_compra oc ON oci.orden_compra_id = oc.id
                WHERE oci.bien_id = ? 
                AND oc.estado NOT IN ('Cerrada', 'Cancelada')
                LIMIT 5
            `, [id]);
            
            if (ordenesActivas && ordenesActivas.length > 0) {
                const codigosOrdenesActivas = ordenesActivas.map(o => o.codigo).join(', ');
                throw new Error(`No se puede eliminar el bien porque está asociado a órdenes de compra activas: ${codigosOrdenesActivas}`);
            }
            
            // Verificar si hay órdenes de compra (incluso cerradas) con este bien
            const todasOrdenes = await db.query(`
                SELECT COUNT(*) as total 
                FROM ordenes_compra_items 
                WHERE bien_id = ?
            `, [id]);
            
            if (todasOrdenes && todasOrdenes[0].total > 0) {
                throw new Error(`No se puede eliminar el bien porque está asociado a ${todasOrdenes[0].total} orden(es) de compra. Por razones de trazabilidad, los bienes con historial de órdenes no pueden eliminarse.`);
            }
            
            // Si no hay órdenes de compra, proceder con la eliminación
            // Las relaciones se eliminan en cascada por las FK
            await db.query('DELETE FROM bienes WHERE id = ?', [id]);
            return true;
        } catch (error) {
            console.error('Error en BienRepository.eliminarBien:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los bienes con paginación
     */
    async obtenerTodos(page = 1, limit = 10, filtros = {}) {
        try {
            let whereConditions = ['(b.es_kit = FALSE OR b.es_kit IS NULL)'];
            let params = [];
            
            // Aplicar filtros
            if (filtros.tipo) {
                whereConditions.push('b.tipo = ?');
                params.push(filtros.tipo);
            }
            if (filtros.categoria_id) {
                whereConditions.push('b.categoria_id = ?');
                params.push(filtros.categoria_id);
            }
            if (filtros.familia_id) {
                whereConditions.push('b.familia_id = ?');
                params.push(filtros.familia_id);
            }
            if (filtros.busqueda) {
                whereConditions.push('(b.nombre LIKE ? OR b.codigo LIKE ? OR b.descripcion LIKE ?)');
                const searchTerm = `%${filtros.busqueda}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }
            if (filtros.critico) {
                whereConditions.push('b.cantidad_critica IS NOT NULL AND b.cantidad_stock <= b.cantidad_critica');
            }
            
            const whereClause = 'WHERE ' + whereConditions.join(' AND ');
            
            // Contar total de registros
            const countQuery = `SELECT COUNT(*) as total FROM bienes b ${whereClause}`;
            const countResult = await db.query(countQuery, params);
            const totalRegistros = countResult[0].total;
            
            // Obtener registros paginados con información relacionada
            const offset = (page - 1) * limit;
            const query = `
                SELECT 
                    b.*,
                    c.nombre as categoria_nombre,
                    f.nombre as familia_nombre,
                    um.nombre as unidad_medida_nombre,
                    um.nombre_lindo as unidad_medida_nombre_lindo,
                    a.nombre as almacen_nombre
                FROM bienes b
                LEFT JOIN categorias c ON b.categoria_id = c.id
                LEFT JOIN familias f ON b.familia_id = f.id
                LEFT JOIN unidades_medida um ON b.unidad_medida_id = um.id
                LEFT JOIN almacenes a ON b.almacen_defecto_id = a.id
                ${whereClause}
                ORDER BY b.fecha_creacion DESC 
                LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
            `;
            
            const result = await db.query(query, params);
            
            return {
                data: result,
                pagination: {
                    paginaActual: parseInt(page),
                    limite: parseInt(limit),
                    totalRegistros: totalRegistros,
                    totalPaginas: Math.ceil(totalRegistros / limit)
                }
            };
        } catch (error) {
            console.error('Error en BienRepository.obtenerTodos:', error);
            throw error;
        }
    }

    /**
     * Obtener un bien por ID con toda su información relacionada
     */
    async obtenerPorId(id) {
        try {
            const query = `
                SELECT 
                    b.*,
                    c.nombre as categoria_nombre,
                    f.nombre as familia_nombre,
                    um.nombre as unidad_medida_nombre,
                    um.nombre_lindo as unidad_medida_nombre_lindo,
                    a.nombre as almacen_nombre
                FROM bienes b
                LEFT JOIN categorias c ON b.categoria_id = c.id
                LEFT JOIN familias f ON b.familia_id = f.id
                LEFT JOIN unidades_medida um ON b.unidad_medida_id = um.id
                LEFT JOIN almacenes a ON b.almacen_defecto_id = a.id
                WHERE b.id = ?
            `;
            
            const result = await db.query(query, [id]);
            if (result.length === 0) return null;
            
            const bien = result[0];
            
            // Obtener proveedores asociados
            const proveedores = await db.query(`
                SELECT p.* 
                FROM proveedores p
                INNER JOIN bienes_proveedores bp ON p.id = bp.proveedor_id
                WHERE bp.bien_id = ?
            `, [id]);
            
            bien.proveedores = proveedores;
            
            // Obtener archivos adjuntos
            const archivos = await db.query(`
                SELECT * FROM bienes_archivos WHERE bien_id = ?
            `, [id]);
            
            bien.archivos = archivos;
            
            return bien;
        } catch (error) {
            console.error('Error al obtener bien por ID:', error);
            throw error;
        }
    }

    /**
     * Actualizar cantidad en stock
     */
    async actualizarStock(id, cantidad) {
        try {
            await db.query(
                'UPDATE bienes SET cantidad_stock = ? WHERE id = ?',
                [cantidad, id]
            );
            return true;
        } catch (error) {
            console.error('Error al actualizar stock:', error);
            throw error;
        }
    }

    /**
     * Guardar archivo adjunto
     */
    async guardarArchivo(bienId, archivoData) {
        try {
            await db.query(
                `INSERT INTO bienes_archivos (bien_id, nombre_archivo, ruta_archivo, tipo_mime, tamanio, subido_por)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    bienId,
                    archivoData.nombre,
                    archivoData.ruta,
                    archivoData.tipo_mime,
                    archivoData.tamanio,
                    archivoData.subido_por
                ]
            );
            return true;
        } catch (error) {
            console.error('Error al guardar archivo:', error);
            throw error;
        }
    }

    /**
     * Eliminar archivo adjunto
     */
    async eliminarArchivo(archivoId) {
        try {
            const archivo = await db.query('SELECT * FROM bienes_archivos WHERE id = ?', [archivoId]);
            if (archivo.length === 0) return null;
            
            await db.query('DELETE FROM bienes_archivos WHERE id = ?', [archivoId]);
            return archivo[0];
        } catch (error) {
            console.error('Error al eliminar archivo:', error);
            throw error;
        }
    }
}

module.exports = new BienRepository();
