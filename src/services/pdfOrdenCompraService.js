const PDFDocument = require('pdfkit');
const ordenCompraRepository = require('../repositories/ordenCompraRepository');

class PDFOrdenCompraService {
    async generarPDF(ordenId) {
        const orden = await ordenCompraRepository.obtenerPorId(ordenId);
        if (!orden) throw new Error('Orden de compra no encontrada');

        const doc = new PDFDocument({
            size: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 }
        });
        const left = 40;
        const width = 515;
        const bottom = doc.page.height - doc.page.margins.bottom;
        let currentY;
        let inicioFilas;
        const encabezadoPagina = () => {
            doc.font('Helvetica-Bold').fontSize(14).text('Regomax S.A.', left, 40, { width });
            doc.fontSize(12).text(`Orden de Compra ${orden.codigo}`, left, doc.y + 4, { width });
            currentY = doc.y + 16;
            inicioFilas = currentY;
        };
        const nuevaPagina = () => {
            doc.addPage();
            encabezadoPagina();
        };
        encabezadoPagina();

        const medir = (texto, ancho) => texto ? doc.heightOfString(texto, { width: ancho - 10 }) : 0;
        const dibujarCeldas = (textos, anchos, altura, alineaciones = [], negritaPrimera = false) => {
            let x = left;
            textos.forEach((texto, index) => {
                if (negritaPrimera) doc.font(index === 0 ? 'Helvetica-Bold' : 'Helvetica');
                doc.text(texto, x + 5, currentY + 3, {
                    width: anchos[index] - 10, height: altura - 6,
                    align: alineaciones[index] || 'left', lineBreak: true
                });
                doc.moveTo(x, currentY).lineTo(x, currentY + altura).stroke();
                x += anchos[index];
            });
            doc.moveTo(x, currentY).lineTo(x, currentY + altura).stroke();
            doc.moveTo(left, currentY).lineTo(left + width, currentY).stroke();
            currentY += altura;
            doc.moveTo(left, currentY).lineTo(left + width, currentY).stroke();
        };
        // Solo se divide una fila si por sí sola supera el alto útil de una página.
        // Cada fragmento se mide antes de dibujar: PDFKit no debe crear páginas por celda.
        const prefijoQueCabe = (texto, ancho, alto) => {
            let inicio = 0;
            let fin = texto.length;
            while (inicio < fin) {
                const medio = Math.ceil((inicio + fin) / 2);
                if (medir(texto.slice(0, medio), ancho) <= alto) inicio = medio;
                else fin = medio - 1;
            }
            if (inicio && inicio < texto.length) {
                const espacio = texto.slice(0, inicio).search(/\s+\S*$/);
                if (espacio > 0) return espacio;
            }
            return inicio;
        };
        const fila = (valores, anchos, tamano, negrita, pasarPagina, alineaciones = [], negritaPrimera = false) => {
            doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(tamano);
            let pendientes = valores.map(valor => String(valor ?? ''));
            const altura = () => Math.max(12, ...pendientes.map((texto, i) => medir(texto, anchos[i]))) + 6;
            if (currentY + altura() > bottom && currentY > inicioFilas) pasarPagina();
            do {
                doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(tamano);
                const espacio = bottom - currentY - 6;
                const fragmentos = pendientes.map((texto, i) => medir(texto, anchos[i]) <= espacio
                    ? texto : texto.slice(0, prefijoQueCabe(texto, anchos[i], espacio)));
                const alto = Math.max(12, ...fragmentos.map((texto, i) => medir(texto, anchos[i]))) + 6;
                dibujarCeldas(fragmentos, anchos, alto, alineaciones, negritaPrimera);
                pendientes = pendientes.map((texto, i) => texto.slice(fragmentos[i].length));
                if (pendientes.some(Boolean)) pasarPagina();
            } while (pendientes.some(Boolean));
        };
        const formatDate = valor => valor ? new Date(valor).toLocaleDateString('es-AR') : '-';
        const formatAmount = valor => (parseFloat(valor) || 0).toLocaleString('es-AR', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
        for (const datos of [
            ['Pedida', formatDate(orden.created_at)], ['Condición', orden.condicion || '-'],
            ['Asunto', orden.asunto || '-'], ['Estado', orden.estado || '-']
        ]) fila(datos, [80, 435], 9, false, nuevaPagina, [], true);
        currentY += 15;

        const anchos = [160, 75, 125, 45, 45, 65];
        const alineaciones = ['left', 'left', 'left', 'right', 'center', 'center'];
        const encabezadoItems = () => {
            doc.font('Helvetica-Bold').fontSize(8);
            const titulos = ['Bien', 'Centro de Costo', 'Descripción', 'Cantidad', 'Unidad', 'Medio Pago'];
            const alto = Math.max(12, ...titulos.map((texto, i) => medir(texto, anchos[i]))) + 6;
            if (currentY + alto + 18 > bottom) nuevaPagina();
            doc.font('Helvetica-Bold').fontSize(8);
            dibujarCeldas(titulos, anchos, alto, alineaciones);
            inicioFilas = currentY;
        };
        const paginaItems = () => { nuevaPagina(); encabezadoItems(); };
        encabezadoItems();
        const totales = {};
        for (const item of orden.items || []) {
            const cantidad = parseFloat(item.cantidad) || 0;
            const moneda = String(item.moneda || 'ARS').toUpperCase();
            const subtotal = cantidad * (parseFloat(item.precio_unitario) || 0);
            if (subtotal > 0) totales[moneda] = (totales[moneda] || 0) + subtotal;
            fila([
                item.bien_nombre || '', item.centro_costo || '-', item.descripcion || '',
                cantidad.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 3 }),
                item.unidad_medida_nombre_lindo || item.unidad_medida_nombre || '-', item.medio_pago || '-'
            ], anchos, 7, false, paginaItems, alineaciones);
        }
        if (orden.contrafactura && orden.items?.length) {
            const impuestos = parseFloat(orden.impuestos) || 0;
            const descuento = parseFloat(orden.descuento) || 0;
            const moneda = Object.keys(totales)[0] || 'ARS';
            if (impuestos > 0 || descuento > 0) totales[moneda] = Math.max((totales[moneda] || 0) + impuestos - descuento, 0);
            const lineas = [
                'Resumen de importes', `Impuestos: ${moneda} ${formatAmount(impuestos)}`,
                `Descuento: ${moneda} ${formatAmount(descuento)}`,
                ...Object.entries(totales).map(([divisa, total]) => `Total ${divisa}: ${formatAmount(total)}`)
            ];
            doc.font('Helvetica-Bold').fontSize(8);
            const altoResumen = lineas.reduce((alto, texto) => alto + doc.heightOfString(texto, { width: 175 }) + 4, 12);
            if (currentY + altoResumen > bottom) nuevaPagina();
            currentY += 12;
            lineas.forEach((texto, index) => {
                doc.font(index === 1 || index === 2 ? 'Helvetica' : 'Helvetica-Bold').fontSize(8);
                const alto = doc.heightOfString(texto, { width: 175 });
                if (currentY + alto > bottom) nuevaPagina();
                doc.font(index === 1 || index === 2 ? 'Helvetica' : 'Helvetica-Bold').fontSize(8);
                doc.text(texto, 380, currentY, { width: 175, height: alto });
                currentY += alto + 4;
            });
        }
        doc.end();
        return doc;
    }
}

module.exports = new PDFOrdenCompraService();
