const bwipjs = require('bwip-js');


async function generarBarcodeBase64(codigo) {
    // Asegurar que el código sea una cadena de texto
    const codigoString = String(codigo);
    
    const buffer = await bwipjs.toBuffer({
        bcid:        'code128',
        text:        codigoString,
        scale:       3,
        height:      10,
        includetext: true,
        textxalign:  'center',
    });
    return buffer.toString('base64');
}

module.exports = generarBarcodeBase64;
