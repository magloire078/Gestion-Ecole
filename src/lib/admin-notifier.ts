import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { formatCurrency } from './currency-utils';

export const ADMIN_NOTIFICATION_PHONE = process.env.ADMIN_NOTIFICATION_PHONE || '+2250707942880';

export interface SubscriptionNotificationData {
    schoolName: string;
    schoolId: string;
    planName: string;
    durationMonths: number;
    paymentProvider: string;
    amountPaid?: number;
    currency?: string;
    directorName?: string;
    directorEmail?: string;
    directorPhone?: string;
}

export interface NewSchoolNotificationData {
    schoolName: string;
    schoolId: string;
    schoolCode: string;
    directorName: string;
    directorEmail: string;
    directorPhone?: string;
    country?: string;
    address?: string;
}

/**
 * Envoie un message WhatsApp / SMS vers l'administrateur (+225 0707942880)
 */
export async function sendAdminWhatsAppMessage(message: string): Promise<{ success: boolean; channel?: string; error?: string }> {
    const cleanPhone = ADMIN_NOTIFICATION_PHONE.replace(/[^0-9+]/g, '');
    const phoneNoPlus = cleanPhone.replace(/^\+/, '');

    console.log(`[AdminNotifier] Dispatching notification to ${cleanPhone}...`);

    let sent = false;
    let channel = 'none';

    // 1. Essai via Custom Webhook (Zapier, Make, n8n, CallMeBot, Whapi, etc.)
    let webhookUrl = process.env.ADMIN_WHATSAPP_WEBHOOK_URL || process.env.ADMIN_NOTIFICATION_WEBHOOK_URL;
    
    // Si pas de variable d'env, vérifier dans Firestore system_settings/default
    if (!webhookUrl) {
        try {
            const settingsSnap = await getAdminDb().doc('system_settings/default').get();
            if (settingsSnap.exists) {
                webhookUrl = settingsSnap.data()?.adminWebhookUrl;
            }
        } catch (dbErr) {
            console.warn('[AdminNotifier] Could not read system_settings for webhook:', dbErr);
        }
    }

    if (webhookUrl && webhookUrl.startsWith('http')) {
        try {
            const resp = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: cleanPhone,
                    phoneFormatted: phoneNoPlus,
                    message,
                    timestamp: new Date().toISOString(),
                    service: 'GereEcole'
                }),
            });
            if (resp.ok) {
                console.log('[AdminNotifier] Notification sent via custom WhatsApp Webhook.');
                sent = true;
                channel = 'webhook';
            } else {
                console.warn('[AdminNotifier] Webhook returned status:', resp.status);
            }
        } catch (webhookErr) {
            console.error('[AdminNotifier] Error sending via Webhook:', webhookErr);
        }
    }

    // 2. Essai via Evolution API (si configuré)
    if (!sent) {
        const evoUrl = process.env.EVOLUTION_API_URL;
        const evoKey = process.env.EVOLUTION_API_KEY;
        const evoInstance = process.env.WhatsApp_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE_NAME;

        if (evoUrl && evoKey && evoInstance && !evoUrl.includes('votre-serveur.com')) {
            try {
                const targetNumber = phoneNoPlus;
                const resp = await fetch(`${evoUrl}/message/sendText/${evoInstance}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': evoKey
                    },
                    body: JSON.stringify({
                        number: targetNumber,
                        options: {
                            delay: 1000,
                            presence: 'composing',
                            linkPreview: false
                        },
                        textMessage: {
                            text: message
                        }
                    })
                });

                if (resp.ok) {
                    console.log('[AdminNotifier] WhatsApp message sent via Evolution API.');
                    sent = true;
                    channel = 'evolution-api';
                } else {
                    const errData = await resp.text();
                    console.warn('[AdminNotifier] Evolution API returned error:', errData);
                }
            } catch (evoErr) {
                console.error('[AdminNotifier] Evolution API send error:', evoErr);
            }
        }
    }

    // 3. Essai via Twilio WhatsApp / SMS (si configuré)
    if (!sent) {
        const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
        const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
        const twilioFrom = process.env.TWILIO_WHATSAPP_FROM?.trim() || process.env.TWILIO_PHONE_NUMBER?.trim();

        if (accountSid && authToken && twilioFrom) {
            try {
                const isWhatsApp = twilioFrom.startsWith('whatsapp:');
                const to = isWhatsApp ? `whatsapp:${cleanPhone}` : cleanPhone;
                const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
                const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

                const params = new URLSearchParams();
                params.append('To', to);
                params.append('From', twilioFrom);
                params.append('Body', message);

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: params.toString(),
                });

                if (response.ok) {
                    console.log(`[AdminNotifier] Message sent via Twilio (${isWhatsApp ? 'WhatsApp' : 'SMS'}).`);
                    sent = true;
                    channel = isWhatsApp ? 'twilio-whatsapp' : 'twilio-sms';
                } else {
                    const twilioErr = await response.json();
                    console.warn('[AdminNotifier] Twilio returned error:', twilioErr);
                }
            } catch (twilioErr) {
                console.error('[AdminNotifier] Twilio send exception:', twilioErr);
            }
        }
    }

    // 4. Enregistrement Firestore pour historique permanent
    try {
        await getAdminDb().collection('admin_notifications').add({
            phone: cleanPhone,
            message,
            channel: sent ? channel : 'simulated-console',
            status: sent ? 'SENT' : 'LOGGED',
            createdAt: FieldValue.serverTimestamp(),
        });
    } catch (dbErr) {
        console.error('[AdminNotifier] Error logging notification to Firestore:', dbErr);
    }

    return { success: sent, channel };
}

/**
 * Notifie l'administrateur d'un paiement ou renouvellement d'abonnement
 */
export async function notifyAdminSubscriptionPayment(data: SubscriptionNotificationData): Promise<void> {
    const formattedAmount = data.amountPaid ? formatCurrency(data.amountPaid) : 'N/A';
    const duration = `${data.durationMonths} mois`;

    const message = `🎉 *NOUVEL ABONNEMENT PAYÉ !* 🎉\n\n` +
        `🏫 *École:* ${data.schoolName}\n` +
        `📦 *Plan:* ${data.planName}\n` +
        `⏳ *Durée:* ${duration}\n` +
        `💰 *Montant:* ${formattedAmount} (${data.paymentProvider})\n` +
        (data.directorName ? `👤 *Directeur:* ${data.directorName}\n` : '') +
        (data.directorPhone ? `📞 *Contact:* ${data.directorPhone}\n` : '') +
        (data.directorEmail ? `✉️ *Email:* ${data.directorEmail}\n` : '') +
        `\n📅 *Date:* ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n` +
        `🚀 _Notification automatique GèreEcole_`;

    try {
        await sendAdminWhatsAppMessage(message);
    } catch (err) {
        console.error('[AdminNotifier] Failed to notify admin for subscription:', err);
    }
}

/**
 * Notifie l'administrateur lors de l'inscription d'une nouvelle école
 */
export async function notifyAdminNewSchool(data: NewSchoolNotificationData): Promise<void> {
    const message = `🆕 *NOUVELLE ÉCOLE INSCRITE !* 🏫\n\n` +
        `🏛️ *Nom:* ${data.schoolName}\n` +
        `🔑 *Code École:* ${data.schoolCode}\n` +
        `👤 *Directeur:* ${data.directorName}\n` +
        `✉️ *Email:* ${data.directorEmail}\n` +
        (data.directorPhone ? `📞 *Téléphone:* ${data.directorPhone}\n` : '') +
        (data.country ? `🌍 *Pays:* ${data.country}\n` : '') +
        (data.address ? `📍 *Adresse:* ${data.address}\n` : '') +
        `\n📅 *Date:* ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n` +
        `✨ _Un nouvel établissement a rejoint la plateforme GèreEcole !_`;

    try {
        await sendAdminWhatsAppMessage(message);
    } catch (err) {
        console.error('[AdminNotifier] Failed to notify admin for new school:', err);
    }
}
