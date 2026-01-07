const bolsonRepository = require('../repositories/bolsonRepository');
const barcodeGenerator = require('../utils/barcodeGenerator');
const generarBarcodeBase64 = require('../utils/imageBarcode');
const productoRepository = require('../repositories/productoRepository');
const bienService = require('./bienService');
const { format } = require('date-fns');
const { fechaActual, formatMySQLLocal } = require('../utils/fecha');
// const imagenBarcodeGenerator = require('../utils/imagenBarcodeGenerator');

class BolsonService {
    async crearBolson(productoData) {
        try {
            const { producto, peso, precinto, responsable } = productoData;

            if (!producto || !peso || !precinto) {
                throw new Error('Datos incompletos para crear el bolson');
            }

            // Obtener información del producto para verificar si tiene bien asociado
            const productoInfo = await productoRepository.obtenerPorNombre(producto);
            
            let ultimaFecha = await bolsonRepository.getUltimaFecha();

            let numero = (await bolsonRepository.getUltimoNumero()) + 1;
            const hoy = format(new Date(), 'yyyy-MM-dd');
            const fechaComparable = ultimaFecha ? format(new Date(ultimaFecha), 'yyyy-MM-dd') : null;
            console.log('Fecha última:', ultimaFecha, 'Fecha hoy:', hoy, 'Fecha comparable:', fechaComparable);
            if (!ultimaFecha || fechaComparable !== hoy) {
                await bolsonRepository.setUltimaFecha(hoy);
                await bolsonRepository.setUltimoNumero(1);
                ultimaFecha = hoy;
                numero = 1;
            } else {
                await bolsonRepository.setUltimoNumero(numero);
            }

            // Imprimir la hora actual para diagnóstico (10:36 según mencionado)
            const ahora = new Date();

            // Obtener horas y minutos para guardar
            const horas = ahora.getHours().toString().padStart(2, '0');
            const minutos = ahora.getMinutes().toString().padStart(2, '0');
            const hora = `${horas}:${minutos}`;
            console.log('Hora que se guardará en la base de datos:', hora);

            const codigo = barcodeGenerator.generateNumericCode(numero);
            const barcodeBase64 = await generarBarcodeBase64(codigo);
            const seCreoBolson = await bolsonRepository.crearBolson(
                codigo, producto, peso, precinto, hoy, hora, responsable
            );
            
            // Descontar stock de los bienes asociados si existen
            if (productoInfo && productoInfo.bienes_asociados) {
                try {
                    // Parsear el JSON de bienes asociados
                    const bienesAsociados = typeof productoInfo.bienes_asociados === 'string' 
                        ? JSON.parse(productoInfo.bienes_asociados) 
                        : productoInfo.bienes_asociados;
                    
                    if (Array.isArray(bienesAsociados) && bienesAsociados.length > 0) {                        
                        // Descontar cada bien del array
                        for (const bien of bienesAsociados) {
                            if (bien.bien_id && bien.cantidad) {
                                try {
                                    await bienService.descontarStock(bien.bien_id, parseFloat(bien.cantidad));
                                } catch (bienError) {
                                    console.error(`❌ Error al descontar bien ID ${bien.bien_id}:`, bienError.message);
                                    // Continuar con los demás bienes aunque uno falle
                                }
                            }
                        }
                    }
                } catch (stockError) {
                    console.error('❌ Error al procesar descuento de bienes:', stockError);
                    // No lanzar error, el bolsón ya se creó
                }
            }
            
            return {
                success: true,
                codigo: codigo,
                barcodeBase64: barcodeBase64,
            };
            
        } catch (error) {
            console.error('Error completo al crear el bolson:', error);
            throw new Error('Error al crear el bolson: ' + (error.sqlMessage || error.message));
        }

    }
    async obtenerTodos(page = 1, limit = 10, sortBy = 'id', sortOrder = 'DESC') {
        try {
            const resultado = await bolsonRepository.obtenerTodos(page, limit, sortBy, sortOrder);
            return resultado;
        } catch (error) {
            console.error('Error al obtener todos los bolsones:', error);
            throw new Error('Error al obtener todos los bolsones: ' + error.message);
        }
    }
    async obtenerPorId(id) {
        try {
            const bolson = await bolsonRepository.obtenerPorId(id);
            if (!bolson) {
                throw new Error('Bolsón no encontrado');
            }
            return bolson;
        } catch (error) {
            console.error('Error al obtener el bolson por ID:', error);
            throw new Error('Error al obtener el bolson: ' + error.message);
        }
    }
    async obtenerPorCodigo(codigo) {
        try {
            const bolson = await bolsonRepository.obtenerPorCodigo(codigo);
            if (!bolson) {
                throw new Error(`Bolsón con código ${codigo} no encontrado`);
            }
            return bolson;
        } catch (error) {
            console.error('Error al obtener el bolsón por código:', error);
            throw new Error('Error al obtener el bolsón: ' + error.message);
        }
    }
    async actualizar(id, productoData) {
        try {
            const { producto, peso, precinto  } = productoData;

            if (!producto || !peso || !precinto) {
                throw new Error('Datos incompletos para actualizar el bolson');
            }

            const bolson = await this.obtenerPorId(id);
            if (!bolson) {
                throw new Error('Bolsón no encontrado');
            }


            await bolsonRepository.actualizarBolson(id, producto, peso, precinto);
            
            return {
                success: true,
                message: 'Bolsón actualizado exitosamente',
            };
        } catch (error) {
            console.error('Error al actualizar el bolson:', error);
            throw new Error('Error al actualizar el bolson: ' + error.message);
        }
    }
    async eliminar(id) {
        try {
            // Verificar si el bolsón existe
            const bolson = await this.obtenerPorId(id);
            if (!bolson) {
                return null; // Bolsón no encontrado
            }
            
            // Llamar al repositorio para eliminar el bolsón
            const resultado = await bolsonRepository.eliminarBolson(id);
            
            return {
                success: true,
                message: 'Bolsón eliminado exitosamente',
            };
        } catch (error) {
            console.error('Error al eliminar el bolson:', error);
            throw new Error('Error al eliminar el bolson: ' + error.message);
        }
    }
    // Obtener bolsones no despachados
    async obtenerNoDespachados(page = 1, limit = 10, sortBy = 'id', sortOrder = 'DESC', filtros = {}) {
        return await bolsonRepository.obtenerNoDespachados(page, limit, sortBy, sortOrder, filtros);
    }

    /**
     * Obtiene los bolsones que han sido despachados
     * @param {number} page - Página actual
     * @param {number} limit - Cantidad de items por página
     * @param {string} sortBy - Campo por el cual ordenar
     * @param {string} sortOrder - Orden de clasificación (ASC o DESC)
     * @param {Object} filtros - Filtros a aplicar (producto, codigo, precinto)
     * @returns {Promise<Object>} Bolsones despachados con información de paginación
     */
    async obtenerDespachados(page = 1, limit = 10, sortBy = 'id', sortOrder = 'DESC', filtros = {}) {
        return await bolsonRepository.obtenerDespachados(page, limit, sortBy, sortOrder, filtros);
    }

    /**
     * Obtiene todos los bolsones disponibles (no despachados)
     * @returns {Promise<Array>} Lista de bolsones disponibles
     */
    async obtenerBolsonesDisponibles() {
        try {
            return await bolsonRepository.obtenerBolsonesDisponibles();
        } catch (error) {
            console.error('Error en servicio al obtener bolsones disponibles:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los bolsones pendientes de asociar a un parte diario
     * @returns {Promise<Array>} Lista de bolsones pendientes de asociar
     */
    async obtenerBolsonesPendientes() {
        try {
            return await bolsonRepository.obtenerBolsonesNoAsociados();
        } catch (error) {
            console.error('Error en servicio al obtener bolsones pendientes:', error);
            throw error;
        }
    }

    async generarCodigoUnico() {
        try {
            let ultimaFecha = await bolsonRepository.getUltimaFecha();
            let numero = (await bolsonRepository.getUltimoNumero()) + 1;
            const hoy = formatMySQLLocal(fechaActual()).split(' ')[0]; // Usar utilidad de fecha
            const fechaComparable = ultimaFecha ? formatMySQLLocal(new Date(ultimaFecha)).split(' ')[0] : null;
            
            // Si la fecha es diferente a la última fecha registrada, reiniciar el número
            if (fechaComparable !== hoy) {
                numero = 1;
            }
            
            // Imprimir la hora actual para diagnóstico (10:36 según mencionado)
            const ahora = fechaActual(); // Usar utilidad de fecha
            console.log('=== DIAGNÓSTICO DE HORA ===');
            console.log('Hora actual del sistema:', ahora);
            console.log('toString():', ahora.toString());
            console.log('toLocaleString():', ahora.toLocaleString());
            console.log('Hora (getHours):', ahora.getHours());
            console.log('Minutos (getMinutes):', ahora.getMinutes());
            console.log('=== FIN DIAGNÓSTICO ===');
        } catch (error) {
            console.error('Error al generar código único:', error);
            throw new Error('Error al generar código único: ' + error.message);
        }
    }
}

module.exports = new BolsonService();