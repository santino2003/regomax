const PDFDocument = require('pdfkit');
const ordenTrabajoRepository = require('../repositories/ordenTrabajoRepository');

class PDFOrdenTrabajoService {
    async generarPDF(ordenId) {
        const ordenTrabajo = await ordenTrabajoRepository.obtenerPorId(ordenId);

        if (!ordenTrabajo) {
            throw new Error('Orden de trabajo no encontrada');
        }

        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 40, bottom: 40, left: 40, right: 40 }
        });

        const pageLeft = doc.page.margins.left;
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        let currentY = doc.page.margins.top;

        doc.font('Helvetica').fontSize(14).text('Regomax S.A.', pageLeft, currentY);
        currentY += 30;
        doc.fontSize(22).text(`Orden de Trabajo ${ordenTrabajo.id}`, pageLeft, currentY);
        currentY += 38;

        currentY = this.drawInfoTable(doc, ordenTrabajo, pageLeft, currentY, pageWidth);
        currentY += 16;
        currentY = this.ensureSpace(doc, currentY, 17);
        currentY = this.drawRiskTable(doc, pageLeft, currentY, pageWidth);
        const signatureY = this.ensureSpace(doc, currentY + 42, 30);
        this.drawSignatureLines(doc, pageLeft, signatureY, pageWidth);

        doc.end();
        return doc;
    }

    drawInfoTable(doc, ordenTrabajo, x, y, width) {
        const labelWidth = 260;
        const valueWidth = width - labelWidth;
        const rows = [
            ['Descripción', ordenTrabajo.descripcion || ''],
            ['Mantenimiento', ordenTrabajo.mantenimiento || ''],
            ['Tipo', ordenTrabajo.tipo || ''],
            ['Máquina', ordenTrabajo.maquina || ''],
            ['Fecha Pedido', this.formatDate(ordenTrabajo.fecha_pedido)],
            ['Estado', ordenTrabajo.estado || ''],
            ['Fecha Terminada', this.formatDate(ordenTrabajo.fecha_terminada)]
        ];

        rows.forEach(([label, value]) => {
            doc.font('Helvetica').fontSize(10);
            const rowHeight = Math.max(
                doc.heightOfString(String(value), { width: valueWidth - 8 }) + 8,
                17
            );
            y = this.ensureSpace(doc, y, rowHeight);

            doc.rect(x, y, labelWidth, rowHeight).stroke();
            doc.rect(x + labelWidth, y, valueWidth, rowHeight).fillAndStroke('#e8eef8', '#222');

            doc.fillColor('#000')
                .font('Helvetica-Bold')
                .fontSize(10)
                .text(label, x + 4, y + 4, { width: labelWidth - 8 });

            doc.font('Helvetica')
                .text(String(value), x + labelWidth + 4, y + 4, { width: valueWidth - 8 });

            y += rowHeight;
        });

        return y;
    }

    drawRiskTable(doc, x, y, width) {
        const riskWidth = 200;
        const precautionWidth = width - riskWidth;
        const headerHeight = 17;

        const groups = [
            {
                riesgo: 'Precauciones Preliminares',
                precauciones: [
                    'Colocación de Matafuego en Forma Estratégica',
                    'Relevamiento General del Lugar',
                    'Realizar una Adecuada Señalización',
                    'Ubicación de Vehículos en forma Correcta'
                ]
            },
            {
                riesgo: 'Riesgo Mecánico',
                precauciones: [
                    'Utilizar Botines de Seguridad',
                    'Utilizar Casco de Seguridad',
                    'Utilizar Guantes Protectores',
                    'Utilizar Máscara Protectora',
                    'Utilizar Protector Ocular',
                    'Utilizar Ropa de Trabajo'
                ]
            },
            {
                riesgo: 'Riesgo Ergonómicos',
                precauciones: [
                    'Posiciones adecuadas para realizar esfuerzos',
                    'Utilizar herramientas adecuadas y en buen estado'
                ]
            },
            {
                riesgo: 'Riesgo Eléctrico',
                precauciones: [
                    'De Acuerdo a Norma',
                    'Puesta a Tierra de Equipos',
                    'Uso de Tablero Eléctrico con Disyuntor Diferencial'
                ]
            }
        ];

        doc.fontSize(9).font('Helvetica');
        y = this.drawRiskHeader(doc, x, y, riskWidth, precautionWidth, headerHeight);

        groups.forEach((group) => {
            const rowHeight = 18;
            const groupHeight = group.precauciones.length * rowHeight;

            if (this.exceedsPage(doc, y, groupHeight)) {
                doc.addPage();
                y = doc.page.margins.top;
                y = this.drawRiskHeader(doc, x, y, riskWidth, precautionWidth, headerHeight);
            }

            doc.rect(x, y, riskWidth, groupHeight).stroke();
            doc.font('Helvetica')
                .fillColor('#000')
                .text(group.riesgo, x + 4, y + (groupHeight / 2) - 5, { width: riskWidth - 8 });

            group.precauciones.forEach((precaucion, index) => {
                const rowY = y + (index * rowHeight);
                doc.rect(x + riskWidth, rowY, precautionWidth, rowHeight).stroke();
                doc.text(precaucion, x + riskWidth + 4, rowY + 4, { width: precautionWidth - 8 });
            });

            y += groupHeight;
        });

        return y;
    }

    drawRiskHeader(doc, x, y, riskWidth, precautionWidth, headerHeight) {
        y = this.ensureSpace(doc, y, headerHeight);

        doc.rect(x, y, riskWidth, headerHeight).fillAndStroke('#bed2ef', '#222');
        doc.rect(x + riskWidth, y, precautionWidth, headerHeight).fillAndStroke('#bed2ef', '#222');
        doc.fillColor('#000')
            .font('Helvetica-Bold')
            .fontSize(10)
            .text('Riesgos', x + 4, y + 4, { width: riskWidth - 8 })
            .text('Precauciones', x + riskWidth + 4, y + 4, { width: precautionWidth - 8 });

        return y + headerHeight;
    }

    ensureSpace(doc, y, neededHeight) {
        if (this.exceedsPage(doc, y, neededHeight)) {
            doc.addPage();
            return doc.page.margins.top;
        }

        return y;
    }

    exceedsPage(doc, y, neededHeight) {
        return y + neededHeight > doc.page.height - doc.page.margins.bottom;
    }

    drawSignatureLines(doc, x, y, width) {
        const gap = 25;
        const lineWidth = (width - (gap * 2)) / 3;
        const labels = ['Firma', 'Aclaración', 'Fecha'];

        doc.font('Helvetica').fontSize(10).fillColor('#000');

        labels.forEach((label, index) => {
            const lineX = x + (index * (lineWidth + gap));
            doc.moveTo(lineX, y)
                .lineTo(lineX + lineWidth, y)
                .strokeColor('#000')
                .stroke();
            doc.text(label, lineX, y + 6, { width: lineWidth, align: 'center' });
        });
    }

    formatDate(value) {
        if (!value) {
            return '';
        }

        return new Date(value).toLocaleDateString('es-AR');
    }
}

module.exports = new PDFOrdenTrabajoService();
