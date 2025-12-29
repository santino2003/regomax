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
<body style="font-family:Arial,sans-serif">
    <h2 style="color:#dc3545">⚠️ Alerta de Stock Crítico</h2>
    <p><strong>${bien.nombre}</strong> alcanzó el nivel crítico.</p>

    <ul>
        <li>Código: ${bien.codigo}</li>
        <li>Stock actual: <strong>${bien.cantidad_stock}</strong></li>
        <li>Nivel crítico: ${bien.cantidad_critica}</li>
    </ul>

    <a href="${process.env.APP_URL}/bienes/${bien.id}"
       style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none">
        Ver detalle
    </a>

    <p style="margin-top:20px;color:#666">
        Sistema de Gestión Regomax
    </p>
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
