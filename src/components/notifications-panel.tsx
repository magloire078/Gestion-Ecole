
'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Bell, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// The Notification interface is kept for potential future use, but is not actively fetched.
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
  
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const handleClose = () => {
    setSelectedNotification(null);
    onClose();
  }
  
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </SheetTitle>
          </div>
        </SheetHeader>

        {selectedNotification ? (
            <div className="p-6 flex-1 overflow-y-auto">
                 <Button variant="ghost" onClick={() => setSelectedNotification(null)} className="mb-4 -ml-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux notifications
                </Button>
                <h3 className="font-bold text-lg">{selectedNotification.title}</h3>
                <p className="text-xs text-muted-foreground mb-4">
                    {/* Static placeholder */}
                    Par {selectedNotification.senderName} • il y a quelques instants
                </p>
                <div className="prose dark:prose-invert text-sm whitespace-pre-wrap">
                    {selectedNotification.content}
                </div>
            </div>
        ) : (
             <div className="overflow-y-auto flex-1">
                <div className="p-8 text-center h-full flex flex-col justify-center items-center">
                    <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-muted-foreground">Aucune notification pour le moment.</p>
                    <p className="text-xs text-muted-foreground mt-2">La fonctionnalité de notification est en cours d'amélioration.</p>
                </div>
            </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
