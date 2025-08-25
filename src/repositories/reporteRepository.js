const db = require('../config/db');

class ReporteRepository {
    // Obtener los días hábiles configurados para un mes específico
    async obtenerDiasHabilesMes(mes, anio) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM dias_habiles WHERE mes = ? AND anio = ?',
                [mes, anio]
            );
            
            if (rows.length > 0) {
                // Convertir string de días hábiles a array de fechas
                rows[0].dias = JSON.parse(rows[0].dias_habiles);
            } else {
                return {
                    mes,
                    anio,
                    dias: []
                };
            }
            
            return {
                id: rows[0].id,
                mes: rows[0].mes,
                anio: rows[0].anio,
                dias: rows[0].dias
            };
        } catch (error) {
            console.error('Error en repositorio al obtener días hábiles:', error);
            throw error;
        }
    }
    
    // Guardar los días hábiles configurados para un mes
    async guardarDiasHabiles(mes, anio, diasHabiles) {
        try {
            // Convertir array a formato JSON para almacenar
            const diasHabilesJSON = JSON.stringify(diasHabiles);
            
            // Verificar si ya existe configuración para este mes
            const [existente] = await db.query(
                'SELECT id FROM dias_habiles WHERE mes = ? AND anio = ?',
                [mes, anio]
            );
            
            if (existente.length > 0) {
                // Actualizar registro existente
                await db.query(
                    'UPDATE dias_habiles SET dias_habiles = ? WHERE mes = ? AND anio = ?',
                    [diasHabilesJSON, mes, anio]
                );
                return { id: existente[0].id, actualizado: true };
            } else {
                // Crear nuevo registro
                const [result] = await db.query(
                    'INSERT INTO dias_habiles (mes, anio, dias_habiles) VALUES (?, ?, ?)',
                    [mes, anio, diasHabilesJSON]
                );
                return { id: result.insertId, actualizado: false };
            }
        } catch (error) {
            console.error('Error en repositorio al guardar días hábiles:', error);
            throw error;
        }
    }
    
    // Obtener datos de NFU para una fecha específica
    async obtenerDatosNFUPorFecha(fecha) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM nfu_ingresos WHERE fecha = ?',
                [fecha]
            );
            
            if (rows.length > 0) {
                return rows[0];
            }
            
            return null;
        } catch (error) {
            console.error('Error en repositorio al obtener datos NFU por fecha:', error);
            throw error;
        }
    }
    
    // Guardar datos de NFU para una fecha específica
    async guardarDatosNFU(fecha, cantidad, usuarioId) {
        try {
            // Verificar si ya existen datos para esta fecha
            const [existente] = await db.query(
                'SELECT id FROM nfu_ingresos WHERE fecha = ?',
                [fecha]
            );
            
            if (existente.length > 0) {
                // Actualizar registro existente
                await db.query(
                    'UPDATE nfu_ingresos SET cantidad = ?, usuario_id = ?, actualizado_en = NOW() WHERE fecha = ?',
                    [cantidad, usuarioId, fecha]
                );
                return { id: existente[0].id, actualizado: true };
            } else {
                // Crear nuevo registro
                const [result] = await db.query(
                    'INSERT INTO nfu_ingresos (fecha, cantidad, usuario_id, creado_en) VALUES (?, ?, ?, NOW())',
                    [fecha, cantidad, usuarioId]
                );
                return { id: result.insertId, actualizado: false };
            }
        } catch (error) {
            console.error('Error en repositorio al guardar datos NFU:', error);
            throw error;
        }
    }
    
    // Obtener todos los datos de NFU en un rango de fechas (para un mes)
    async obtenerDatosNFURango(fechaInicio, fechaFin) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM nfu_ingresos WHERE fecha BETWEEN ? AND ? ORDER BY fecha ASC',
                [fechaInicio, fechaFin]
            );
            
            return rows;
        } catch (error) {
            console.error('Error en repositorio al obtener datos NFU por rango:', error);
            throw error;
        }
    }
}

module.exports = new ReporteRepository();