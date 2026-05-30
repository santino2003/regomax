const QRCode = require('qrcode');


async function generarBarcodeBase64(codigo) {
    // Asegurar que el código sea una cadena de texto
    const codigoString = String(codigo);
    
    // Generar QR con el mismo número que contenía el código de barras
    const buffer = await QRCode.toBuffer(codigoString, {
        version: 1, // Auto-detect version
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 150,
        margin: 1,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    });
    return buffer.toString('base64');
}

module.exports = generarBarcodeBase64;
