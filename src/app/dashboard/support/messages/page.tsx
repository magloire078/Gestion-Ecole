'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ConversationThread } from '@/components/messaging/conversation-thread';

export default function DirectorMessagesPage() {
    const { user, loading: userLoading } = useUser();
    const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();

    if (userLoading || schoolLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-12 w-1/2" />
                <Skeleton className="h-[480px] w-full" />
            </div>
        );
    }

    if (!schoolId) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    Aucune école active. Sélectionnez une école pour ouvrir la messagerie support.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Messagerie support</h1>
                    <p className="text-muted-foreground text-sm">
                        Discutez directement avec l&apos;équipe GèreEcole. Réponse sous 24h ouvrées.
                    </p>
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/support">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Mes tickets
                    </Link>
                </Button>
            </div>

            <Card>
                <CardContent className="flex items-center gap-3 p-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-bold">Équipe GèreEcole</p>
                        <p className="text-xs text-muted-foreground">
                            Conversation privée pour {schoolData?.name ?? 'votre école'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <ConversationThread
                schoolId={schoolId}
                schoolName={schoolData?.name}
                viewerRole="director"
                viewerId={user?.uid ?? ''}
                viewerName={user?.displayName ?? 'Directeur'}
                height={560}
                emptyHint="Posez votre première question — l'équipe vous répondra dès que possible."
            />
        </div>
    );
}
