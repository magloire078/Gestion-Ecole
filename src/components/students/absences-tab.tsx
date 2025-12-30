
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import type { absence as Absence } from '@/lib/data-types';

interface AbsencesTabProps {
    schoolId: string;
    studentId: string;
}

export function AbsencesTab({ schoolId, studentId }: AbsencesTabProps) {
    const firestore = useFirestore();

    const absencesQuery = useMemoFirebase(() => 
        query(
            collection(firestore, `ecoles/${schoolId}/absences`), 
            where('studentId', '==', studentId),
            orderBy('date', 'desc')
        ), 
    [firestore, schoolId, studentId]);
    
    const { data: absencesData, loading: absencesLoading } = useCollection(absencesQuery);
    
    const absences: Absence[] = useMemo(() => absencesData?.map(d => ({ id: d.id, ...d.data() } as Absence)) || [], [absencesData]);
    
    const stats = useMemo(() => {
        const total = absences.length;
        const justified = absences.filter(a => a.justified).length;
        const unjustified = total - justified;
        return { total, justified, unjustified };
    }, [absences]);
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Absences</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {absencesLoading ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold">{stats.total}</div>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Justifiées</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {absencesLoading ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold text-emerald-600">{stats.justified}</div>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Non Justifiées</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {absencesLoading ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold text-destructive">{stats.unjustified}</div>}
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Historique des Absences</CardTitle>
                    <CardDescription>Liste de toutes les absences enregistrées pour cet élève.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Motif</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {absencesLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : absences.length > 0 ? (
                                absences.map(absence => (
                                    <TableRow key={absence.id}>
                                        <TableCell>{format(new Date(absence.date), 'd MMMM yyyy', { locale: fr })}</TableCell>
                                        <TableCell>{absence.type}</TableCell>
                                        <TableCell>
                                            <Badge variant={absence.justified ? 'secondary' : 'destructive'}>
                                                {absence.justified ? 'Justifiée' : 'Non justifiée'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{absence.reason || 'N/A'}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">Aucune absence enregistrée.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
