/**
 * Service de conversations 1-1 entre super-administrateur et école.
 *
 * Modèle de données :
 * - `school_conversations/{schoolId}` : doc d'index par école
 *     - schoolId, schoolName
 *     - lastMessage: { text, senderRole, at }
 *     - unreadByAdmin, unreadByDirector (compteurs)
 *     - updatedAt
 * - `school_conversations/{schoolId}/messages/{messageId}` : messages
 *     - senderId, senderName, senderRole ('admin' | 'director'), text, createdAt
 */
import {
    Firestore,
    addDoc,
    collection,
    doc,
    getDoc,
    increment,
    serverTimestamp,
    setDoc,
    updateDoc,
} from 'firebase/firestore';

export type ConversationSenderRole = 'admin' | 'director';

export interface SchoolConversationDoc {
    schoolId: string;
    schoolName?: string;
    lastMessage?: {
        text: string;
        senderRole: ConversationSenderRole;
        at: any;
    };
    unreadByAdmin: number;
    unreadByDirector: number;
    updatedAt: any;
}

export interface ConversationMessageDoc {
    senderId: string;
    senderName: string;
    senderRole: ConversationSenderRole;
    text: string;
    createdAt: any;
}

interface SendArgs {
    firestore: Firestore;
    schoolId: string;
    schoolName?: string;
    senderId: string;
    senderName: string;
    senderRole: ConversationSenderRole;
    text: string;
}

export async function sendConversationMessage({
    firestore,
    schoolId,
    schoolName,
    senderId,
    senderName,
    senderRole,
    text,
}: SendArgs): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Message vide.');
    if (!schoolId) throw new Error('schoolId requis.');

    const convoRef = doc(firestore, 'school_conversations', schoolId);
    const messagesRef = collection(convoRef, 'messages');

    await addDoc(messagesRef, {
        senderId,
        senderName,
        senderRole,
        text: trimmed,
        createdAt: serverTimestamp(),
    } as ConversationMessageDoc);

    const existing = await getDoc(convoRef);
    const incrementField = senderRole === 'admin'
        ? 'unreadByDirector'
        : 'unreadByAdmin';

    if (existing.exists()) {
        await updateDoc(convoRef, {
            schoolName: schoolName ?? existing.data().schoolName ?? null,
            lastMessage: {
                text: trimmed,
                senderRole,
                at: serverTimestamp(),
            },
            updatedAt: serverTimestamp(),
            [incrementField]: increment(1),
        });
    } else {
        await setDoc(convoRef, {
            schoolId,
            schoolName: schoolName ?? null,
            lastMessage: {
                text: trimmed,
                senderRole,
                at: serverTimestamp(),
            },
            unreadByAdmin: senderRole === 'director' ? 1 : 0,
            unreadByDirector: senderRole === 'admin' ? 1 : 0,
            updatedAt: serverTimestamp(),
        } as SchoolConversationDoc);
    }
}

export async function markConversationRead(
    firestore: Firestore,
    schoolId: string,
    viewerRole: ConversationSenderRole,
): Promise<void> {
    const convoRef = doc(firestore, 'school_conversations', schoolId);
    const existing = await getDoc(convoRef);
    if (!existing.exists()) return;
    const field = viewerRole === 'admin' ? 'unreadByAdmin' : 'unreadByDirector';
    if ((existing.data() as any)[field] === 0) return;
    await updateDoc(convoRef, { [field]: 0 });
}
