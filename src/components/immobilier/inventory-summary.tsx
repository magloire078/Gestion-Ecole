
'use client';
import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wrench, ShieldCheck, Package, Trash2 } from 'lucide-react';
import type { materiel as Materiel } from '@/lib/data-types';

export function InventorySummary({ schoolId }: { schoolId: string }) {
    const firestore = useFirestore();

    const inventaireQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/inventaire`)), [firestore, schoolId]);
    const { data: inventaireData, loading } = useCollection(inventaireQuery);

    const stats = useMemo(() => {
        if (!inventaireData) return { neuf: 0, bon: 0, a_reparer: 0, hors_service: 0, total: 0 };

        const items = inventaireData.map(doc => doc.data() as Materiel);
        return {
            neuf: items.filter(i => i.status === 'neuf').reduce((sum, i) => sum + i.quantity, 0),
            bon: items.filter(i => i.status === 'bon').reduce((sum, i) => sum + i.quantity, 0),
            a_reparer: items.filter(i => i.status === 'à réparer').reduce((sum, i) => sum + i.quantity, 0),
            hors_service: items.filter(i => i.status === 'hors_service').reduce((sum, i) => sum + i.quantity, 0),
            total: items.reduce((sum, i) => sum + i.quantity, 0)
        };
    }, [inventaireData]);

    if (loading) {
        return <Skeleton className="h-48 w-full" />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>État de l'Inventaire</CardTitle>
                <CardDescription>Répartition du matériel ({stats.total} articles) par statut.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    <div><div className="font-bold">{stats.neuf}</div><div className="text-xs text-muted-foreground">Neuf</div></div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <Package className="h-5 w-5 text-blue-600" />
                    <div><div className="font-bold">{stats.bon}</div><div className="text-xs text-muted-foreground">Bon état</div></div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <Wrench className="h-5 w-5 text-amber-600" />
                    <div><div className="font-bold">{stats.a_reparer}</div><div className="text-xs text-muted-foreground">À réparer</div></div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <Trash2 className="h-5 w-5 text-red-600" />
                    <div><div className="font-bold">{stats.hors_service}</div><div className="text-xs text-muted-foreground">Hors service</div></div>
                </div>
            </CardContent>
        </Card>
    );
}
