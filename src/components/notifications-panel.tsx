
'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Bell, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface Notification {
  id: string;
  title: string;
  content: string;
  senderName: string;
  readBy?: string[];
  createdAt: { seconds: number; nanoseconds: number };
}

export function NotificationsPanel({ 
  isOpen, 
  onClose, 
}: { 
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { schoolId } = useSchoolData();
  const { toast } = useToast();
  
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const notificationsQuery = useMemoFirebase(() => {
    if (!schoolId) return null;
    return query(collection(firestore, `ecoles/${schoolId}/messagerie`), orderBy('createdAt', 'desc'), limit(20));
  }, [firestore, schoolId]);

  const { data: notificationsData, loading } = useCollection(notificationsQuery);
  
  const notifications = (notificationsData?.docs.map(d => ({ id: d.id, ...d.data() } as Notification)) || []);
  const unreadCount = notifications.filter(n => !n.readBy?.includes(user?.uid || '')).length;

  const markAsRead = async (notificationId: string) => {
    if (!user || !schoolId) return;

    const notifRef = doc(firestore, `ecoles/${schoolId}/messagerie`, notificationId);
    
    // Optimistic update
    const tempNotifs = notifications.map(n => 
        n.id === notificationId 
        ? { ...n, readBy: [...(n.readBy || []), user.uid] } 
        : n
    );

    try {
        const docSnap = await getDoc(notifRef);
        if (docSnap.exists()) {
            const currentReadBy = docSnap.data().readBy || [];
            if (!currentReadBy.includes(user.uid)) {
                await updateDoc(notifRef, {
                    readBy: arrayUnion(user.uid)
                });
            }
        }
    } catch (e) {
      console.error("Failed to mark as read:", e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de marquer la notification comme lue.' });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    if (!notification.readBy?.includes(user?.uid || '')) {
      markAsRead(notification.id);
    }
  };
  
  const markAllAsRead = async () => {
    if (!user || !schoolId) return;
    const unreadNotifications = notifications.filter(n => !n.readBy?.includes(user.uid));
    
    try {
        for (const notif of unreadNotifications) {
            const notifRef = doc(firestore, `ecoles/${schoolId}/messagerie`, notif.id);
            await updateDoc(notifRef, {
                readBy: arrayUnion(user.uid)
            });
        }
        toast({ title: "Notifications marquées comme lues" });
    } catch(e) {
        console.error("Failed to mark all as read:", e);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </SheetTitle>
            <Button variant="ghost" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
              Tout marquer comme lu
            </Button>
          </div>
        </SheetHeader>

        {selectedNotification ? (
            <div className="p-6 flex-1 overflow-y-auto">
                 <Button variant="ghost" onClick={() => setSelectedNotification(null)} className="mb-4">
                    &larr; Retour aux notifications
                </Button>
                <h3 className="font-bold text-lg">{selectedNotification.title}</h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Par {selectedNotification.senderName} • {formatDistanceToNow(new Date(selectedNotification.createdAt.seconds * 1000), { addSuffix: true, locale: fr })}
                </p>
                <div className="prose dark:prose-invert text-sm">
                    {selectedNotification.content}
                </div>
            </div>
        ) : (
             <div className="overflow-y-auto flex-1">
                {loading ? (
                    <div className="p-4 space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center h-full flex flex-col justify-center items-center">
                    <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-muted-foreground">Aucune notification pour le moment.</p>
                    </div>
                ) : (
                    <div className="divide-y">
                    {notifications.map((notification) => {
                        const isRead = notification.readBy?.includes(user?.uid || '');
                        return (
                            <div
                                key={notification.id}
                                className={cn("p-4 hover:bg-muted transition-colors cursor-pointer", !isRead && "bg-blue-50/50 dark:bg-blue-950/20")}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex gap-3">
                                    {!isRead && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0"></div>}
                                    <div className={cn("flex-1", isRead && "pl-4")}>
                                    <div className="flex items-start justify-between mb-1">
                                        <h4 className="font-medium text-sm">{notification.title}</h4>
                                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                            {formatDistanceToNow(new Date(notification.createdAt.seconds * 1000), { addSuffix: true, locale: fr })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {notification.content}
                                    </p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    </div>
                )}
            </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
