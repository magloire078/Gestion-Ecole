import { sendSMS } from '@/lib/sms';

/**
 * Acheminement du code de vérification.
 *
 * WhatsApp d'abord, SMS en repli. Ce choix est dicté par le marché : en Afrique de
 * l'Ouest, WhatsApp est quasi universel et l'envoi coûte une fraction d'un SMS, tandis
 * que l'acheminement des SMS internationaux y est inégal. Le SMS reste indispensable en
 * repli, pour les utilisateurs sans WhatsApp.
 */

export type DeliveryChannel = 'whatsapp' | 'sms' | 'none';

function messageFor(code: string): string {
  return `Votre code de vérification GèreEcole est : ${code}\n\nIl expire dans 10 minutes. Ne le communiquez à personne.`;
}

/**
 * Envoie un texte WhatsApp via Evolution API.
 *
 * Reprend la configuration déjà utilisée par `/api/support/chat/send`, mais adresse le
 * message à un numéro plutôt qu'au groupe de support.
 */
async function sendWhatsApp(phone: string, text: string): Promise<boolean> {
  const apiUrl = process.env.EVOLUTION_API_URL?.trim();
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();
  const instance = process.env.WhatsApp_INSTANCE_NAME?.trim();

  if (!apiUrl || !apiKey || !instance || apiUrl.includes('votre-serveur.com')) {
    console.warn('[OtpDelivery] WhatsApp non configuré, repli sur le SMS.');
    return false;
  }

  try {
    // Evolution attend le numéro sans le « + ».
    const number = phone.replace(/^\+/, '');

    const response = await fetch(`${apiUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({
        number,
        options: { delay: 0, presence: 'composing', linkPreview: false },
        textMessage: { text },
      }),
    });

    if (!response.ok) {
      console.error('[OtpDelivery] Evolution API a répondu', response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[OtpDelivery] Envoi WhatsApp échoué :', error);
    return false;
  }
}

/**
 * Achemine le code et renvoie le canal effectivement utilisé.
 *
 * Le canal est renvoyé pour la journalisation serveur ; ne pas l'exposer au client, il
 * indiquerait si le numéro possède ou non WhatsApp.
 */
export async function deliverCode(phone: string, code: string): Promise<DeliveryChannel> {
  const text = messageFor(code);

  if (await sendWhatsApp(phone, text)) return 'whatsapp';

  // `sendSMS` journalise sous une école ; à la création de compte aucune n'existe encore,
  // d'où ce conteneur dédié aux envois hors périmètre scolaire.
  if (await sendSMS(phone, text, SYSTEM_LOG_SCOPE)) return 'sms';

  return 'none';
}

/** Espace de journalisation des envois non rattachés à une école. */
export const SYSTEM_LOG_SCOPE = '_system';
