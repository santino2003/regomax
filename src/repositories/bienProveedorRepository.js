const db = require('../config/db');

class BienProveedorRepository {
    async registrarPrecioSiCambio(connection, bienId, proveedorId, precio, moneda) {
        const [latestRows] = await connection.query(
            `SELECT id, precio, moneda, fecha_asignacion
             FROM bienes_proveedores
             WHERE bien_id = ? AND proveedor_id = ?
             ORDER BY id DESC
             LIMIT 1`,
            [bienId, proveedorId]
        );

        const ultimo = latestRows && latestRows[0] ? latestRows[0] : null;
        const ultimoPrecio = ultimo && ultimo.precio !== null && ultimo.precio !== undefined
            ? Number(ultimo.precio)
            : null;
        const nuevoPrecio = precio !== null && precio !== undefined ? Number(precio) : null;
        const cambio = !ultimo || ultimoPrecio !== nuevoPrecio || ultimo.moneda !== moneda;

        if (cambio) {
            const [result] = await connection.query(
                `INSERT INTO bienes_proveedores (bien_id, proveedor_id, precio, moneda)
                 VALUES (?, ?, ?, ?)`,
                [bienId, proveedorId, precio, moneda]
            );

            return {
                inserted: true,
                data: {
                    id: result.insertId,
                    bien_id: bienId,
                    proveedor_id: proveedorId,
                    precio: precio,
                    moneda: moneda
                }
            };
        }

        return {
            inserted: false,
            data: {
                id: ultimo.id,
                bien_id: bienId,
                proveedor_id: proveedorId,
                precio: ultimo.precio,
                moneda: ultimo.moneda,
                fecha_asignacion: ultimo.fecha_asignacion
            }
        };
    }

    /**
     * Crear múltiples asociaciones bien-proveedor en una transacción
     */
    async crearAsociaciones(bienId, proveedores) {
        const connection = await db.pool.getConnection();
        try {
            await connection.beginTransaction();
            
            const resultados = [];
            
            // Iterar sobre cada tupla [proveedorId, precio, moneda]
            for (let i = 0; i < proveedores.length; i++) {
                const [proveedorId, precio, moneda] = proveedores[i];

                const resultado = await this.registrarPrecioSiCambio(
                    connection,
                    bienId,
                    proveedorId,
                    precio,
                    moneda
                );

                resultados.push(resultado.data);
            }
            
            await connection.commit();
            return resultados;
        } catch (error) {
            await connection.rollback();
            console.error('Error en BienProveedorRepository.crearAsociaciones:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
    async obtenerPrecioProveedorBien(bienId, proveedorId) {
        const query = `
            SELECT 
                bp.bien_id,
                bp.proveedor_id,
                bp.precio,
                bp.moneda,
                bp.fecha_asignacion,
                p.nombre as proveedor_nombre,
                b.nombre as bien_nombre,
                b.codigo as bien_codigo
            FROM bienes_proveedores bp
            INNER JOIN proveedores p ON bp.proveedor_id = p.id
            INNER JOIN bienes b ON bp.bien_id = b.id
            WHERE bp.bien_id = ?
            AND bp.proveedor_id = ?
            ORDER BY bp.id DESC
            LIMIT 1
        `;

        const result = await db.query(query, [bienId, proveedorId]);
        
        // Manejar el resultado igual que en ordenCompraRepository
        const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : 
                     Array.isArray(result) ? result : [result];
        
        return rows[0] || null;
    }

    /**
     * Editar/Actualizar asociaciones bien-proveedor en una transacción
     * Registra un nuevo precio solo si cambió, manteniendo historial
     */
    async editarAsociaciones(bienId, proveedores) {
        const connection = await db.pool.getConnection();
        try {
            await connection.beginTransaction();
            
            const resultados = [];
            
            // Registrar nuevos precios si hubo cambios
            for (let i = 0; i < proveedores.length; i++) {
                const [proveedorId, precio, moneda] = proveedores[i];

                const resultado = await this.registrarPrecioSiCambio(
                    connection,
                    bienId,
                    proveedorId,
                    precio,
                    moneda
                );

                resultados.push(resultado.data);
            }
            
            await connection.commit();
            return resultados;
        } catch (error) {
            await connection.rollback();
            console.error('Error en BienProveedorRepository.editarAsociaciones:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Eliminar todas las asociaciones de un bien
     */
    async eliminarAsociacionesPorBien(bienId) {
        try {
            console.warn(
                'BienProveedorRepository.eliminarAsociacionesPorBien se omitió para preservar historial:',
                { bienId }
            );
            return 0;
        } catch (error) {
            console.error('Error en BienProveedorRepository.eliminarAsociacionesPorBien:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los bienes asociados a un proveedor con su precio y moneda
     */
    async obtenerBienesPorProveedor(proveedorId) {
        try {
            const rows = await db.query(
                `SELECT 
                    b.id,
                    b.nombre,
                    b.descripcion,
                    b.tipo,
                    c.nombre as categoria,
                    um.nombre as unidad_medida,
                    bp.precio,
                    bp.moneda
                FROM (
                    SELECT bp1.*
                    FROM bienes_proveedores bp1
                    INNER JOIN (
                        SELECT MAX(id) as id
                        FROM bienes_proveedores
                        WHERE proveedor_id = ?
                        GROUP BY bien_id, proveedor_id
                    ) latest ON bp1.id = latest.id
                ) bp
                INNER JOIN bienes b ON bp.bien_id = b.id
                LEFT JOIN categorias c ON b.categoria_id = c.id
                LEFT JOIN unidades_medida um ON b.unidad_medida_id = um.id
                WHERE bp.proveedor_id = ?
                ORDER BY b.nombre`,
                [proveedorId, proveedorId]
            );
            return rows;
        } catch (error) {
            console.error('Error en BienProveedorRepository.obtenerBienesPorProveedor:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los proveedores asociados a un bien específico con precio y moneda
     */
    async obtenerProveedoresPorBien(bienId) {
        try {
            const rows = await db.query(
                `SELECT 
                    p.id,
                    p.nombre,
                    p.contacto,
                    p.telefono,
                    p.email,
                    bp.precio,
                    bp.moneda
                FROM (
                    SELECT bp1.*
                    FROM bienes_proveedores bp1
                    INNER JOIN (
                        SELECT MAX(id) as id
                        FROM bienes_proveedores
                        WHERE bien_id = ?
                        GROUP BY bien_id, proveedor_id
                    ) latest ON bp1.id = latest.id
                ) bp
                INNER JOIN proveedores p ON bp.proveedor_id = p.id
                WHERE bp.bien_id = ?
                ORDER BY p.nombre`,
                [bienId, bienId]
            );
            return rows;
        } catch (error) {
            console.error('Error en BienProveedorRepository.obtenerProveedoresPorBien:', error);
            throw error;
        }
    }

    /**
     * Obtener historial completo de precios por bien
     */
    async obtenerHistorialPorBien(bienId) {
        try {
            const rows = await db.query(
                `SELECT
                    bp.id,
                    bp.bien_id,
                    bp.proveedor_id,
                    bp.precio,
                    bp.moneda,
                    bp.fecha_asignacion,
                    p.nombre as proveedor_nombre
                FROM bienes_proveedores bp
                INNER JOIN proveedores p ON bp.proveedor_id = p.id
                WHERE bp.bien_id = ?
                ORDER BY bp.fecha_asignacion DESC, bp.id DESC`,
                [bienId]
            );
            return rows;
        } catch (error) {
            console.error('Error en BienProveedorRepository.obtenerHistorialPorBien:', error);
            throw error;
        }
    }

    /**
     * Obtener historial completo de precios por proveedor
     */
    async obtenerHistorialPorProveedor(proveedorId) {
        try {
            const rows = await db.query(
                `SELECT
                    bp.id,
                    bp.bien_id,
                    bp.proveedor_id,
                    bp.precio,
                    bp.moneda,
                    bp.fecha_asignacion,
                    b.nombre as bien_nombre,
                    b.codigo as bien_codigo
                FROM bienes_proveedores bp
                INNER JOIN bienes b ON bp.bien_id = b.id
                WHERE bp.proveedor_id = ?
                ORDER BY bp.fecha_asignacion DESC, bp.id DESC`,
                [proveedorId]
            );
            return rows;
        } catch (error) {
            console.error('Error en BienProveedorRepository.obtenerHistorialPorProveedor:', error);
            throw error;
        }
    }
}

module.exports = new BienProveedorRepository();