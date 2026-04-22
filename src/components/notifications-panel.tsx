

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
import { useNotifications } from "@/hooks/use-notifications";
import type { notification as Notification } from '@/lib/data-types';
import { Badge } from "./ui/badge";

export function NotificationsPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {

  const { user } = useUser();
  const firestore = useFirestore();
  const { notifications, unreadCount, loading } = useNotifications();

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
                        "p-4 transition-all duration-200 cursor-pointer border-l-4",
                        notification.isRead 
                          ? "border-transparent hover:bg-muted/50" 
                          : "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50/80 dark:hover:bg-blue-900/20"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className={cn("font-semibold text-sm", !notification.isRead && "text-blue-700 dark:text-blue-400")}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{notification.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-2 font-medium uppercase tracking-wider">
                        {notification.createdAt ? formatDistanceToNow(new Date((notification.createdAt as any).seconds * 1000), { addSuffix: true, locale: fr }) : ''}
                      </p>
                    </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center h-full flex flex-col justify-center items-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground">Vous n&apos;avez aucune notification.</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
