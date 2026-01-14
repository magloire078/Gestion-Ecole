
'use client';

import { MaintenanceList } from "@/components/immobilier/maintenance-list";
import { useSchoolData } from "@/hooks/use-school-data";
import { Skeleton } from "@/components/ui/skeleton";

export default function MaintenancePage() {
    const { schoolId, loading } = useSchoolData();

    if (loading || !schoolId) {
        return (
             <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }
    
    return <MaintenanceList schoolId={schoolId} />
}
