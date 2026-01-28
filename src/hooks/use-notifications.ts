
'use client';
import { useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { notification as Notification } from '@/lib/data-types';

export function useNotifications() {
  const { user } = useUser();
  const firestore = useFirestore();

  const notificationsQuery = useMemo(() => {
    if (!user?.uid || !user?.schoolId) return null;
    return query(
      collection(firestore, `ecoles/${user.schoolId}/notifications`),
      where('userId', '==', user.uid)
      // orderBy a été retiré pour éviter des conflits avec les règles de sécurité. Le tri est fait côté client.
    );
  }, [user?.uid, user?.schoolId, firestore]);
  
  const { data: notificationsData, loading } = useCollection(notificationsQuery);

  const notifications = useMemo(() => {
    const fetched = notificationsData?.map(d => ({ id: d.id, ...d.data() } as Notification & { id: string })) || [];
    // Tri manuel des notifications pour afficher les plus récentes en premier
    return fetched.sort((a, b) => {
        const timeA = (a.createdAt as any)?.seconds || 0;
        const timeB = (b.createdAt as any)?.seconds || 0;
        return timeB - timeA;
    });
  }, [notificationsData]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  return {
    notifications,
    unreadCount,
    loading
  };
}
