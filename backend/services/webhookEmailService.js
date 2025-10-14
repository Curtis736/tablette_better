// Service pour envoyer des emails via webhook HTTP (sans mot de passe)
const fetch = require('node-fetch');

class WebhookEmailService {
    constructor() {
        this.webhookUrl = process.env.EMAIL_WEBHOOK_URL;
        this.fallbackService = process.env.EMAIL_FALLBACK_SERVICE || 'log';
    }

    async sendEmail(emailData) {
        try {
            // Si un webhook est configuré, l'utiliser
            if (this.webhookUrl) {
                return await this.sendViaWebhook(emailData);
            }

            // Sinon, utiliser un service de fallback
            return await this.sendViaFallback(emailData);

        } catch (error) {
            console.error(' Erreur webhook email:', error);
            return { success: false, error: error.message };
        }
    }

    async sendViaWebhook(emailData) {
        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'SEDI-Tablette/1.0'
                },
                body: JSON.stringify({
                    to: emailData.to,
                    subject: emailData.subject,
                    html: emailData.html,
                    text: emailData.text,
                    from: 'SEDI Tablette <noreply@sedi-ati.com>',
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Email envoyé via webhook:', result);
                return { success: true, messageId: result.messageId || 'webhook-' + Date.now() };
            } else {
                throw new Error(`Webhook error: ${response.status} ${response.statusText}`);
            }

        } catch (error) {
            console.error(' Erreur webhook:', error);
            throw error;
        }
    }

    async sendViaFallback(emailData) {
        switch (this.fallbackService) {
            case 'emailjs':
                return await this.sendViaEmailJS(emailData);
            case 'formspree':
                return await this.sendViaFormspree(emailData);
            case 'sendgrid':
                return await this.sendViaSendGrid(emailData);
            case 'log':
                return this.logEmail(emailData);
            case 'file':
                return this.saveToFile(emailData);
            case 'console':
                return this.consoleEmail(emailData);
            default:
                return this.logEmail(emailData);
        }
    }

    // Envoi via EmailJS (service gratuit - VRAIS emails)
    async sendViaEmailJS(emailData) {
        try {
            const emailjsUrl = 'https://api.emailjs.com/api/v1.0/email/send';
            const serviceId = process.env.EMAILJS_SERVICE_ID;
            const templateId = process.env.EMAILJS_TEMPLATE_ID;
            const publicKey = process.env.EMAILJS_PUBLIC_KEY;

            if (!serviceId || !templateId || !publicKey) {
                console.log('⚠️ Configuration EmailJS manquante, utilisation du mode console');
                return this.consoleEmail(emailData);
            }

            const response = await fetch(emailjsUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    service_id: serviceId,
                    template_id: templateId,
                    user_id: publicKey,
                    template_params: {
                        to_email: emailData.to,
                        from_name: 'SEDI Tablette',
                        subject: emailData.subject,
                        message: emailData.text,
                        html_message: emailData.html
                    }
                })
            });

            if (response.ok) {
                console.log('✅ Email envoyé via EmailJS vers:', emailData.to);
                return { success: true, messageId: 'emailjs-' + Date.now() };
            } else {
                throw new Error(`EmailJS error: ${response.status}`);
            }

        } catch (error) {
            console.error('❌ Erreur EmailJS:', error);
            console.log('🔄 Fallback vers mode console');
            return this.consoleEmail(emailData);
        }
    }

    // Envoi via SendGrid (service gratuit - VRAIS emails)
    async sendViaSendGrid(emailData) {
        try {
            const sendgridUrl = 'https://api.sendgrid.com/v3/mail/send';
            const apiKey = process.env.SENDGRID_API_KEY;
            
            if (!apiKey) {
                console.log('⚠️ Clé API SendGrid manquante, utilisation du mode console');
                return this.consoleEmail(emailData);
            }

            const response = await fetch(sendgridUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    personalizations: [{
                        to: [{ email: emailData.to }],
                        subject: emailData.subject
                    }],
                    from: {
                        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@sedi-ati.com',
                        name: process.env.SENDGRID_FROM_NAME || 'SEDI Tablette'
                    },
                    content: [
                        {
                            type: 'text/plain',
                            value: emailData.text
                        },
                        {
                            type: 'text/html',
                            value: emailData.html
                        }
                    ]
                })
            });

            if (response.ok) {
                console.log('✅ Email envoyé via SendGrid vers:', emailData.to);
                return { success: true, messageId: 'sendgrid-' + Date.now() };
            } else {
                const errorText = await response.text();
                throw new Error(`SendGrid error: ${response.status} - ${errorText}`);
            }

        } catch (error) {
            console.error('❌ Erreur SendGrid:', error);
            console.log('🔄 Fallback vers mode console');
            return this.consoleEmail(emailData);
        }
    }

    // Envoi via Formspree (service gratuit - VRAIS emails)
    async sendViaFormspree(emailData) {
        try {
            const formspreeUrl = process.env.FORMSPREE_URL;
            
            if (!formspreeUrl) {
                console.log('⚠️ URL Formspree manquante, utilisation du mode console');
                return this.consoleEmail(emailData);
            }
            
            const response = await fetch(formspreeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: emailData.to,
                    subject: emailData.subject,
                    message: emailData.text,
                    _replyto: 'noreply@sedi-ati.com',
                    _cc: 'boutard@sedi-ati.com'
                })
            });

            if (response.ok) {
                console.log('✅ Email envoyé via Formspree vers:', emailData.to);
                return { success: true, messageId: 'formspree-' + Date.now() };
            } else {
                throw new Error(`Formspree error: ${response.status}`);
            }

        } catch (error) {
            console.error('❌ Erreur Formspree:', error);
            console.log('🔄 Fallback vers mode console');
            return this.consoleEmail(emailData);
        }
    }

    logEmail(emailData) {
        console.log(' [LOG] Email de commentaire:');
        console.log('  To:', emailData.to);
        console.log('  Subject:', emailData.subject);
        console.log('  Content:', emailData.text.substring(0, 200) + '...');
        console.log('  Timestamp:', new Date().toISOString());
        
        return { success: true, messageId: 'log-' + Date.now() };
    }

    async saveToFile(emailData) {
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            const emailDir = path.join(__dirname, '../logs/emails');
            await fs.mkdir(emailDir, { recursive: true });
            
            const filename = `email_${Date.now()}.json`;
            const filepath = path.join(emailDir, filename);
            
            const emailRecord = {
                timestamp: new Date().toISOString(),
                to: emailData.to,
                subject: emailData.subject,
                html: emailData.html,
                text: emailData.text
            };
            
            await fs.writeFile(filepath, JSON.stringify(emailRecord, null, 2));
            console.log('✅ Email sauvegardé dans:', filepath);
            
            return { success: true, messageId: 'file-' + Date.now() };
            
        } catch (error) {
            console.error(' Erreur sauvegarde fichier:', error);
            return { success: false, error: error.message };
        }
    }

    consoleEmail(emailData) {
        console.log('\n' + '='.repeat(80));
        console.log('📧 NOUVEAU COMMENTAIRE SEDI');
        console.log('='.repeat(80));
        console.log('To:', emailData.to);
        console.log('Subject:', emailData.subject);
        console.log('Time:', new Date().toLocaleString('fr-FR'));
        console.log('-'.repeat(80));
        console.log(emailData.text);
        console.log('='.repeat(80) + '\n');
        
        return { success: true, messageId: 'console-' + Date.now() };
    }
}

module.exports = new WebhookEmailService();
