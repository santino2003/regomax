const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // Configurar el transporter con las credenciales de tu servidor de email
        const port = parseInt(process.env.EMAIL_PORT) || 587;
        
        console.log('🔧 Configurando EmailService:', {
            host: process.env.EMAIL_HOST,
            port: port,
            user: process.env.EMAIL_USER,
            hasPassword: !!process.env.EMAIL_PASS
        });
        
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: port,
            secure: port === 465, // true para puerto 465 (SSL directo)
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        this.fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
        // EMAIL_ALERT_TO puede ser múltiples emails separados por coma
        this.defaultToEmails = process.env.EMAIL_ALERT_TO && process.env.EMAIL_ALERT_TO !== 'null'
            ? process.env.EMAIL_ALERT_TO.split(',').map(email => email.trim())
            : [];
    }

    /**
     * Verificar conexión con el servidor de email
     */
    async verificarConexion() {
        try {
            await this.transporter.verify();
            console.log('✅ Servidor de email listo para enviar mensajes');
            return true;
        } catch (error) {
            console.error('❌ Error al conectar con el servidor de email:', error);
            return false;
        }
    }

    /**
     * Parsear lista de destinatarios
     * Acepta: string separado por comas, array de strings, o mezcla
     */
    parseDestinatarios(destinatarios) {
        if (!destinatarios || destinatarios.length === 0) {
            return this.defaultToEmails;
        }

        let emails = [];
        
        if (Array.isArray(destinatarios)) {
            emails = destinatarios;
        } else if (typeof destinatarios === 'string') {
            emails = destinatarios.split(',').map(email => email.trim());
        }

        // Filtrar emails vacíos y validar formato básico
        emails = emails.filter(email => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return email && emailRegex.test(email);
        });

        // Si no hay emails válidos, usar los por defecto
        return emails.length > 0 ? emails : this.defaultToEmails;
    }

    /**
     * Enviar email de alerta de stock crítico
     * @param {Object} bien - Datos del bien
     * @param {String|Array} destinatarios - Email(s) destinatario(s). Puede ser string separado por comas o array
     */
    async enviarAlertaStockCritico(bien, destinatarios = null) {
        try {
            console.log('📧 Intentando enviar alerta de stock crítico:', {
                bien: bien.nombre,
                destinatarios: destinatarios
            });
            
            const toEmails = this.parseDestinatarios(destinatarios);
            
            if (toEmails.length === 0) {
                console.warn('⚠️ No hay destinatarios configurados para enviar email de stock crítico');
                return { success: false, message: 'No hay destinatarios configurados' };
            }

            console.log('📧 Destinatarios parseados:', toEmails);

            const asunto = `⚠️ ALERTA: Stock Crítico - ${bien.nombre}`;
            
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #f9f9f9;
                        }
                        .header {
                            background-color: #dc3545;
                            color: white;
                            padding: 20px;
                            text-align: center;
                            border-radius: 5px 5px 0 0;
                        }
                        .content {
                            background-color: white;
                            padding: 30px;
                            border-radius: 0 0 5px 5px;
                        }
                        .alert-box {
                            background-color: #fff3cd;
                            border-left: 4px solid #ffc107;
                            padding: 15px;
                            margin: 20px 0;
                        }
                        .info-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 20px 0;
                        }
                        .info-table td {
                            padding: 10px;
                            border-bottom: 1px solid #ddd;
                        }
                        .info-table td:first-child {
                            font-weight: bold;
                            width: 40%;
                        }
                        .stock-critico {
                            color: #dc3545;
                            font-weight: bold;
                            font-size: 1.2em;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 20px;
                            padding: 20px;
                            color: #666;
                            font-size: 0.9em;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>⚠️ Alerta de Stock Crítico</h1>
                        </div>
                        <div class="content">
                            <p>El siguiente bien ha alcanzado o está por debajo de su nivel de stock crítico:</p>
                            
                            <table class="info-table">
                                <tr>
                                    <td>Código:</td>
                                    <td><strong>${bien.codigo}</strong></td>
                                </tr>
                                <tr>
                                    <td>Nombre:</td>
                                    <td><strong>${bien.nombre}</strong></td>
                                </tr>
                                <tr>
                                    <td>Tipo:</td>
                                    <td>${bien.tipo}</td>
                                </tr>
                                <tr>
                                    <td>Categoría:</td>
                                    <td>${bien.categoria_nombre || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td>Familia:</td>
                                    <td>${bien.familia_nombre || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td>Stock Actual:</td>
                                    <td><span class="stock-critico">${bien.cantidad_stock} ${bien.unidad_medida_abreviatura || ''}</span></td>
                                </tr>
                                <tr>
                                    <td>Nivel Crítico:</td>
                                    <td>${bien.cantidad_critica} ${bien.unidad_medida_abreviatura || ''}</td>
                                </tr>
                                ${bien.almacen_nombre ? `
                                <tr>
                                    <td>Ubicación:</td>
                                    <td>${bien.almacen_nombre}${bien.ubicacion ? ` - ${bien.ubicacion}` : ''}</td>
                                </tr>
                                ` : ''}
                            </table>
                            
                            <div class="alert-box">
                                <strong>⚠️ Acción requerida:</strong> Es necesario reponer el stock de este bien lo antes posible.
                            </div>
                            
                            ${bien.proveedores && bien.proveedores.length > 0 ? `
                                <h3>Proveedores disponibles:</h3>
                                <ul>
                                    ${bien.proveedores.map(p => `<li>${p.nombre} - ${p.telefono || p.email || ''}</li>`).join('')}
                                </ul>
                            ` : ''}
                            
                            <p style="margin-top: 30px;">
                                <a href="${process.env.APP_URL || 'http://localhost:3000'}/bienes/${bien.id}" 
                                   style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                    Ver Detalles del Bien
                                </a>
                            </p>
                        </div>
                        <div class="footer">
                            <p>Sistema de Gestión Regomax</p>
                            <p>Este es un mensaje automático, por favor no responder.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            console.log('📧 Enviando email...');
            
            const info = await this.transporter.sendMail({
                from: `"Sistema Regomax" <${this.fromEmail}>`,
                to: toEmails.join(', '), // Múltiples destinatarios
                subject: asunto,
                html: html
            });

            console.log(`✅ Email de stock crítico enviado exitosamente`);
            console.log(`   Destinatarios: ${toEmails.join(', ')}`);
            console.log(`   Message ID: ${info.messageId}`);
            
            return {
                success: true,
                messageId: info.messageId,
                destinatarios: toEmails
            };
        } catch (error) {
            console.error('❌ Error al enviar email de stock crítico:', {
                error: error.message,
                code: error.code,
                command: error.command
            });
            throw error;
        }
    }
}

module.exports = new EmailService();
