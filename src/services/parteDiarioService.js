const parteDiarioRepository = require('../repositories/parteDiarioRepository');
const bolsonRepository = require('../repositories/bolsonRepository');

class ParteDiarioService {
    async crearParteDiario(datosCompletos) {
        try {
            const { fecha, turno, datosControl, grupos, checkListPala } = datosCompletos;

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
            const parteDiarioId = await parteDiarioRepository.crearParteDiario(fecha, turno, datosControlFormateados);

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
                // Convertir valores booleanos para el checklist
                const checklistFormateado = {};
                
                // Procesar cada campo del checklist convirtiéndolo a valor booleano (0/1)
                for (const [campo, valor] of Object.entries(checkListPala)) {
                    checklistFormateado[campo] = this._convertirABooleano(valor);
                }
                
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
}

module.exports = new ParteDiarioService();