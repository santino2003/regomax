const { format } = require('date-fns');

function generateNumericCode(numero) {
    const año = format(new Date(), 'yy');
    const mes = format(new Date(), 'MM');
    const dia = format(new Date(), 'dd');
    const hora = format(new Date(), 'HH');
    const minutos = format(new Date(), 'mm');
    
    // Asegurar que el número siempre tenga al menos 2 dígitos
    const numeroPadded = numero.toString().padStart(2, '0');
    
    // Formato yymmaahhmm + número con padding
    return Number(`${año}${mes}${dia}${hora}${minutos}${numeroPadded}`);
}
  
module.exports = {
    generateNumericCode
};