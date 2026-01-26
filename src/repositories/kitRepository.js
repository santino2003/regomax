const db = require('../config/db');

class KitRepository {
    /**
     * Crear un nuevo kit (bien con es_kit = true)
     */
    async crearKit(kitData, componentesIds = []) {
        const connection = await db.pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Insertar el bien como kit
            const [result] = await connection.query(
                `INSERT INTO bienes (
                    codigo, nombre, descripcion, tipo, categoria_id, familia_id, 
                    unidad_medida_id, precio, ubicacion, 
                    almacen_defecto_id, responsable, es_kit
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
                [
                    kitData.codigo,
                    kitData.nombre,
                    kitData.descripcion || null,
                    kitData.tipo || 'Uso',
                    kitData.categoria_id || null,
                    kitData.familia_id || null,
                    kitData.unidad_medida_id || null,
                    kitData.precio || 0,
                    kitData.ubicacion || null,
                    kitData.almacen_defecto_id || null,
                    kitData.responsable
                ]
            );
            
            const kitId = result.insertId;
            
            // Asociar componentes al kit
            if (componentesIds && componentesIds.length > 0) {
                for (const componente of componentesIds) {
                    await connection.query(
                        'INSERT INTO bien_componentes (bien_kit_id, bien_componente_id, cantidad) VALUES (?, ?, ?)',
                        [kitId, componente.bien_id, componente.cantidad || 1]
                    );
                }
            }
            
            await connection.commit();
            return { id: kitId, codigo: kitData.codigo };
        } catch (error) {
            await connection.rollback();
            console.error('Error en KitRepository.crearKit:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Modificar un kit existente
     */
    async modificarKit(id, kitData, componentesIds = []) {
        const connection = await db.pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Actualizar el kit
            await connection.query(
                `UPDATE bienes SET 
                    nombre = ?, 
                    descripcion = ?, 
                    tipo = ?, 
                    categoria_id = ?, 
                    familia_id = ?, 
                    unidad_medida_id = ?, 
                    precio = ?, 
                    ubicacion = ?, 
                    almacen_defecto_id = ?
                WHERE id = ? AND es_kit = TRUE`,
                [
                    kitData.nombre,
                    kitData.descripcion || null,
                    kitData.tipo || 'Uso',
                    kitData.categoria_id || null,
                    kitData.familia_id || null,
                    kitData.unidad_medida_id || null,
                    kitData.precio || 0,
                    kitData.ubicacion || null,
                    kitData.almacen_defecto_id || null,
                    id
                ]
            );
            
            // Actualizar componentes: eliminar todos y volver a insertar
            await connection.query('DELETE FROM bien_componentes WHERE bien_kit_id = ?', [id]);
            
            if (componentesIds && componentesIds.length > 0) {
                for (const componente of componentesIds) {
                    await connection.query(
                        'INSERT INTO bien_componentes (bien_kit_id, bien_componente_id, cantidad) VALUES (?, ?, ?)',
                        [id, componente.bien_id, componente.cantidad || 1]
                    );
                }
            }
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error('Error en KitRepository.modificarKit:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Eliminar un kit
     */
    async eliminarKit(id) {
        try {
            // Los componentes se eliminan en cascada por la FK
            await db.query('DELETE FROM bienes WHERE id = ? AND es_kit = TRUE', [id]);
            return true;
        } catch (error) {
            console.error('Error en KitRepository.eliminarKit:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los kits con paginación
     */
    async obtenerTodos(page = 1, limit = 10, filtros = {}) {
        try {
            let whereConditions = ['b.es_kit = TRUE'];
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
            if (filtros.busqueda) {
                whereConditions.push('(b.nombre LIKE ? OR b.codigo LIKE ? OR b.descripcion LIKE ?)');
                const searchTerm = `%${filtros.busqueda}%`;
                params.push(searchTerm, searchTerm, searchTerm);
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
                    a.nombre as almacen_nombre,
                    (SELECT COUNT(*) FROM bien_componentes WHERE bien_kit_id = b.id) as num_componentes
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
            
            // Calcular stock disponible para cada kit basado en sus componentes
            for (const kit of result) {
                const componentes = await db.query(`
                    SELECT 
                        bc.cantidad,
                        b.cantidad_stock
                    FROM bien_componentes bc
                    INNER JOIN bienes b ON bc.bien_componente_id = b.id
                    WHERE bc.bien_kit_id = ?
                `, [kit.id]);
                
                if (componentes.length > 0) {
                    let stockDisponibleKit = Infinity;
                    for (const comp of componentes) {
                        const stockPosible = Math.floor(comp.cantidad_stock / comp.cantidad);
                        stockDisponibleKit = Math.min(stockDisponibleKit, stockPosible);
                    }
                    kit.cantidad_stock = stockDisponibleKit === Infinity ? 0 : stockDisponibleKit;
                } else {
                    kit.cantidad_stock = 0;
                }
            }
            
            return {
                data: result,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalRegistros,
                    totalPages: Math.ceil(totalRegistros / limit)
                }
            };
        } catch (error) {
            console.error('Error en KitRepository.obtenerTodos:', error);
            throw error;
        }
    }

    /**
     * Obtener un kit por ID con todos sus componentes
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
                WHERE b.id = ? AND b.es_kit = TRUE
            `;
            
            const result = await db.query(query, [id]);
            if (result.length === 0) return null;
            
            const kit = result[0];
            
            // Obtener componentes del kit
            const componentes = await db.query(`
                SELECT 
                    bc.*,
                    b.codigo,
                    b.nombre,
                    b.tipo,
                    b.cantidad_stock,
                    b.precio,
                    um.nombre as unidad_medida_nombre
                FROM bien_componentes bc
                INNER JOIN bienes b ON bc.bien_componente_id = b.id
                LEFT JOIN unidades_medida um ON b.unidad_medida_id = um.id
                WHERE bc.bien_kit_id = ?
            `, [id]);
            
            kit.componentes = componentes;
            
            // Calcular stock disponible del kit basado en componentes
            // Stock del kit = min(stock_componente / cantidad_necesaria) para cada componente
            if (componentes.length > 0) {
                let stockDisponibleKit = Infinity;
                for (const comp of componentes) {
                    const stockPosible = Math.floor(comp.cantidad_stock / comp.cantidad);
                    stockDisponibleKit = Math.min(stockDisponibleKit, stockPosible);
                }
                // Si no hay componentes o alguno tiene stock 0, el kit tiene stock 0
                kit.cantidad_stock = stockDisponibleKit === Infinity ? 0 : stockDisponibleKit;
            } else {
                kit.cantidad_stock = 0;
            }
            
            // Obtener archivos adjuntos
            const archivos = await db.query(`
                SELECT * FROM bienes_archivos WHERE bien_id = ?
            `, [id]);
            
            kit.archivos = archivos;
            
            return kit;
        } catch (error) {
            console.error('Error al obtener kit por ID:', error);
            throw error;
        }
    }

    /**
     * Obtener bienes disponibles para usar como componentes (no son kits)
     */
    async obtenerBienesDisponibles() {
        try {
            const query = `
                SELECT 
                    id,
                    codigo,
                    nombre,
                    tipo,
                    cantidad_stock,
                    precio
                FROM bienes
                WHERE es_kit = FALSE
                ORDER BY nombre ASC
            `;
            
            const result = await db.query(query);
            return result;
        } catch (error) {
            console.error('Error al obtener bienes disponibles:', error);
            throw error;
        }
    }
}

module.exports = new KitRepository();
