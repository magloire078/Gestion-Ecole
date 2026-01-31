
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { log as Log, student as Student } from '@/lib/data-types';

interface LogWithStudentName extends Log {
    id: string;
    studentName?: string;
}

export default function JournalPage() {
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();

    const logsQuery = useMemo(() => 
        schoolId ? query(collection(firestore, `ecoles/${schoolId}/internat_entrees_sorties`), orderBy('timestamp', 'desc')) : null, 
    [firestore, schoolId]);

    const studentsQuery = useMemo(() => 
        schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, 
    [firestore, schoolId]);

    const { data: logsData, loading: logsLoading } = useCollection(logsQuery);
    const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);

    const studentsMap = useMemo(() => {
        const map = new Map<string, string>();
        if (studentsData) {
            studentsData.forEach(doc => {
                const student = doc.data() as Student;
                map.set(doc.id, `${student.firstName} ${student.lastName}`);
            });
        }
        return map;
    }, [studentsData]);

    const logs: LogWithStudentName[] = useMemo(() => {
        if (!logsData) return [];
        return logsData.map(doc => {
            const data = doc.data() as Log;
            return {
                id: doc.id,
                ...data,
                studentName: studentsMap.get(data.studentId) || 'Élève inconnu',
            };
        });
    }, [logsData, studentsMap]);

    const isLoading = schoolLoading || logsLoading || studentsLoading;

    const getStatusBadgeVariant = (status: string) => {
        switch(status) {
            case 'authorized': return 'secondary';
            case 'returned': return 'default';
            case 'late': return 'destructive';
            case 'cancelled': return 'outline';
            default: return 'outline';
        }
    };
    
    const getTypeBadgeVariant = (type: string) => {
        return type === 'entree' ? 'secondary' : 'default';
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Journal des Entrées/Sorties</CardTitle>
                <CardDescription>Historique complet des mouvements des élèves internes.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date & Heure</TableHead>
                            <TableHead>Élève</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Motif</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Autorisé par</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(10)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : logs.length > 0 ? (
                            logs.map(log => (
                                <TableRow key={log.id}>
                                    <TableCell>{format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
                                    <TableCell className="font-medium">{log.studentName}</TableCell>
                                    <TableCell><Badge variant={getTypeBadgeVariant(log.type)}>{log.type}</Badge></TableCell>
                                    <TableCell>{log.reason}</TableCell>
                                    <TableCell><Badge variant={getStatusBadgeVariant(log.status)}>{log.status}</Badge></TableCell>
                                    <TableCell>{log.authorizedBy}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">Aucun mouvement enregistré.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
