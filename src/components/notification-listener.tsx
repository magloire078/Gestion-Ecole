'use client';

import { useEffect, useRef } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function NotificationListener() {
    const { notifications, loading } = useNotifications();
    const { toast } = useToast();
    const lastNotifiedId = useRef<string | null>(null);
    const isFirstRun = useRef(true);
    const router = useRouter();

    useEffect(() => {
        if (loading || notifications.length === 0) {
            if (!loading) isFirstRun.current = false;
            return;
        }

        const latest = notifications[0];

        // If it's the first time we load, don't toast all existing unread notifications
        if (isFirstRun.current) {
            lastNotifiedId.current = latest.id;
            isFirstRun.current = false;
            return;
        }

        // If the latest notification is different from the last one we toasted
        // AND it's not read yet (though it wouldn't be if it's new)
        if (latest.id !== lastNotifiedId.current && !latest.isRead) {
            lastNotifiedId.current = latest.id;

            toast({
                title: latest.title,
                description: latest.content,
                action: latest.href ? (
                    <div
                        onClick={() => router.push(latest.href)}
                        className="cursor-pointer bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm font-medium"
                    >
                        Voir
                    </div>
                ) : undefined,
            });
        }
    }, [notifications, loading, toast, router]);

    return null; // This component doesn't render anything
}
