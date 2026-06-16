

'use client';
import { useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { notification as Notification } from '@/lib/data-types';

export function useNotifications() {
  const { user } = useUser();
  const firestore = useFirestore();
  const uid = user?.uid;
  const schoolId = user?.schoolId;

  const notificationsQuery = useMemo(() => {
    if (!uid || !schoolId || !firestore) return null;
    return query(
      collection(firestore, `ecoles/${schoolId}/notifications`),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc')
    );
  }, [uid, schoolId, firestore]);

  const { data: notificationsData, loading } = useCollection(notificationsQuery, { name: 'notifications' });

  const notifications = useMemo(() => {
    if (!notificationsData) return [];
    return notificationsData.map(d => ({ id: d.id, ...d.data() } as Notification & { id: string }));
  }, [notificationsData]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  return {
    notifications,
    unreadCount,
    loading
  };
}
