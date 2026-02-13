'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import type { discipline_incident as DisciplineIncident } from '@/lib/data-types';

interface ParentDisciplineTabProps {
    schoolId: string;
    studentId: string;
}

export function ParentDisciplineTab({ schoolId, studentId }: ParentDisciplineTabProps) {
    const firestore = useFirestore();

    const incidentsQuery = useMemo(() =>
        query(
            collection(firestore, `ecoles/${schoolId}/eleves/${studentId}/incidents_disciplinaires`),
            orderBy('date', 'desc')
        ),
        [firestore, schoolId, studentId]);

    const { data: incidentsData, loading: incidentsLoading } = useCollection(incidentsQuery);

    const incidents = useMemo(() => incidentsData?.map(d => ({ id: d.id, ...d.data() } as DisciplineIncident & { id: string })) || [], [incidentsData]);

    const getTypeBadgeVariant = (type: string) => {
        if (type.includes('Exclusion') || type.includes('Mise à pied')) return 'destructive';
        if (type.includes('Retenue') || type.includes('Écrit')) return 'outline';
        return 'secondary';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Historique Disciplinaire</CardTitle>
                <CardDescription>Suivi des comportements et des sanctions de l&apos;élève.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Raison</TableHead>
                            <TableHead>Signalé par</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {incidentsLoading ? (
                            [...Array(3)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : incidents.length > 0 ? (
                            incidents.map(incident => (
                                <TableRow key={incident.id}>
                                    <TableCell>{format(new Date(incident.date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                                    <TableCell><Badge variant={getTypeBadgeVariant(incident.type)}>{incident.type}</Badge></TableCell>
                                    <TableCell>{incident.reason}</TableCell>
                                    <TableCell>{incident.reportedByName}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">Aucun incident disciplinaire enregistré.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
