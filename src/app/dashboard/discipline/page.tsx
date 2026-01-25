'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { subMonths, isWithinInterval } from 'date-fns';
import { group, sort } from 'd3-array';
import type { discipline_incident as DisciplineIncident, student as Student, class_type as Class } from '@/lib/data-types';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IncidentForm } from '@/components/discipline/incident-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSchoolData } from '@/hooks/use-school-data';
import { DisciplineIncidentsList } from '@/components/discipline/discipline-incidents-list';

interface IncidentWithDetails extends DisciplineIncident {
    id: string;
    studentName?: string;
    className?: string;
}

const StatCard = ({ title, value, loading }: { title: string, value: string | number, loading: boolean }) => (
    <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            {loading ? <Skeleton className="h-8 w-16"/> : <div className="text-2xl font-bold">{value}</div>}
        </CardContent>
    </Card>
);

export default function DisciplinePage() {
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();
    const { user, loading: userLoading } = useUser();
    const canManageDiscipline = !!user?.profile?.permissions?.manageDiscipline;

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState('all');

    const incidentsQuery = useMemo(() =>
        schoolId ? query(
            collection(firestore, `ecoles/${schoolId}/incidents_disciplinaires`),
            orderBy('date', 'desc')
        ) : null,
        [firestore, schoolId]
    );
    const { data: incidentsData, loading: incidentsLoading } = useCollection(incidentsQuery);

    const studentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [firestore, schoolId]);
    const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);

    const classesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
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

    const isLoading = schoolLoading || userLoading || incidentsLoading || studentsLoading || classesLoading;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-lg font-semibold md:text-2xl">Suivi de la Discipline</h1>
                <p className="text-muted-foreground">
                    Consultez et gérez l'historique disciplinaire de l'ensemble des élèves.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Total des Incidents" value={stats.total} loading={isLoading} />
                <StatCard title="Incidents (30 derniers jours)" value={stats.thisMonth} loading={isLoading} />
                <StatCard title="Type le plus fréquent" value={stats.mostCommon} loading={isLoading} />
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
                    <DisciplineIncidentsList incidents={incidents} isLoading={isLoading} />
                </CardContent>
            </Card>

             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Signaler un nouvel incident</DialogTitle>
                        <DialogDescription>Remplissez les détails de l'incident.</DialogDescription>
                    </DialogHeader>
                    <IncidentForm 
                        schoolId={schoolId!} 
                        students={students} 
                        onSave={() => setIsFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}