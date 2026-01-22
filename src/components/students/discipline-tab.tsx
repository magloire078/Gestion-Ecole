

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import type { discipline_incident as DisciplineIncident, student as Student } from '@/lib/data-types';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { PlusCircle } from 'lucide-react';
import { IncidentForm } from '../discipline/incident-form';

interface DisciplineTabProps {
    schoolId: string;
    student: Student & { id: string };
}

export function DisciplineTab({ schoolId, student }: DisciplineTabProps) {
    const firestore = useFirestore();
    const { user } = useUser();
    const canManageDiscipline = !!user?.profile?.permissions?.manageDiscipline;
    const [isFormOpen, setIsFormOpen] = useState(false);

    const incidentsQuery = useMemo(() => 
        query(
            collection(firestore, `ecoles/${schoolId}/incidents_disciplinaires`), 
            where('studentId', '==', student.id),
            orderBy('date', 'desc')
        ), 
    [firestore, schoolId, student.id]);
    
    const { data: incidentsData, loading: incidentsLoading } = useCollection(incidentsQuery);
    
    const incidents = useMemo(() => incidentsData?.map(d => ({ id: d.id, ...d.data() } as DisciplineIncident & {id: string})) || [], [incidentsData]);

    const getTypeBadgeVariant = (type: string) => {
        if (type.includes('Exclusion') || type.includes('Mise à pied')) return 'destructive';
        if (type.includes('Retenue') || type.includes('Écrit')) return 'outline';
        return 'secondary';
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Historique Disciplinaire</CardTitle>
                            <CardDescription>Suivi des comportements et des sanctions de l'élève.</CardDescription>
                        </div>
                        {canManageDiscipline && (
                            <Button onClick={() => setIsFormOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Signaler un incident
                            </Button>
                        )}
                    </div>
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

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Signaler un incident pour {student.firstName}</DialogTitle>
                        <DialogDescription>Remplissez les détails de l'incident.</DialogDescription>
                    </DialogHeader>
                    <IncidentForm 
                        schoolId={schoolId} 
                        student={student} 
                        students={[]}
                        onSave={() => setIsFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
