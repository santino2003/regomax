const bolsonRepository = require('../repositories/bolsonRepository');
const { format } = require('date-fns');
const barcodeGenerator = require('../utils/barcodeGenerator');
const generarBarcodeBase64 = require('../utils/imageBarcode');
// const imagenBarcodeGenerator = require('../utils/imagenBarcodeGenerator');

class BolsonService {
    async crearBolson(productoData) {
        try {
            const { producto, peso, precinto, responsable } = productoData;

            if (!producto || !peso || !precinto) {
                throw new Error('Datos incompletos para crear el bolson');
            }

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


            const hora = format(new Date(), 'HH:mm');

            const codigo = barcodeGenerator.generateNumericCode(numero);
            const barcodeBase64 = await generarBarcodeBase64(codigo);
            const seCreoBolson = await bolsonRepository.crearBolson(
                codigo, producto, peso, precinto, hoy, hora, responsable
            );
            
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
    async obtenerNoDespachados(page = 1, limit = 10, sortBy = 'id', sortOrder = 'DESC') {
        return await bolsonRepository.obtenerNoDespachados(page, limit, sortBy, sortOrder);
    }
}

module.exports = new BolsonService();