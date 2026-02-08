'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MaintenanceTask {
    id: string;
    description: string;
    status: 'en_cours' | 'a_faire' | 'terminée';
    priorite: 'haute' | 'moyenne' | 'basse';
    createdAt: any;
    lieu: string;
}

export function MaintenanceList({ schoolId, limit: limitCount = 5 }: { schoolId: string, limit?: number }) {
    const firestore = useFirestore();
    const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!schoolId || !firestore) return;

        const fetchTasks = async () => {
            try {
                const q = query(
                    collection(firestore, `ecoles/${schoolId}/maintenance`),
                    where('status', '!=', 'terminée'),
                    orderBy('status'),
                    orderBy('createdAt', 'desc'),
                    limit(limitCount)
                );

                const snap = await getDocs(q);
                // @ts-ignore
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as MaintenanceTask[];
                setTasks(data);
            } catch (error) {
                console.error("Erreur fetch maintenance:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, [schoolId, firestore, limitCount]);

    if (loading) {
        return <Skeleton className="h-[300px] w-full" />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Wrench className="w-5 h-5 mr-2 text-orange-500" />
                    Maintenance en cours
                </CardTitle>
                <CardDescription>Les dernières demandes d'intervention</CardDescription>
            </CardHeader>
            <CardContent>
                {tasks.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        Aucune tâche de maintenance en cours.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                <div>
                                    <p className="font-medium text-sm">{task.description}</p>
                                    <div className="flex items-center text-xs text-slate-500 mt-1">
                                        <span className="mr-2">{task.lieu}</span>
                                        <span>• {task.createdAt?.seconds ? format(new Date(task.createdAt.seconds * 1000), 'd MMM', { locale: fr }) : '-'}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge variant={task.priorite === 'haute' ? 'destructive' : 'secondary'}>
                                        {task.priorite}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                        {task.status.replace('_', ' ')}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
