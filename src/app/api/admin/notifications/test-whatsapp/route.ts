import { NextRequest, NextResponse } from 'next/server';
import { sendAdminWhatsAppMessage, ADMIN_NOTIFICATION_PHONE } from '@/lib/admin-notifier';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const phone = body.phone || ADMIN_NOTIFICATION_PHONE;

        const testMessage = `🧪 *TEST DE NOTIFICATION GÈREECOLE* 🚀\n\n` +
            `Bonjour !\nCeci est un message de confirmation envoyé avec succès vers votre numéro *${phone}*.\n\n` +
            `✅ Vous recevrez désormais instantanément :\n` +
            `• Les paiements & nouveaux abonnements\n` +
            `• Les nouvelles inscriptions d'écoles\n` +
            `• Les alertes d'activité importantes\n\n` +
            `📅 _Envoyé le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}_`;

        const result = await sendAdminWhatsAppMessage(testMessage);

        return NextResponse.json({
            success: true,
            recipient: phone,
            channel: result.channel,
            message: `Notification envoyée vers ${phone} (canal: ${result.channel})`
        });
    } catch (error: any) {
        console.error('[API test-whatsapp] Error:', error);
        return NextResponse.json({ error: error.message || 'Erreur d\'envoi' }, { status: 500 });
    }
}
