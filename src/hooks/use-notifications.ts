

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
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [user?.uid, user?.schoolId, firestore]);
  
  const { data: notificationsData, loading } = useCollection(notificationsQuery);

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
