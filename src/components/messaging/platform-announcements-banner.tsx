'use client';

import { useMemo } from 'react';
import { collection, orderBy, query } from 'firebase/firestore';
import { AlertTriangle, Info, X, XCircle } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { Button } from '@/components/ui/button';
import {
    dismissAnnouncement,
    isAnnouncementActive,
    matchesTarget,
    type AnnouncementSeverity,
    type PlatformAnnouncement,
} from '@/services/announcement-service';
import { cn } from '@/lib/utils';

const TONE: Record<AnnouncementSeverity, { wrap: string; icon: typeof Info }> = {
    info: { wrap: 'border-sky-200 bg-sky-50 text-sky-900', icon: Info },
    warning: { wrap: 'border-amber-200 bg-amber-50 text-amber-900', icon: AlertTriangle },
    critical: { wrap: 'border-rose-200 bg-rose-50 text-rose-900', icon: XCircle },
};

export function PlatformAnnouncementsBanner() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { schoolData } = useSchoolData();

    const announcementsQuery = useMemo(
        () => query(collection(firestore, 'platform_announcements'), orderBy('publishAt', 'desc')),
        [firestore],
    );
    const { data } = useCollection(announcementsQuery);

    const visible = useMemo(() => {
        if (!data || !schoolData?.id || !user?.uid) return [];
        const now = new Date();
        return data
            .map(d => ({ id: d.id, ...(d.data() as PlatformAnnouncement) }))
            .filter(a => isAnnouncementActive(a, now))
            .filter(a => !(a.dismissedBy ?? []).includes(user.uid!))
            .filter(a => matchesTarget(a.target, {
                id: schoolData.id!,
                plan: schoolData.subscription?.plan,
                status: schoolData.subscription?.status,
            }))
            .slice(0, 3); // limite anti-encombrement
    }, [data, schoolData, user?.uid]);

    if (visible.length === 0) return null;

    return (
        <div className="space-y-2 mb-4">
            {visible.map(a => {
                const tone = TONE[a.severity];
                const Icon = tone.icon;
                return (
                    <div
                        key={a.id}
                        className={cn(
                            'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-sm',
                            tone.wrap,
                        )}
                    >
                        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm leading-tight">{a.title}</p>
                            <p className="text-xs whitespace-pre-wrap mt-1">{a.content}</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 shrink-0"
                            onClick={() => dismissAnnouncement(firestore, a.id, user!.uid!, a.dismissedBy ?? [])}
                            aria-label="Masquer"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                );
            })}
        </div>
    );
}
