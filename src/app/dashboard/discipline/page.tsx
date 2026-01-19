
'use client';

import { DisciplineIncidentsList } from '@/components/discipline/discipline-incidents-list';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function DisciplinePage() {
    const { schoolId, loading } = useSchoolData();

    if (loading || !schoolId) {
        return (
             <div className="space-y-4">
                <Skeleton className="h-10 w-48 mb-4" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-lg font-semibold md:text-2xl">Suivi de la Discipline</h1>
                <p className="text-muted-foreground">
                    Consultez et gérez l'historique disciplinaire de l'ensemble des élèves.
                </p>
            </div>
            <DisciplineIncidentsList schoolId={schoolId} />
        </div>
    );
}
