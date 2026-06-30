const PDFDocument = require('pdfkit');
const ordenCompraRepository = require('../repositories/ordenCompraRepository');

class PDFOrdenCompraService {
    async generarPDF(ordenId) {
        try {
            // Obtener datos de la orden
            const orden = await ordenCompraRepository.obtenerPorId(ordenId);
            
            if (!orden) {
                throw new Error('Orden de compra no encontrada');
            }

            // Crear documento PDF con márgenes más pequeños
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 40, bottom: 40, left: 40, right: 40 }
            });

            // Encabezado - más compacto
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text('Regomax S.A.', 40, 40);
            
            doc.fontSize(12)
               .text(`Orden de Compra ${orden.codigo}`, 40, 58);

            // Tabla de información general - más compacta
            let currentY = 85;
            const tableWidth = 515;
            const col1Width = 80;
            const col2Width = 435;
            const infoTableStartY = currentY - 3;

            // Helper para dibujar fila de tabla
            const drawTableRow = (label, value, y, isFirst = false) => {
                doc.fontSize(9)
                   .font('Helvetica-Bold')
                   .text(label, 45, y, { width: col1Width, align: 'left' })
                   .font('Helvetica')
                   .text(value, 125, y, { width: col2Width, align: 'left' });
                
                // Línea horizontal
                doc.moveTo(40, y + 13)
                   .lineTo(555, y + 13)
                   .stroke();
                
                return y + 15;
            };

            // Línea superior de la tabla
            doc.moveTo(40, currentY - 3)
               .lineTo(555, currentY - 3)
               .stroke();

            // Datos de la orden
            const formatDate = (dateStr) => {
                if (!dateStr) return '-';
                const date = new Date(dateStr);
                return date.toLocaleDateString('es-AR');
            };
            const formatAmount = (value) => (parseFloat(value) || 0).toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

            const infoTableEndY = currentY - 3 + (15 * 4); // 4 filas

            currentY = drawTableRow('Pedida', formatDate(orden.created_at), currentY, true);
            currentY = drawTableRow('Condición', orden.condicion || '-', currentY);
            currentY = drawTableRow('Asunto', orden.asunto || '-', currentY);
            currentY = drawTableRow('Estado', orden.estado || '-', currentY);

            // Líneas verticales para la tabla de información
            doc.moveTo(40, infoTableStartY)
               .lineTo(40, infoTableEndY + 13)
               .stroke(); // Borde izquierdo
            
            doc.moveTo(120, infoTableStartY)
               .lineTo(120, infoTableEndY + 13)
               .stroke(); // Separador columnas
            
            doc.moveTo(555, infoTableStartY)
               .lineTo(555, infoTableEndY + 13)
               .stroke(); // Borde derecho

            // Tabla de items - más compacta
            currentY += 15;
            
            // Encabezados de tabla de items
            const itemTableY = currentY;
            const colWidths = {
                bien: 160,
                centroCosto: 75,
                descripcion: 125,
                cantidad: 45,
                unidad: 45,
                medioPago: 65
            };

            // Línea superior
            doc.moveTo(40, itemTableY)
               .lineTo(555, itemTableY)
               .stroke();

            // Encabezados
            let xPos = 40;
            doc.fontSize(8)
               .font('Helvetica-Bold');
            
            doc.text('Bien', xPos + 5, itemTableY + 3, { width: colWidths.bien - 10, align: 'left' });
            xPos += colWidths.bien;
            
            doc.text('Centro de Costo', xPos + 5, itemTableY + 4, { width: colWidths.centroCosto - 10, align: 'left' });
            xPos += colWidths.centroCosto;
            
            doc.text('Descripción', xPos + 5, itemTableY + 4, { width: colWidths.descripcion - 10, align: 'left' });
            xPos += colWidths.descripcion;
            
            doc.text('Cantidad', xPos + 5, itemTableY + 4, { width: colWidths.cantidad - 10, align: 'right' });
            xPos += colWidths.cantidad;
            
            doc.text('Unidad', xPos + 5, itemTableY + 3, { width: colWidths.unidad - 10, align: 'center' });
            xPos += colWidths.unidad;

            doc.text('Medio Pago', xPos + 5, itemTableY + 3, { width: colWidths.medioPago - 10, align: 'center' });

            // Línea debajo de encabezados
            currentY = itemTableY + 14;
            doc.moveTo(40, currentY)
               .lineTo(555, currentY)
               .stroke();

            // Items
            doc.font('Helvetica');
            const itemsStartY = itemTableY;
            let itemsEndY = currentY;
            
            if (orden.items && orden.items.length > 0) {
                const totalesPorMoneda = {};

                orden.items.forEach((item, index) => {
                    currentY += 3;
                    
                    xPos = 40;
                    const rowStartY = currentY;
                    
                    // Preparar textos
                    const descripcion = item.descripcion || '';
                    const bienText = item.bien_nombre || '';
                    const centroCosto = item.centro_costo || '-';
                    const unidad = item.unidad_medida_nombre_lindo || item.unidad_medida_nombre || '-';
                    const medioPago = item.medio_pago || '-';
                    const cantidad = parseFloat(item.cantidad) || 0;
                    const moneda = String(item.moneda || 'ARS').toUpperCase();
                    const precioUnitario = parseFloat(item.precio_unitario) || 0;
                    const subtotal = cantidad * precioUnitario;

                    if (subtotal > 0) {
                        totalesPorMoneda[moneda] = (totalesPorMoneda[moneda] || 0) + subtotal;
                    }
                    
                    // Calcular altura real necesaria para cada campo usando heightOfString
                    doc.fontSize(7);
                    const bienHeight = doc.heightOfString(bienText, { 
                        width: colWidths.bien - 10 
                    });
                    const descripcionHeight = doc.heightOfString(descripcion, { 
                        width: colWidths.descripcion - 10 
                    });
                    const centroCostoHeight = doc.heightOfString(centroCosto, { 
                        width: colWidths.centroCosto - 10 
                    });
                    
                    // Altura real de la fila (la más alta + padding)
                    const rowHeight = Math.max(bienHeight, descripcionHeight, centroCostoHeight, 12) + 6;

                    // Bien (solo nombre, sin código)
                    doc.fontSize(7)
                       .text(bienText, xPos + 5, currentY, { 
                           width: colWidths.bien - 10, 
                           align: 'left',
                           lineBreak: true
                       });
                    xPos += colWidths.bien;

                    // Centro de Costo
                    doc.text(centroCosto, xPos + 5, currentY, { 
                        width: colWidths.centroCosto - 10, 
                        align: 'left'
                    });
                    xPos += colWidths.centroCosto;

                    // Descripción - sin limit de height
                    doc.text(descripcion, xPos + 5, currentY, { 
                        width: colWidths.descripcion - 10, 
                        align: 'left',
                        lineBreak: true
                    });
                    xPos += colWidths.descripcion;

                    // Cantidad
                    doc.text(cantidad.toLocaleString('es-AR', { 
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 3
                    }), xPos + 5, currentY, { 
                        width: colWidths.cantidad - 10, 
                        align: 'right'
                    });
                    xPos += colWidths.cantidad;

                    // Unidad
                    doc.text(unidad, xPos + 5, currentY, { 
                        width: colWidths.unidad - 10, 
                        align: 'center'
                    });
                    xPos += colWidths.unidad;

                    // Medio de Pago
                    doc.text(medioPago, xPos + 5, currentY, {
                        width: colWidths.medioPago - 10,
                        align: 'center'
                    });

                    currentY = rowStartY + rowHeight;

                    // Línea divisoria horizontal
                    doc.moveTo(40, currentY)
                       .lineTo(555, currentY)
                       .stroke();
                    
                    itemsEndY = currentY;
                });

                const aplicaAjustes = !!orden.contrafactura;
                const impuestos = aplicaAjustes ? (parseFloat(orden.impuestos) || 0) : 0;
                const descuento = aplicaAjustes ? (parseFloat(orden.descuento) || 0) : 0;
                const monedas = Object.keys(totalesPorMoneda);
                const monedaAjuste = monedas[0] || 'ARS';

                if (aplicaAjustes && (impuestos > 0 || descuento > 0)) {
                    totalesPorMoneda[monedaAjuste] = Math.max((totalesPorMoneda[monedaAjuste] || 0) + impuestos - descuento, 0);
                }

                if (aplicaAjustes) {
                    currentY = itemsEndY + 12;
                    doc.fontSize(8).font('Helvetica-Bold').text('Resumen de importes', 380, currentY, { width: 175, align: 'left' });
                    currentY += 13;
                    doc.font('Helvetica');
                    doc.text(`Impuestos: ${monedaAjuste} ${formatAmount(impuestos)}`, 380, currentY, { width: 175, align: 'left' });
                    currentY += 11;
                    doc.text(`Descuento: ${monedaAjuste} ${formatAmount(descuento)}`, 380, currentY, { width: 175, align: 'left' });
                    currentY += 11;
                    Object.entries(totalesPorMoneda).forEach(([moneda, total]) => {
                        doc.font('Helvetica-Bold').text(`Total ${moneda}: ${formatAmount(total)}`, 380, currentY, { width: 175, align: 'left' });
                        currentY += 11;
                    });
                }
            }

            // Líneas verticales para la tabla de items
            xPos = 40;
            
            // Borde izquierdo
            doc.moveTo(xPos, itemsStartY)
               .lineTo(xPos, itemsEndY)
               .stroke();
            xPos += colWidths.bien;
            
            // Separador después de Bien
            doc.moveTo(xPos, itemsStartY)
               .lineTo(xPos, itemsEndY)
               .stroke();
            xPos += colWidths.centroCosto;
            
            // Separador después de Centro de Costo
            doc.moveTo(xPos, itemsStartY)
               .lineTo(xPos, itemsEndY)
               .stroke();
            xPos += colWidths.descripcion;
            
            // Separador después de Descripción
            doc.moveTo(xPos, itemsStartY)
               .lineTo(xPos, itemsEndY)
               .stroke();
            xPos += colWidths.cantidad;
            
            // Separador después de Cantidad
            doc.moveTo(xPos, itemsStartY)
               .lineTo(xPos, itemsEndY)
               .stroke();
            xPos += colWidths.unidad;

            // Separador después de Unidad
            doc.moveTo(xPos, itemsStartY)
               .lineTo(xPos, itemsEndY)
               .stroke();
            xPos += colWidths.medioPago;
            
            // Borde derecho
            doc.moveTo(xPos, itemsStartY)
               .lineTo(xPos, itemsEndY)
               .stroke();

            // Finalizar documento
            doc.end();

            return doc;

        } catch (error) {
            console.error('Error al generar PDF:', error);
            throw error;
        }
    }
}

module.exports = new PDFOrdenCompraService();

module.exports = new PDFOrdenCompraService();
