const { format } = require('date-fns');
const { fechaActual } = require('./fecha');

function generateNumericCode(numero) {
    const date = fechaActual(); // Usar utilidad de fecha que tiene en cuenta la zona horaria
    const año = format(date, 'yy');
    const mes = format(date, 'MM');
    const dia = format(date, 'dd');
    const hora = format(date, 'HH');
    const minutos = format(date, 'mm');
    
    // Asegurar que el número siempre tenga al menos 2 dígitos
    const numeroPadded = numero.toString().padStart(2, '0');
    
    // Formato yymmaahhmm + número con padding
    return Number(`${año}${mes}${dia}${hora}${minutos}${numeroPadded}`);
}
  
module.exports = {
    generateNumericCode
};