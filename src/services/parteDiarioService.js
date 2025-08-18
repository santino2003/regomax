const parteDiarioRepository = require('../repositories/parteDiarioRepository');
const bolsonRepository = require('../repositories/bolsonRepository');

class ParteDiarioService {
    async crearParteDiario(datosCompletos) {
        try {
            const { fecha, turno, responsable, datosControl, grupos, checkListPala } = datosCompletos;

            if (!fecha || !turno || !datosControl) {
                throw new Error('Datos incompletos para crear el parte diario');
            }

            // Convertir campos booleanos de texto a valores numéricos
            const datosControlFormateados = {
                ...datosControl,
                // Convertir valores 'OK', 'Si', 'true', true, etc. a 1, todo lo demás a 0
                proteccionesVallas: this._convertirABooleano(datosControl.proteccionesVallas),
                pref1EncendidoVacio: this._convertirABooleano(datosControl.pref1EncendidoVacio),
                nivelLiquidoHidraulicoT1: this._convertirABooleano(datosControl.nivelLiquidoHidraulicoT1),
                nivelLiquidoCajaT1: this._convertirABooleano(datosControl.nivelLiquidoCajaT1),
                nivelLiqHidraulicoD1: this._convertirABooleano(datosControl.nivelLiqHidraulicoD1)
            };

            // Crear el parte diario principal (datos de control)
            const parteDiarioId = await parteDiarioRepository.crearParteDiario(fecha, turno, responsable, datosControlFormateados);

            // Si hay grupos definidos, agregarlos
            if (grupos && Array.isArray(grupos) && grupos.length > 0) {
                for (const grupo of grupos) {
                    await parteDiarioRepository.agregarDatosGrupo(
                        parteDiarioId,
                        grupo.nombre,
                        grupo.kgPorHora,
                        grupo.porcentajeCarga,
                        grupo.porcentajeDebajo3350,
                        grupo.criba
                    );
                }
            }
            
            // Si hay datos de checklist de pala, agregarlos
            if (checkListPala) {
                // Formatear el checklist separando los campos booleanos de los numéricos y de texto
                const checklistFormateado = {};
                
                // Procesar cada campo del checklist
                for (const [campo, valor] of Object.entries(checkListPala)) {
                    if (campo === 'horasEquipo') {
                        // Las horas del equipo se guardan como horas_trabajadas y conservamos el valor numérico
                        checklistFormateado['horas_trabajadas'] = valor !== null && valor !== '' ? parseFloat(valor) : null;
                    } 
                    else if (campo === 'observaciones') {
                        // Las observaciones se conservan como texto
                        checklistFormateado[campo] = valor;
                    }
                    else {
                        // Para los demás campos (los estados de cada ítem del checklist), se convierten a booleano
                        checklistFormateado[campo] = this._convertirABooleano(valor);
                    }
                }
                
                // Log para depuración
                console.log('ChecklistPala formateado para la BD:', checklistFormateado);
                
                await parteDiarioRepository.agregarChecklistPala(parteDiarioId, checklistFormateado);
            }

            // Obtener todos los bolsones que no están asociados a ningún parte diario
            const bolsonesNoAsociados = await bolsonRepository.obtenerBolsonesNoAsociados();
            
            // Asociar automáticamente todos los bolsones no asociados a este parte diario
            if (bolsonesNoAsociados && bolsonesNoAsociados.length > 0) {
                console.log(`Asociando automáticamente ${bolsonesNoAsociados.length} bolsones al parte diario ${parteDiarioId}`);
                
                for (const bolson of bolsonesNoAsociados) {
                    await parteDiarioRepository.asociarBolsonAParteDiario(
                        parteDiarioId,
                        bolson.id
                    );
                }
            } else {
                console.log('No hay bolsones pendientes para asociar al parte diario');
            }

            return {
                success: true,
                id: parteDiarioId,
                bolsonesAsociados: bolsonesNoAsociados ? bolsonesNoAsociados.length : 0
            };
        } catch (error) {
            console.error('Error en el servicio al crear parte diario:', error);
            throw new Error('Error al crear el parte diario: ' + error.message);
        }
    }

    // Método auxiliar para convertir diferentes formatos a valores booleanos (0 o 1)
    _convertirABooleano(valor) {
        if (valor === null || valor === undefined) return 0;
        
        if (typeof valor === 'boolean') return valor ? 1 : 0;
        
        if (typeof valor === 'number') return valor ? 1 : 0;
        
        if (typeof valor === 'string') {
            const valorNormalizado = valor.trim().toLowerCase();
            if (['1', 'true', 'si', 'yes', 'ok', 'on', 'checked'].includes(valorNormalizado)) {
                return 1;
            }
        }
        
        return 0;
    }

    async obtenerPartesDiarios(page = 1, limit = 10) {
        try {
            return await parteDiarioRepository.obtenerPartesDiarios(page, limit);
        } catch (error) {
            console.error('Error en el servicio al obtener partes diarios:', error);
            throw new Error('Error al obtener los partes diarios: ' + error.message);
        }
    }

    async obtenerParteDiarioPorId(id) {
        try {
            const parteDiario = await parteDiarioRepository.obtenerParteDiarioPorId(id);
            
            if (!parteDiario) {
                throw new Error('Parte diario no encontrado');
            }
            
            return parteDiario;
        } catch (error) {
            console.error('Error en el servicio al obtener parte diario por ID:', error);
            throw new Error('Error al obtener el parte diario: ' + error.message);
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
            // Verificar que el parte diario existe
            const parteDiario = await parteDiarioRepository.obtenerParteDiarioPorId(parteDiarioId);
            if (!parteDiario) {
                throw new Error('Parte diario no encontrado');
            }
            
            // Verificar que el estado sea válido
            const estadosValidos = ['pendiente', 'aprobado'];
            if (!estadosValidos.includes(estado)) {
                throw new Error(`Estado no válido. Debe ser uno de: ${estadosValidos.join(', ')}`);
            }
            
            // Actualizar el estado
            return await parteDiarioRepository.actualizarEstadoParteDiario(parteDiarioId, estado, aprobador);
        } catch (error) {
            console.error('Error en el servicio al actualizar estado del parte diario:', error);
            throw new Error('Error al actualizar el estado del parte diario: ' + error.message);
        }
    }
    
    /**
     * Obtiene los partes diarios filtrados por estado
     * @param {string} estado - Estado de los partes diarios (pendiente, aprobado)
     * @param {number} page - Número de página
     * @param {number} limit - Límite de registros por página
     * @returns {Promise<Object>} - Resultado paginado con los partes diarios
     */
    async obtenerPartesDiariosPorEstado(estado, page = 1, limit = 10) {
        try {
            return await parteDiarioRepository.obtenerPartesDiariosPorEstado(estado, page, limit);
        } catch (error) {
            console.error('Error en el servicio al obtener partes diarios por estado:', error);
            throw new Error('Error al obtener los partes diarios por estado: ' + error.message);
        }
    }

    /**
     * Actualiza un parte diario existente
     * @param {number} parteDiarioId - ID del parte diario a actualizar
     * @param {object} datosActualizados - Datos actualizados del parte diario
     * @returns {Promise<object>} - Resultado de la operación
     */
    async actualizarParteDiario(parteDiarioId, datosActualizados) {
        try {
            // Verificar que el parte diario existe
            const parteDiarioExistente = await parteDiarioRepository.obtenerParteDiarioPorId(parteDiarioId);
            if (!parteDiarioExistente) {
                throw new Error('Parte diario no encontrado');
            }
            
            // Extraer los datos relevantes para cada componente
            const { fecha, turno, responsable, cosFi, grupos, checkListPala, ...otrosDatos } = datosActualizados;
            
            // Crear un objeto con los datos básicos
            const datosPrincipales = {
                fecha,
                turno,
                responsable,
                cosFi,
                proteccionesVallas: this._convertirABooleano(datosActualizados.proteccionesVallas),
                pref1EncendidoVacio: this._convertirABooleano(datosActualizados.pref1EncendidoVacio),
                nivelLiquidoHidraulicoT1: this._convertirABooleano(datosActualizados.nivelLiquidoHidraulicoT1),
                nivelLiquidoCajaT1: this._convertirABooleano(datosActualizados.nivelLiquidoCajaT1),
                nivelLiqHidraulicoD1: this._convertirABooleano(datosActualizados.nivelLiqHidraulicoD1),
                temperaturaLiqHidT1: datosActualizados.temperaturaLiqHidT1,
                temperaturaSalidaG1: datosActualizados.temperaturaSalidaG1,
                temperaturaSalidaG2: datosActualizados.temperaturaSalidaG2,
                temperaturaSalidaG3: datosActualizados.temperaturaSalidaG3
            };
            
            // Actualizar datos principales en la tabla partes_diarios
            await parteDiarioRepository.actualizarParteDiario(parteDiarioId, datosPrincipales);
            
            // Si hay grupos definidos, actualizar o crear según corresponda
            if (grupos && Array.isArray(grupos) && grupos.length > 0) {
                // Primero eliminar los grupos existentes
                await parteDiarioRepository.eliminarGruposDeParteDiario(parteDiarioId);
                
                // Luego insertar los nuevos grupos
                for (const grupo of grupos) {
                    await parteDiarioRepository.agregarDatosGrupo(
                        parteDiarioId,
                        grupo.nombre,
                        grupo.kgPorHora,
                        grupo.porcentajeCarga,
                        grupo.porcentajeDebajo3350,
                        grupo.criba
                    );
                }
            }
            
            // Si hay datos de checklist de pala, actualizarlos
            if (checkListPala) {
                // Formatear el checklist separando los campos booleanos de los numéricos y de texto
                const checklistFormateado = {};
                
                // Procesar cada campo del checklist
                for (const [campo, valor] of Object.entries(checkListPala)) {
                    if (campo === 'horasEquipo') {
                        // Las horas del equipo se guardan como horas_trabajadas
                        checklistFormateado['horas_trabajadas'] = valor !== null && valor !== '' ? parseFloat(valor) : null;
                    } 
                    else if (campo === 'observaciones') {
                        // Las observaciones se conservan como texto
                        checklistFormateado[campo] = valor;
                    }
                    else {
                        // Para los campos de estado (los ítems del checklist), convertimos a booleano (0/1)
                        const nombreCampoSnakeCase = campo
                            .replace(/([A-Z])/g, '_$1')
                            .toLowerCase()
                            .replace(/^_/, '');
                            
                        checklistFormateado[nombreCampoSnakeCase] = this._convertirABooleano(valor);
                    }
                }
                
                await parteDiarioRepository.agregarChecklistPala(parteDiarioId, checklistFormateado);
            }
            
            return {
                success: true,
                message: 'Parte diario actualizado correctamente',
                id: parteDiarioId
            };
        } catch (error) {
            console.error('Error en el servicio al actualizar parte diario:', error);
            throw new Error('Error al actualizar el parte diario: ' + error.message);
        }
    }
    
    /**
     * Elimina un parte diario existente
     * @param {number} parteDiarioId - ID del parte diario a eliminar
     * @returns {Promise<boolean>} - Resultado de la operación
     */
    async eliminarParteDiario(parteDiarioId) {
        try {
            // Verificar que el parte diario existe
            const parteDiario = await parteDiarioRepository.obtenerParteDiarioPorId(parteDiarioId);
            if (!parteDiario) {
                throw new Error('Parte diario no encontrado');
            }
            
            // Eliminar el parte diario
            return await parteDiarioRepository.eliminarParteDiario(parteDiarioId);
        } catch (error) {
            console.error('Error en el servicio al eliminar parte diario:', error);
            throw new Error('Error al eliminar el parte diario: ' + error.message);
        }
    }
}

module.exports = new ParteDiarioService();