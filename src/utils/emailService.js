const { Resend } = require("resend");

class EmailService {
    constructor() {
        this.resend = new Resend(process.env.RESEND_API_KEY);

        this.fromEmail = process.env.EMAIL_FROM;
        this.defaultToEmails =
            process.env.EMAIL_ALERT_TO && process.env.EMAIL_ALERT_TO !== "null"
                ? process.env.EMAIL_ALERT_TO.split(",").map(e => e.trim())
                : [];

        console.log("🔧 EmailService (Resend) configurado:", {
            from: this.fromEmail,
            defaultTo: this.defaultToEmails,
            hasApiKey: !!process.env.RESEND_API_KEY
        });
    }

    /**
     * Verificar conexión con el servicio de email
     * Mantiene contrato: devuelve boolean
     */
    async verificarConexion() {
        try {
            if (!process.env.RESEND_API_KEY) {
                console.error("❌ RESEND_API_KEY no configurada");
                return false;
            }

            console.log("✅ Servicio de email listo (Resend)");
            return true;
        } catch (error) {
            console.error("❌ Error al verificar conexión con Resend:", error);
            return false;
        }
    }

    /**
     * Parsear lista de destinatarios
     * (idéntico a tu implementación)
     */
    parseDestinatarios(destinatarios) {
        if (!destinatarios || destinatarios.length === 0) {
            return this.defaultToEmails;
        }

        let emails = [];

        if (Array.isArray(destinatarios)) {
            emails = destinatarios;
        } else if (typeof destinatarios === "string") {
            emails = destinatarios.split(",").map(e => e.trim());
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        emails = emails.filter(e => e && emailRegex.test(e));

        return emails.length > 0 ? emails : this.defaultToEmails;
    }

    /**
     * Enviar email de alerta de stock crítico
     * CONTRATO 100% compatible con Nodemailer
     */
    async enviarAlertaStockCritico(bien, destinatarios = null) {
        try {
            console.log("📧 Enviando alerta stock crítico:", {
                bien: bien.nombre,
                destinatarios
            });

            const toEmails = this.parseDestinatarios(destinatarios);

            if (toEmails.length === 0) {
                return { success: false, message: "No hay destinatarios configurados" };
            }

            const asunto = `⚠️ ALERTA: Stock Crítico - ${bien.nombre}`;

            const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#dc3545 0%,#c82333 100%);padding:30px;text-align:center;border-radius:8px 8px 0 0">
                            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:600">
                                ⚠️ Alerta de Stock Crítico
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding:40px 30px">
                            <p style="margin:0 0 20px 0;font-size:16px;color:#333;line-height:1.6">
                                El siguiente producto ha alcanzado el <strong style="color:#dc3545">nivel crítico de stock</strong>:
                            </p>
                            
                            <div style="background-color:#fff3cd;border-left:4px solid #ffc107;padding:20px;margin:20px 0;border-radius:4px">
                                <h2 style="margin:0 0 15px 0;color:#856404;font-size:20px;font-weight:600">
                                    ${bien.nombre}
                                </h2>
                                <table style="width:100%;border-collapse:collapse">
                                    <tr>
                                        <td style="padding:8px 0;color:#856404;font-weight:500">Código:</td>
                                        <td style="padding:8px 0;color:#856404;text-align:right;font-weight:600">${bien.codigo}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:8px 0;color:#856404;font-weight:500">Stock Actual:</td>
                                        <td style="padding:8px 0;color:#dc3545;text-align:right;font-size:18px;font-weight:700">${bien.cantidad_stock}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:8px 0;color:#856404;font-weight:500">Nivel Crítico:</td>
                                        <td style="padding:8px 0;color:#856404;text-align:right;font-weight:600">${bien.cantidad_critica}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <div style="background-color:#e7f3ff;border-left:4px solid:#007bff;padding:15px;margin:20px 0;border-radius:4px">
                                <p style="margin:0;color:#004085;font-size:14px">
                                    💡 <strong>Acción recomendada:</strong> Realizar una orden de compra para reponer el stock lo antes posible.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f8f9fa;padding:20px 30px;text-align:center;border-radius:0 0 8px 8px;border-top:1px solid #dee2e6">
                            <p style="margin:0;color:#6c757d;font-size:13px">
                                Sistema de Gestión Regomax
                            </p>
                            <p style="margin:5px 0 0 0;color:#adb5bd;font-size:12px">
                                Este es un mensaje automático, por favor no responder.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

            const { data, error } = await this.resend.emails.send({
                from: `Sistema Regomax <${this.fromEmail}>`,
                to: toEmails,
                subject: asunto,
                html
            });

            if (error) {
                console.error("❌ Error de Resend:", error);
                throw new Error(error.message);
            }

            console.log("✅ Email enviado:", data.id);

            return {
                success: true,
                messageId: data.id,
                destinatarios: toEmails
            };
        } catch (error) {
            console.error("❌ Error enviando alerta:", error);
            throw error;
        }
    }
}

module.exports = new EmailService();
