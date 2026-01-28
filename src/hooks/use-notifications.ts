
'use client';
import { useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { notification as Notification } from '@/lib/data-types';

export function useNotifications() {
  const { user } = useUser();
  const firestore = useFirestore();

  // La requête est maintenant conditionnelle et ne s'exécute que si on a les IDs nécessaires.
  const notificationsQuery = useMemo(() => {
    if (!user?.uid || !user?.schoolId) return null;
    return query(
      collection(firestore, `ecoles/${user.schoolId}/notifications`),
      where('userId', '==', user.uid)
    );
  }, [user?.uid, user?.schoolId, firestore]);
  
  // Le hook useCollection gère le cas où la requête est null.
  const { data: notificationsData, loading } = useCollection(notificationsQuery);

  const notifications = useMemo(() => {
    if (!notificationsData) return [];
    const fetched = notificationsData.map(d => ({ id: d.id, ...d.data() } as Notification & { id: string }));
    // Tri manuel pour éviter les problèmes de règles de sécurité complexes
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
