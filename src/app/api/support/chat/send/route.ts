import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { text, visitorId, chatId } = await req.json();

        if (!text || !visitorId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const apiUrl = process.env.EVOLUTION_API_URL;
        const apiKey = process.env.EVOLUTION_API_KEY;
        const instance = process.env.WhatsApp_INSTANCE_NAME;
        const groupId = process.env.WhatsApp_GROUP_ID;

        if (!apiUrl || !apiKey || !instance || !groupId || apiUrl.includes('votre-serveur.com')) {
            console.warn('WhatsApp integration skipped: invalid or missing configuration');
            // Return success to client so the UI doesn't show an error
            return NextResponse.json({
                success: true,
                message: 'Message saved but WhatsApp notification skipped (configuration missing)',
                warning: 'WhatsApp integration not configured'
            });
        }

        // Format du message pour l'admin
        const message = `*Nouveau message de Gérecole*\n\n*Visiteur:* ${visitorId}\n*Session:* ${chatId || 'New'}\n\n*Message:* ${text}`;

        const response = await fetch(`${apiUrl}/message/sendText/${instance}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey
            },
            body: JSON.stringify({
                number: groupId,
                options: {
                    delay: 1200,
                    presence: 'composing',
                    linkPreview: false
                },
                textMessage: {
                    text: message
                }
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(`Evolution API error: ${JSON.stringify(result)}`);
        }

        return NextResponse.json({ success: true, messageId: result.key?.id });
    } catch (error: any) {
        console.error('Error sending WhatsApp message:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
