const db = require('../config/db');

class BienProveedorRepository {
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
                
                const [result] = await connection.query(
                    `INSERT INTO bienes_proveedores (bien_id, proveedor_id, precio, moneda) 
                     VALUES (?, ?, ?, ?)`,
                    [bienId, proveedorId, precio, moneda]
                );
                
                resultados.push({
                    id: result.insertId,
                    bien_id: bienId,
                    proveedor_id: proveedorId,
                    precio: precio,
                    moneda: moneda
                });
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

    /**
     * Editar/Actualizar asociaciones bien-proveedor en una transacción
     * Elimina las asociaciones existentes y crea las nuevas
     */
    async editarAsociaciones(bienId, proveedores) {
        const connection = await db.pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // 1. Eliminar todas las asociaciones existentes del bien
            await connection.query(
                `DELETE FROM bienes_proveedores WHERE bien_id = ?`,
                [bienId]
            );
            
            const resultados = [];
            
            // 2. Insertar las nuevas asociaciones
            for (let i = 0; i < proveedores.length; i++) {
                const [proveedorId, precio, moneda] = proveedores[i];
                
                const [result] = await connection.query(
                    `INSERT INTO bienes_proveedores (bien_id, proveedor_id, precio, moneda) 
                     VALUES (?, ?, ?, ?)`,
                    [bienId, proveedorId, precio, moneda]
                );
                
                resultados.push({
                    id: result.insertId,
                    bien_id: bienId,
                    proveedor_id: proveedorId,
                    precio: precio,
                    moneda: moneda
                });
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
            const result = await db.query(
                `DELETE FROM bienes_proveedores WHERE bien_id = ?`,
                [bienId]
            );
            return result.affectedRows;
        } catch (error) {
            console.error('Error en BienProveedorRepository.eliminarAsociacionesPorBien:', error);
            throw error;
        }
    }
}

module.exports = new BienProveedorRepository();