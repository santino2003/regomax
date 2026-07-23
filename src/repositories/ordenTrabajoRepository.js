const db = require('../config/db');

class OrdenTrabajoRepository {
    async obtenerSiguienteId() {
        try {
            const result = await db.query(`
                SELECT id
                FROM ordenes_trabajo
                WHERE id LIKE 'OT-%'
                ORDER BY CAST(SUBSTRING(id, 4) AS UNSIGNED) DESC
                LIMIT 1
            `);

            if (!result || result.length === 0) {
                return 'OT-001';
            }

            const ultimoNumero = parseInt(String(result[0].id).replace('OT-', ''), 10) || 0;
            return `OT-${String(ultimoNumero + 1).padStart(3, '0')}`;
        } catch (error) {
            console.error('Error en OrdenTrabajoRepository.obtenerSiguienteId:', error);
            throw error;
        }
    }

    async crear(ordenTrabajoData) {
        try {
            const id = await this.obtenerSiguienteId();

            await db.query(
                `INSERT INTO ordenes_trabajo (
                    id,
                    fecha_pedido,
                    fecha_terminada,
                    estado,
                    asignado_a,
                    personas_destinadas,
                    maquina,
                    descripcion,
                    mantenimiento,
                    tipo,
                    creado_por
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    ordenTrabajoData.fecha_pedido,
                    ordenTrabajoData.fecha_terminada || null,
                    ordenTrabajoData.estado,
                    ordenTrabajoData.asignado_a,
                    ordenTrabajoData.personas_destinadas,
                    ordenTrabajoData.maquina || null,
                    ordenTrabajoData.descripcion,
                    JSON.stringify(ordenTrabajoData.mantenimiento),
                    JSON.stringify(ordenTrabajoData.tipo),
                    ordenTrabajoData.creado_por
                ]
            );

            return id;
        } catch (error) {
            console.error('Error en OrdenTrabajoRepository.crear:', error);
            throw error;
        }
    }

    async obtenerTodos(page = 1, limit = 10) {
        try {
            const countResult = await db.query('SELECT COUNT(*) as total FROM ordenes_trabajo');
            const totalRegistros = countResult[0].total;
            const offset = (page - 1) * limit;

            const result = await db.query(`
                SELECT *
                FROM ordenes_trabajo
                ORDER BY fecha_creacion DESC
                LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
            `);

            return {
                data: result.map((orden) => ({
                    ...orden,
                    mantenimiento: this.parseJsonOption(orden.mantenimiento),
                    tipo: this.parseJsonOption(orden.tipo)
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalRegistros,
                    totalPages: Math.ceil(totalRegistros / limit)
                }
            };
        } catch (error) {
            console.error('Error en OrdenTrabajoRepository.obtenerTodos:', error);
            throw error;
        }
    }

    async obtenerPorId(id) {
        try {
            const result = await db.query(
                'SELECT * FROM ordenes_trabajo WHERE id = ?',
                [id]
            );

            if (!result || result.length === 0) {
                return null;
            }

            return {
                ...result[0],
                mantenimiento: this.parseJsonOption(result[0].mantenimiento),
                tipo: this.parseJsonOption(result[0].tipo)
            };
        } catch (error) {
            console.error('Error en OrdenTrabajoRepository.obtenerPorId:', error);
            throw error;
        }
    }

    async modificar(id, ordenTrabajoData) {
        try {
            await db.query(
                `UPDATE ordenes_trabajo
                 SET fecha_pedido = ?,
                     fecha_terminada = ?,
                     estado = ?,
                     asignado_a = ?,
                     personas_destinadas = ?,
                     maquina = ?,
                     descripcion = ?,
                     mantenimiento = ?,
                     tipo = ?
                 WHERE id = ?`,
                [
                    ordenTrabajoData.fecha_pedido,
                    ordenTrabajoData.fecha_terminada || null,
                    ordenTrabajoData.estado,
                    ordenTrabajoData.asignado_a,
                    ordenTrabajoData.personas_destinadas,
                    ordenTrabajoData.maquina || null,
                    ordenTrabajoData.descripcion,
                    JSON.stringify(ordenTrabajoData.mantenimiento),
                    JSON.stringify(ordenTrabajoData.tipo),
                    id
                ]
            );

            return true;
        } catch (error) {
            console.error('Error en OrdenTrabajoRepository.modificar:', error);
            throw error;
        }
    }

    parseJsonOption(value) {
        if (!value) {
            return '';
        }

        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed[0] || '';
            }
            return parsed || '';
        } catch (error) {
            return value;
        }
    }
}

module.exports = new OrdenTrabajoRepository();
