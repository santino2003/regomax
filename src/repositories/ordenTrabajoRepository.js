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
                    mantenimiento: this.parseJsonArray(orden.mantenimiento),
                    tipo: this.parseJsonArray(orden.tipo)
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

    parseJsonArray(value) {
        if (!value) {
            return [];
        }

        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }
}

module.exports = new OrdenTrabajoRepository();
