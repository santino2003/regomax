const db = require('../config/db');

class ParteDiarioRepository {
    // Crear un nuevo parte diario - Datos de control
    async crearParteDiario(fecha, turno, datos) {
        try {
            // Procesar valores decimales para convertir cadenas vacías en NULL
            const cosFi = datos.cosFi === '' ? null : datos.cosFi;
            const temperaturaLiqHidT1 = datos.temperaturaLiqHidT1 === '' ? null : datos.temperaturaLiqHidT1;
            const temperaturaSalidaG1 = datos.temperaturaSalidaG1 === '' ? null : datos.temperaturaSalidaG1;
            const temperaturaSalidaG2 = datos.temperaturaSalidaG2 === '' ? null : datos.temperaturaSalidaG2;
            const temperaturaSalidaG3 = datos.temperaturaSalidaG3 === '' ? null : datos.temperaturaSalidaG3;

            // Insertar el encabezado del parte diario
            const query = `
                INSERT INTO partes_diarios (fecha, turno, cos_fi, protecciones_vallas, 
                pref1_encendido_vacio, nivel_liquido_hidraulico_t1, nivel_liquido_caja_t1,
                nivel_liq_hidraulico_d1, temperatura_liq_hid_t1, 
                temperatura_salida_g1, temperatura_salida_g2, temperatura_salida_g3,
                fecha_creacion, responsable, estado)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 'pendiente')
            `;
            
            const result = await db.query(query, [
                fecha,
                turno,
                cosFi,
                datos.proteccionesVallas,
                datos.pref1EncendidoVacio,
                datos.nivelLiquidoHidraulicoT1,
                datos.nivelLiquidoCajaT1,
                datos.nivelLiqHidraulicoD1,
                temperaturaLiqHidT1,
                temperaturaSalidaG1,
                temperaturaSalidaG2,
                temperaturaSalidaG3,
                datos.responsable || null
            ]);
            
            return result.insertId;
        } catch (error) {
            console.error('Error al crear parte diario:', error);
            throw error;
        }
    }
    
    // Agregar datos de un grupo generador
    async agregarDatosGrupo(parteDiarioId, grupo, kgPorHora, porcentajeCarga, porcentajeDebajo3350, criba) {
        try {
            // Convertir cadenas vacías a NULL para campos numéricos
            const kgPorHoraValue = kgPorHora === '' || kgPorHora === null || kgPorHora === undefined ? null : kgPorHora;
            const porcentajeCargaValue = porcentajeCarga === '' || porcentajeCarga === null || porcentajeCarga === undefined ? null : porcentajeCarga;
            const porcentajeDebajo3350Value = porcentajeDebajo3350 === '' || porcentajeDebajo3350 === null || porcentajeDebajo3350 === undefined ? null : porcentajeDebajo3350;
            
            const query = `
                INSERT INTO partes_diarios_grupos (parte_diario_id, grupo, kg_por_hora, 
                porcentaje_carga, porcentaje_debajo_3350, criba)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            await db.query(query, [
                parteDiarioId,
                grupo,
                kgPorHoraValue,
                porcentajeCargaValue,
                porcentajeDebajo3350Value,
                criba
            ]);
        } catch (error) {
            console.error(`Error al agregar datos del grupo ${grupo}:`, error);
            throw error;
        }
    }
    
    // Obtener partes diarios con paginación
    async obtenerPartesDiarios(page = 1, limit = 10, filtros = {}) {
        try {
            const offset = (page - 1) * limit;
            
            // Array para almacenar las condiciones WHERE
            let condiciones = [];
            let parametros = [];
            
            // Aplicar filtros si existen
            if (filtros.estado) {
                condiciones.push('pd.estado = ?');
                parametros.push(filtros.estado);
            }
            
            // Consulta para obtener los partes diarios con la cantidad de bolsones y el peso total
            let query = `
                SELECT pd.id, pd.fecha, pd.turno, pd.cos_fi, pd.protecciones_vallas, 
                       pd.pref1_encendido_vacio, pd.nivel_liquido_hidraulico_t1, 
                       pd.nivel_liquido_caja_t1, pd.nivel_liq_hidraulico_d1, 
                       pd.temperatura_liq_hid_t1, pd.temperatura_salida_g1, 
                       pd.temperatura_salida_g2, pd.temperatura_salida_g3, pd.responsable,
                       pd.estado,
                       COUNT(DISTINCT pdb.bolson_id) AS cantidadBolsones,
                       COALESCE(SUM(b.peso), 0) AS totalPeso
                FROM partes_diarios pd
                LEFT JOIN parte_diario_bolsones pdb ON pd.id = pdb.parte_diario_id
                LEFT JOIN bolsones b ON pdb.bolson_id = b.id
            `;
            
            // Añadir condiciones WHERE si existen
            if (condiciones.length > 0) {
                query += ' WHERE ' + condiciones.join(' AND ');
            }
            
            query += `
                GROUP BY pd.id
                ORDER BY pd.fecha DESC, pd.id DESC
                LIMIT ? OFFSET ?
            `;
            
            // Agregar los parámetros de limit y offset
            parametros.push(limit, offset);
            
            const result = await db.query(query, parametros);
            
            // Consulta para contar el total con los mismos filtros
            let countQuery = `
                SELECT COUNT(*) as total 
                FROM partes_diarios pd
            `;
            
            // Añadir condiciones WHERE a la consulta de conteo si existen
            if (condiciones.length > 0) {
                countQuery += ' WHERE ' + condiciones.join(' AND ');
            }
            
            const countResult = await db.query(countQuery, parametros.slice(0, -2)); // Eliminar limit y offset
            
            return {
                data: result,
                pagination: {
                    total: countResult[0].total,
                    page,
                    limit,
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            };
        } catch (error) {
            console.error('Error al obtener partes diarios:', error);
            throw error;
        }
    }
    
    /**
     * Agrega los datos del checklist de pala mecánica a un parte diario específico
     * @param {number} parteDiarioId - ID del parte diario
     * @param {Object} checklistData - Datos del checklist de la pala
     * @returns {Promise<boolean>} - Resultado de la operación
     */
    async agregarChecklistPala(parteDiarioId, checklistData) {
        try {
            // Asegurarse de que existe la tabla con la estructura correcta
            await db.query(`
                CREATE TABLE IF NOT EXISTS parte_diario_checklist_pala (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    parte_diario_id INT NOT NULL,
                    nivel_combustible VARCHAR(10) DEFAULT NULL,
                    sopleteado_radiadores VARCHAR(10) DEFAULT NULL,
                    nivel_refrigerante VARCHAR(10) DEFAULT NULL,
                    nivel_aceite_motor VARCHAR(10) DEFAULT NULL,
                    nivel_liquido_hidraulico VARCHAR(10) DEFAULT NULL,
                    control_luces VARCHAR(10) DEFAULT NULL,
                    sistemas_art VARCHAR(10) DEFAULT NULL,
                    limpieza_interior VARCHAR(10) DEFAULT NULL,
                    control_alambres VARCHAR(10) DEFAULT NULL,
                    lavado_exterior VARCHAR(10) DEFAULT NULL,
                    engrase_general VARCHAR(10) DEFAULT NULL,
                    horas_trabajadas DECIMAL(10,2) DEFAULT NULL,
                    observaciones TEXT DEFAULT NULL,
                    fecha_creacion DATETIME DEFAULT NULL,
                    UNIQUE KEY unique_parte_diario (parte_diario_id),
                    FOREIGN KEY (parte_diario_id) REFERENCES partes_diarios(id) ON DELETE CASCADE
                )
            `);
            
            // Los datos ya están en el formato correcto, solo agregamos los campos base
            const datosInsert = {
                parte_diario_id: parteDiarioId,
                fecha_creacion: new Date(),
                ...checklistData  // Ahora podemos extender directamente ya que los nombres coinciden
            };
            
            // Filtrar campos que no son null o undefined
            const validFields = {};
            for (const [key, value] of Object.entries(datosInsert)) {
                if (value !== null && value !== undefined) {
                    validFields[key] = value;
                }
            }
            
            // Preparar la consulta dinámica
            const fields = Object.keys(validFields);
            const placeholders = fields.map(() => '?');
            const values = Object.values(validFields);
            
            // Crear la consulta SQL
            const query = `
                INSERT INTO parte_diario_checklist_pala (${fields.join(', ')})
                VALUES (${placeholders.join(', ')})
                ON DUPLICATE KEY UPDATE 
                ${fields.filter(f => f !== 'parte_diario_id').map(f => `${f} = VALUES(${f})`).join(', ')}
            `;
            
            await db.query(query, values);
            
            return true;
        } catch (error) {
            console.error('Error al agregar checklist de pala al parte diario:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene los datos del checklist de pala mecánica de un parte diario específico
     * @param {number} parteDiarioId - ID del parte diario
     * @returns {Promise<Object|null>} - Datos del checklist o null si no existe
     */
    async obtenerChecklistPala(parteDiarioId) {
        try {
            const query = `
                SELECT * FROM parte_diario_checklist_pala
                WHERE parte_diario_id = ?
            `;
            
            const resultado = await db.query(query, [parteDiarioId]);
            
            if (resultado && resultado.length > 0) {
                return resultado[0];
            }
            
            return null;
        } catch (error) {
            console.error('Error al obtener checklist de pala:', error);
            throw error;
        }
    }
    
    // Obtener un parte diario específico with sus grupos
    async obtenerParteDiarioPorId(id) {
        try {
            // Consulta para obtener el parte diario
            const queryParte = `
                SELECT pd.id, pd.fecha, pd.turno, pd.cos_fi, pd.protecciones_vallas, 
                       pd.pref1_encendido_vacio, pd.nivel_liquido_hidraulico_t1, 
                       pd.nivel_liquido_caja_t1, pd.nivel_liq_hidraulico_d1, 
                       pd.temperatura_liq_hid_t1, pd.temperatura_salida_g1, 
                       pd.temperatura_salida_g2, pd.temperatura_salida_g3, pd.responsable
                FROM partes_diarios pd
                WHERE pd.id = ?
            `;
            
            const parte = await db.query(queryParte, [id]);
            
            if (!parte || parte.length === 0) {
                return null;
            }
            
            // Consulta para obtener los grupos asociados
            const queryGrupos = `
                SELECT grupo, kg_por_hora, porcentaje_carga, porcentaje_debajo_3350, criba
                FROM partes_diarios_grupos
                WHERE parte_diario_id = ?
                ORDER BY grupo
            `;
            
            const grupos = await db.query(queryGrupos, [id]);
            
            // Consulta para obtener el checklist de la pala
            const queryChecklist = `
                SELECT * FROM parte_diario_checklist_pala
                WHERE parte_diario_id = ?
            `;
            
            const checklist = await db.query(queryChecklist, [id]);
            
            // Combinar los resultados
            return {
                ...parte[0],
                grupos: grupos,
                checklistPala: checklist.length > 0 ? checklist[0] : null
            };
        } catch (error) {
            console.error('Error al obtener parte diario por ID:', error);
            throw error;
        }
    }
    
    /**
     * Asocia un bolsón a un parte diario específico
     * @param {number} parteDiarioId - ID del parte diario
     * @param {number} bolsonId - ID del bolsón a asociar
     * @returns {Promise<void>}
     */
    async asociarBolsonAParteDiario(parteDiarioId, bolsonId) {
        try {
            // Verificar si ya existe la tabla de asociación. Si no, la creamos.
            await db.query(`
                CREATE TABLE IF NOT EXISTS parte_diario_bolsones (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    parte_diario_id INT NOT NULL,
                    bolson_id INT NOT NULL,
                    fecha_asociacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_asociacion (parte_diario_id, bolson_id),
                    FOREIGN KEY (parte_diario_id) REFERENCES partes_diarios(id) ON DELETE CASCADE,
                    FOREIGN KEY (bolson_id) REFERENCES bolsones(id) ON DELETE CASCADE
                )
            `);
            
            // Insertar la asociación
            await db.query(`
                INSERT INTO parte_diario_bolsones (parte_diario_id, bolson_id)
                VALUES (?, ?)
            `, [parteDiarioId, bolsonId]);
            
            // Actualizar el estado del bolsón para indicar que está asociado a un parte diario
            await db.query(`
                UPDATE bolsones 
                SET asociado_a_parte = 1, 
                    parte_diario_id = ? 
                WHERE id = ?
            `, [parteDiarioId, bolsonId]);
            
            return true;
        } catch (error) {
            console.error('Error al asociar bolsón a parte diario:', error);
            throw error;
        }
    }
    
    /**
     * Desasocia un bolsón de un parte diario específico
     * @param {number} parteDiarioId - ID del parte diario
     * @param {number} bolsonId - ID del bolsón a desasociar
     * @returns {Promise<boolean>} - Resultado de la operación
     */
    async desasociarBolsonDeParteDiario(parteDiarioId, bolsonId) {
        try {
            // Eliminar la asociación
            await db.query(`
                DELETE FROM parte_diario_bolsones 
                WHERE parte_diario_id = ? AND bolson_id = ?
            `, [parteDiarioId, bolsonId]);
            
            // Actualizar el estado del bolsón para indicar que ya no está asociado a un parte diario
            await db.query(`
                UPDATE bolsones 
                SET asociado_a_parte = 0, 
                    parte_diario_id = NULL 
                WHERE id = ?
            `, [bolsonId]);
            
            return true;
        } catch (error) {
            console.error('Error al desasociar bolsón del parte diario:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene los bolsones asociados a un parte diario específico
     * @param {number} parteDiarioId - ID del parte diario
     * @returns {Promise<Array>} Lista de bolsones asociados
     */
    async obtenerBolsonesDeParteDiario(parteDiarioId) {
        try {
            return await db.query(`
                SELECT b.* 
                FROM bolsones b
                INNER JOIN parte_diario_bolsones pdb ON b.id = pdb.bolson_id
                WHERE pdb.parte_diario_id = ?
            `, [parteDiarioId]);
        } catch (error) {
            console.error('Error al obtener bolsones de parte diario:', error);
            throw error;
        }
    }

    /**
     * Actualiza el estado de un parte diario
     * @param {number} parteDiarioId - ID del parte diario
     * @param {string} estado - Nuevo estado (pendiente, aprobado)
     * @param {string} aprobador - Usuario que aprueba el parte diario
     * @returns {Promise<boolean>} - Resultado de la operación
     */
    async actualizarEstadoParteDiario(parteDiarioId, estado, aprobador) {
        try {
            // Verificar que el estado sea válido
            const estadosValidos = ['pendiente', 'aprobado'];
            if (!estadosValidos.includes(estado)) {
                throw new Error(`Estado no válido. Debe ser uno de: ${estadosValidos.join(', ')}`);
            }
            
            // Actualizar el estado del parte diario
            const query = `
                UPDATE partes_diarios 
                SET estado = ?, 
                    aprobador = ?,
                    fecha_aprobacion = ${estado === 'pendiente' ? 'NULL' : 'NOW()'}
                WHERE id = ?
            `;
            
            await db.query(query, [estado, aprobador, parteDiarioId]);
            return true;
        } catch (error) {
            console.error('Error al actualizar estado del parte diario:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene los partes diarios por estado
     * @param {string} estado - Estado de los partes diarios a obtener (pendiente, aprobado)
     * @param {number} page - Número de página
     * @param {number} limit - Límite de registros por página
     * @returns {Promise<Object>} - Resultado paginado con los partes diarios
     */
    async obtenerPartesDiariosPorEstado(estado, page = 1, limit = 10) {
        return this.obtenerPartesDiarios(page, limit, { estado });
    }

    /**
     * Actualiza los datos principales de un parte diario
     * @param {number} parteDiarioId - ID del parte diario
     * @param {object} datos - Datos actualizados
     * @returns {Promise<boolean>} - Resultado de la operación
     */
    async actualizarParteDiario(parteDiarioId, datos) {
        try {
            // Procesar valores para convertir cadenas vacías en NULL
            const cosFi = datos.cosFi === '' ? null : datos.cosFi;
            const temperaturaLiqHidT1 = datos.temperaturaLiqHidT1 === '' ? null : datos.temperaturaLiqHidT1;
            const temperaturaSalidaG1 = datos.temperaturaSalidaG1 === '' ? null : datos.temperaturaSalidaG1;
            const temperaturaSalidaG2 = datos.temperaturaSalidaG2 === '' ? null : datos.temperaturaSalidaG2;
            const temperaturaSalidaG3 = datos.temperaturaSalidaG3 === '' ? null : datos.temperaturaSalidaG3;

            // Actualizar el parte diario
            const query = `
                UPDATE partes_diarios 
                SET fecha = ?, 
                    turno = ?, 
                    cos_fi = ?, 
                    protecciones_vallas = ?, 
                    pref1_encendido_vacio = ?, 
                    nivel_liquido_hidraulico_t1 = ?, 
                    nivel_liquido_caja_t1 = ?, 
                    nivel_liq_hidraulico_d1 = ?, 
                    temperatura_liq_hid_t1 = ?, 
                    temperatura_salida_g1 = ?, 
                    temperatura_salida_g2 = ?, 
                    temperatura_salida_g3 = ?,
                    responsable = ?
                WHERE id = ?
            `;
            
            await db.query(query, [
                datos.fecha,
                datos.turno,
                cosFi,
                datos.proteccionesVallas,
                datos.pref1EncendidoVacio,
                datos.nivelLiquidoHidraulicoT1,
                datos.nivelLiquidoCajaT1,
                datos.nivelLiqHidraulicoD1,
                temperaturaLiqHidT1,
                temperaturaSalidaG1,
                temperaturaSalidaG2,
                temperaturaSalidaG3,
                datos.responsable,
                parteDiarioId
            ]);
            
            return true;
        } catch (error) {
            console.error('Error al actualizar parte diario:', error);
            throw error;
        }
    }
    
    /**
     * Elimina los grupos asociados a un parte diario
     * @param {number} parteDiarioId - ID del parte diario
     * @returns {Promise<boolean>} - Resultado de la operación
     */
    async eliminarGruposDeParteDiario(parteDiarioId) {
        try {
            const query = `
                DELETE FROM partes_diarios_grupos
                WHERE parte_diario_id = ?
            `;
            
            await db.query(query, [parteDiarioId]);
            return true;
        } catch (error) {
            console.error('Error al eliminar grupos del parte diario:', error);
            throw error;
        }
    }
    
    /**
     * Elimina un parte diario y sus datos asociados
     * @param {number} parteDiarioId - ID del parte diario
     * @returns {Promise<boolean>} - Resultado de la operación
     */
    async eliminarParteDiario(parteDiarioId) {
        try {
            // Desasociar los bolsones antes de eliminar el parte diario
            const bolsones = await this.obtenerBolsonesDeParteDiario(parteDiarioId);
            
            for (const bolson of bolsones) {
                await db.query(`
                    UPDATE bolsones 
                    SET asociado_a_parte = 0, 
                        parte_diario_id = NULL 
                    WHERE id = ?
                `, [bolson.id]);
            }
            
            // Eliminar el parte diario (los registros relacionados se eliminarán por las restricciones ON DELETE CASCADE)
            const query = `
                DELETE FROM partes_diarios
                WHERE id = ?
            `;
            
            await db.query(query, [parteDiarioId]);
            return true;
        } catch (error) {
            console.error('Error al eliminar parte diario:', error);
            throw error;
        }
    }
}

module.exports = new ParteDiarioRepository();