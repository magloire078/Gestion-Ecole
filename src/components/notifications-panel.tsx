

'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "./ui/button";
import { useUser, useFirestore } from "@/firebase";
import { writeBatch, doc, updateDoc } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
// import { useNotifications } from "@/hooks/use-notifications";
import type { notification as Notification } from '@/lib/data-types';

export function NotificationsPanel({ 
  isOpen, 
  onClose, 
}: { 
  isOpen: boolean;
  onClose: () => void;
}) {
  
  const { user } = useUser();
  const firestore = useFirestore();
  // const { notifications, unreadCount, loading } = useNotifications();

  // MOCKED DATA
  const notifications: (Notification & { id: string })[] = [];
  const unreadCount = 0;
  const loading = false;


  const handleMarkAsRead = async (notificationId: string) => {
    if (!user?.schoolId) return;
    const notifRef = doc(firestore, `ecoles/${user.schoolId}/notifications`, notificationId);
    await updateDoc(notifRef, { isRead: true });
  };
  
  const handleMarkAllAsRead = async () => {
    if (!user?.schoolId || unreadCount === 0) return;
    const batch = writeBatch(firestore);
    notifications.forEach(notif => {
      if (!notif.isRead) {
        const notifRef = doc(firestore, `ecoles/${user.schoolId}/notifications`, notif.id);
        batch.update(notifRef, { isRead: true });
      }
    });
    await batch.commit();
  };

  const handleNotificationClick = (notification: Notification & { id: string }) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    onClose();
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                <CheckCheck className="mr-2 h-4 w-4" />
                Tout marquer comme lu
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
            {loading ? (
                <div className="p-6 space-y-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
            ) : notifications.length > 0 ? (
                <div className="divide-y">
                    {notifications.map(notification => (
                        <Link key={notification.id} href={notification.href || '#'} passHref>
                          <div 
                              className={cn(
                                "p-4 hover:bg-muted/50 cursor-pointer", 
                                !notification.isRead && "bg-blue-50 dark:bg-blue-900/20"
                              )}
                              onClick={() => handleNotificationClick(notification)}
                          >
                              <p className="font-semibold">{notification.title}</p>
                              <p className="text-sm text-muted-foreground">{notification.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {notification.createdAt ? formatDistanceToNow(new Date((notification.createdAt as any).seconds * 1000), { addSuffix: true, locale: fr }) : ''}
                              </p>
                          </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center h-full flex flex-col justify-center items-center">
                    <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-muted-foreground">Vous n'avez aucune notification.</p>
                </div>
            )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
