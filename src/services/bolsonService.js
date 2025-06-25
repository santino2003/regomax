const bolsonRepository = require('../repositories/bolsonRepository');
const { format } = require('date-fns');
const barcodeGenerator = require('../utils/barcodeGenerator');
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
            console.log('Fecha última:', ultimaFecha, 'Fecha hoy:', hoy, 'Fecha comparable:', fechaComparable);i
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
            const seCreoBolson = await bolsonRepository.crearBolson(
                codigo, producto, peso, precinto, hoy, hora, responsable
            );
            
            return {
                success: true,
                codigo: codigo,
            };
            
        } catch (error) {
            console.error('Error completo al crear el bolson:', error);
            throw new Error('Error al crear el bolson: ' + (error.sqlMessage || error.message));
        }
    }
}

module.exports = new BolsonService();