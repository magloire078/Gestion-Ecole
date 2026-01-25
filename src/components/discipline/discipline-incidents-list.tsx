'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { format, subMonths, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import type { discipline_incident as DisciplineIncident, student as Student, class_type as Class } from '@/lib/data-types';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { IncidentForm } from './incident-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { group, sort } from 'd3-array';

interface IncidentWithDetails extends DisciplineIncident {
    id: string;
    studentName?: string;
    className?: string;
}

export function DisciplineIncidentsList({ schoolId }: { schoolId: string }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const canManageDiscipline = !!user?.profile?.permissions?.manageDiscipline;

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState('all');

    const incidentsQuery = useMemo(() =>
        query(
            collection(firestore, `ecoles/${schoolId}/incidents_disciplinaires`),
            orderBy('date', 'desc')
        ),
        [firestore, schoolId]
    );

    const { data: incidentsData, loading: incidentsLoading } = useCollection(incidentsQuery);
    
    const studentsQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/eleves`)), [firestore, schoolId]);
    const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
    
    const classesQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/classes`)), [firestore, schoolId]);
    const { data: classesData, loading: classesLoading } = useCollection(classesQuery);

    const students = useMemo(() => studentsData?.map(doc => ({ id: doc.id, ...doc.data() } as Student & {id: string})) || [], [studentsData]);
    const classes = useMemo(() => classesData?.map(doc => ({ id: doc.id, ...doc.data() } as Class & {id: string})) || [], [classesData]);

    const studentMap = useMemo(() => new Map(students.map(s => [s.id, { name: `${s.firstName} ${s.lastName}`, classId: s.classId }])), [students]);
    const classMap = useMemo(() => new Map(classes.map(c => [c.id, c.name])), [classes]);


    const incidents = useMemo(() => {
        const allIncidents: IncidentWithDetails[] = incidentsData?.map(d => {
            const data = d.data() as DisciplineIncident;
            return {
                id: d.id,
                ...data,
                studentName: data.studentName,
                className: data.classId ? classMap.get(data.classId) : 'N/A'
            };
        }) || [];
        
        if (selectedClassId === 'all') {
            return allIncidents;
        }
        return allIncidents.filter(inc => inc.classId === selectedClassId);

    }, [incidentsData, classMap, selectedClassId]);

    const stats = useMemo(() => {
        if (!incidentsData) {
            return { total: 0, thisMonth: 0, mostCommon: 'N/A' };
        }
        const allIncidentsList = incidentsData.map(d => d.data() as DisciplineIncident);
        const total = allIncidentsList.length;

        const oneMonthAgo = subMonths(new Date(), 1);
        const thisMonth = allIncidentsList.filter(inc => {
            const incDate = new Date(inc.date);
            return isWithinInterval(incDate, { start: oneMonthAgo, end: new Date() });
        }).length;

        if (total === 0) {
            return { total, thisMonth, mostCommon: 'N/A' };
        }

        const groupedByType = group(allIncidentsList, d => d.type);
        const sortedByType = sort(Array.from(groupedByType.entries()), ([, a], [, b]) => b.length - a.length);
        
        const mostCommon = sortedByType.length > 0 ? sortedByType[0][0] : 'N/A';
        
        return { total, thisMonth, mostCommon };

    }, [incidentsData]);


    const getTypeBadgeVariant = (type: string) => {
        if (type.includes('Exclusion') || type.includes('Mise à pied')) return 'destructive';
        if (type.includes('Retenue') || type.includes('Écrit')) return 'outline';
        return 'secondary';
    };
    
    const isLoading = incidentsLoading || studentsLoading || classesLoading;

    return (
        <>
            <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total des Incidents</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16"/> : <div className="text-2xl font-bold">{stats.total}</div>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Incidents (30 derniers jours)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-16"/> : <div className="text-2xl font-bold">{stats.thisMonth}</div>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Type le plus fréquent</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-32"/> : <div className="text-2xl font-bold">{stats.mostCommon}</div>}
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Historique des Incidents</CardTitle>
                            <CardDescription>Liste de tous les incidents disciplinaires enregistrés.</CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                             <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Filtrer par classe..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Toutes les classes</SelectItem>
                                    {classes.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {canManageDiscipline && (
                                <Button onClick={() => setIsFormOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Signaler un incident
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Élève</TableHead>
                                <TableHead>Classe</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Raison</TableHead>
                                <TableHead>Signalé par</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                ))
                            ) : incidents.length > 0 ? (
                                incidents.map(incident => (
                                    <TableRow key={incident.id}>
                                        <TableCell>{format(new Date(incident.date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                                        <TableCell>{incident.studentName}</TableCell>
                                        <TableCell>{incident.className}</TableCell>
                                        <TableCell><Badge variant={getTypeBadgeVariant(incident.type)}>{incident.type}</Badge></TableCell>
                                        <TableCell>{incident.reason}</TableCell>
                                        <TableCell>{incident.reportedByName}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">Aucun incident disciplinaire enregistré pour cette sélection.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Signaler un nouvel incident</DialogTitle>
                        <DialogDescription>Remplissez les détails de l'incident.</DialogDescription>
                    </DialogHeader>
                    <IncidentForm 
                        schoolId={schoolId} 
                        students={students} 
                        onSave={() => setIsFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}