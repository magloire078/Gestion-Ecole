import { NextRequest, NextResponse } from 'next/server';
import { firebaseFirestore } from '@/firebase/config';
import { doc, updateDoc, arrayUnion, query, collection, where, getDocs, limit, serverTimestamp, Firestore } from 'firebase/firestore';

const db = firebaseFirestore as Firestore;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 1. Validation basique (Evolution API envoie 'MESSAGES_UPSERT')
        if (body.event !== 'MESSAGES_UPSERT') {
            return NextResponse.json({ status: 'ignored' });
        }

        const messageData = body.data;
        const fromMe = messageData.key?.fromMe;
        const remoteJid = messageData.key?.remoteJid;
        const text = messageData.message?.extendedTextMessage?.text || messageData.message?.conversation;

        // On n'écoute que les messages qui ne viennent pas du bot lui-même
        if (fromMe || !text) {
            return NextResponse.json({ status: 'ignored' });
        }

        // 2. Extraire l'ID du chat depuis le message cité (Quoted Message)
        // La structure d'Evolution API pour le message cité :
        const quotedMessage = messageData.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMessage?.conversation || quotedMessage?.extendedTextMessage?.text || "";

        // Si le message cité contient "Session: [CHAT_ID]"
        const chatIdMatch = quotedText.match(/Session:\s*([a-zA-Z0-9_-]+)/);
        let chatId = chatIdMatch ? chatIdMatch[1] : null;

        if (!chatId) {
            // Fallback : On cherche la dernière session active pour ce groupe/numéro si possible,
            // mais l'approche par citation est plus précise.
            console.warn("Could not find chatId in quoted message");
            return NextResponse.json({ status: 'no_context' });
        }

        // 3. Mettre à jour Firestore
        const chatRef = doc(db, 'visitor_chats', chatId);

        const adminMessage = {
            role: 'bot', // On affiche les réponses admin comme le bot ou un "Conseiller"
            text: text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fromWhatsApp: true
        };

        await updateDoc(chatRef, {
            messages: arrayUnion(adminMessage),
            lastMessageAt: serverTimestamp(),
            status: 'active'
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('WhatsApp Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
