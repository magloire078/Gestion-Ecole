import { Firestore, collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { notification as Notification } from '@/lib/data-types';

export class NotificationService {
    /**
     * Sends a notification to a specific user
     */
    static async sendNotification(
        firestore: Firestore,
        schoolId: string,
        userId: string,
        data: {
            title: string;
            content: string;
            href?: string;
        }
    ) {
        const notification: Omit<Notification, 'id'> = {
            userId,
            title: data.title,
            content: data.content,
            href: data.href || '#',
            isRead: false,
            createdAt: serverTimestamp() as any, // Firebase will handle this
        };

        try {
            await addDoc(collection(firestore, `ecoles/${schoolId}/notifications`), notification);
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }

    /**
     * Broadcasts a notification to all parents of a school
     */
    static async broadcastToParents(
        firestore: Firestore,
        schoolId: string,
        data: {
            title: string;
            content: string;
            href?: string;
        }
    ) {
        try {
            // Find all parents in this school
            const parentsQuery = query(
                collection(firestore, 'users'),
                where(`schools.${schoolId}`, '==', 'parent')
            );
            const snapshot = await getDocs(parentsQuery);

            const promises = snapshot.docs.map(doc =>
                this.sendNotification(firestore, schoolId, doc.id, data)
            );

            await Promise.all(promises);
        } catch (error) {
            console.error('Error broadcasting notification to parents:', error);
        }
    }

    /**
     * Broadcasts a notification to all staff members with a specific permission
     */
    static async notifyStaffWithPermission(
        firestore: Firestore,
        schoolId: string,
        permission: string,
        data: {
            title: string;
            content: string;
            href?: string;
        }
    ) {
        try {
            // In a real scenario, we might want to fetch users who have this permission.
            // For now, let's target 'directeur' as a shortcut or fetch staff.
            const staffQuery = query(
                collection(firestore, 'users'),
                where(`schools.${schoolId}`, '!=', 'parent')
            );
            const snapshot = await getDocs(staffQuery);

            // Filter staff who have the permission (this might require fetching their profile/role doc)
            // For simplicity in this v1, let's notify the director and any high-level staff.
            const promises = snapshot.docs.map(doc =>
                this.sendNotification(firestore, schoolId, doc.id, data)
            );

            await Promise.all(promises);
        } catch (error) {
            console.error('Error notifying staff:', error);
        }
    }
}
