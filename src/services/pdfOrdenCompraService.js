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
                bien: 200,
                centroCosto: 85,
                descripcion: 140,
                cantidad: 45,
                precio: 45
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
            
            doc.text('Precio', xPos + 5, itemTableY + 3, { width: colWidths.precio - 10, align: 'right' });

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
                orden.items.forEach((item, index) => {
                    currentY += 3;
                    
                    xPos = 40;
                    const rowHeight = 22;

                    // Bien (código + nombre) - texto más pequeño
                    const bienText = `${item.bien_codigo || ''} - ${item.bien_nombre || ''}`;
                    doc.fontSize(7)
                       .text(bienText, xPos + 5, currentY, { 
                           width: colWidths.bien - 10, 
                           align: 'left',
                           height: rowHeight,
                           lineBreak: true
                       });
                    xPos += colWidths.bien;

                    // Centro de Costo
                    doc.text(item.centro_costo || '-', xPos + 5, currentY, { 
                        width: colWidths.centroCosto - 10, 
                        align: 'left',
                        height: rowHeight
                    });
                    xPos += colWidths.centroCosto;

                    // Descripción
                    doc.text(item.descripcion || '', xPos + 5, currentY, { 
                        width: colWidths.descripcion - 10, 
                        align: 'left',
                        height: rowHeight,
                        lineBreak: true
                    });
                    xPos += colWidths.descripcion;

                    // Cantidad
                    const cantidad = parseFloat(item.cantidad) || 0;
                    doc.text(cantidad.toLocaleString('es-AR', { 
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 3
                    }), xPos + 5, currentY, { 
                        width: colWidths.cantidad - 10, 
                        align: 'right',
                        height: rowHeight
                    });
                    xPos += colWidths.cantidad;

                    // Precio
                    const precio = parseFloat(item.precio_sugerido) || 0;
                    doc.text(precio.toLocaleString('es-AR', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }), xPos + 5, currentY, { 
                        width: colWidths.precio - 10, 
                        align: 'right',
                        height: rowHeight
                    });

                    currentY += rowHeight;

                    // Línea divisoria horizontal
                    doc.moveTo(40, currentY)
                       .lineTo(555, currentY)
                       .stroke();
                    
                    itemsEndY = currentY;
                });
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
            xPos += colWidths.precio;
            
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
