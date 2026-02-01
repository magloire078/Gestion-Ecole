
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, collectionGroup, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { User, CreditCard, UserX, UserPlus, ShieldAlert } from 'lucide-react';
import type { student, staff, absence, accountingTransaction, discipline_incident as DisciplineIncident } from '@/lib/data-types';

interface RecentActivityProps {
    schoolId: string;
}

// Define a unified activity item type
type ActivityItem = {
    id: string;
    type: 'student' | 'payment' | 'absence' | 'staff' | 'incident';
    timestamp: number;
    content: string;
    icon: React.ElementType;
};

export function RecentActivity({ schoolId }: RecentActivityProps) {
    const firestore = useFirestore();

    const recentStudentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`), orderBy('createdAt', 'desc'), limit(5)) : null, [firestore, schoolId]);
    
    const recentPaymentsQuery = useMemo(() => schoolId ? query(
        collection(firestore, `ecoles/${schoolId}/comptabilite`), 
        where('schoolId', '==', schoolId),
        where('category', '==', 'Scolarité'),
        where('type', '==', 'Revenu'),
        orderBy('date', 'desc'), 
        limit(5)
    ) : null, [firestore, schoolId]);

    const recentAbsencesQuery = useMemo(() => schoolId ? query(collectionGroup(firestore, `absences`), where('schoolId', '==', schoolId), orderBy('date', 'desc'), limit(5)) : null, [firestore, schoolId]);
    const recentStaffQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`), orderBy('hireDate', 'desc'), limit(5)) : null, [firestore, schoolId]);
    const recentIncidentsQuery = useMemo(() => schoolId ? query(collectionGroup(firestore, `incidents_disciplinaires`), where('schoolId', '==', schoolId), orderBy('date', 'desc'), limit(5)) : null, [firestore, schoolId]);
    
    // We need all students to map IDs to names for payments
    const allStudentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [firestore, schoolId]);

    const { data: studentsData, loading: studentsLoading } = useCollection(recentStudentsQuery);
    const { data: paymentsData, loading: paymentsLoading } = useCollection(recentPaymentsQuery);
    const { data: absencesData, loading: absencesLoading } = useCollection(recentAbsencesQuery);
    const { data: staffData, loading: staffLoading } = useCollection(recentStaffQuery);
    const { data: incidentsData, loading: incidentsLoading } = useCollection(recentIncidentsQuery);
    const { data: allStudentsData, loading: allStudentsLoading } = useCollection(allStudentsQuery);

    const studentMap = useMemo(() => {
        const map = new Map<string, string>();
        allStudentsData?.forEach(doc => {
            const student = doc.data() as student;
            map.set(doc.id, `${student.firstName} ${student.lastName}`);
        });
        return map;
    }, [allStudentsData]);

    const loading = studentsLoading || paymentsLoading || absencesLoading || allStudentsLoading || staffLoading || incidentsLoading;

    const recentItems: ActivityItem[] = useMemo(() => {
        if (loading && !studentMap.size) return [];

        const activities: ActivityItem[] = [];

        studentsData?.forEach(doc => {
            const data = doc.data() as student;
            const ts = (data.createdAt as any)?.seconds;
            if (ts) {
                activities.push({
                    id: doc.id,
                    type: 'student',
                    timestamp: ts * 1000,
                    content: `Nouvel élève : ${data.firstName} ${data.lastName}`,
                    icon: User
                });
            }
        });
        
        paymentsData?.forEach(doc => {
            const data = doc.data() as accountingTransaction;
            const studentName = data.studentId ? studentMap.get(data.studentId) || 'un élève' : 'un élève';
            if(data.date){
                try {
                   const timestamp = parseISO(data.date).getTime();
                   if (!isNaN(timestamp)) {
                      activities.push({
                          id: doc.id,
                          type: 'payment',
                          timestamp: timestamp,
                          content: `Paiement de ${data.amount.toLocaleString('fr-FR')} CFA reçu de ${studentName}`,
                          icon: CreditCard
                      });
                   }
                } catch(e) { console.error("Invalid date format for payment", data.date)}
            }
        });

        absencesData?.forEach(doc => {
            const data = doc.data() as absence;
            if(data.date){
                try {
                    const timestamp = parseISO(data.date).getTime();
                    if (!isNaN(timestamp)) {
                        activities.push({
                            id: doc.id,
                            type: 'absence',
                            timestamp: timestamp,
                            content: `Absence enregistrée pour ${data.studentName}`,
                            icon: UserX
                        });
                    }
                } catch(e) { console.error("Invalid date format for absence", data.date)}
            }
        });
        
        staffData?.forEach(doc => {
            const data = doc.data() as staff;
            if (data.hireDate) {
                 try {
                    const timestamp = parseISO(data.hireDate).getTime();
                    if (!isNaN(timestamp)) {
                        activities.push({
                            id: doc.id,
                            type: 'staff',
                            timestamp: timestamp,
                            content: `Nouveau membre : ${data.firstName} ${data.lastName} (${data.role})`,
                            icon: UserPlus
                        });
                    }
                } catch(e) { console.error("Invalid date format for staff hireDate", data.hireDate)}
            }
        });
        
        incidentsData?.forEach(doc => {
            const data = doc.data() as DisciplineIncident;
            if (data.date) {
                try {
                    // Firestore timestamps are objects, date strings need parsing
                    const date = (data.date as any).seconds ? new Date((data.date as any).seconds * 1000) : parseISO(data.date);
                    const timestamp = date.getTime();
                    if (!isNaN(timestamp)) {
                        activities.push({
                            id: doc.id,
                            type: 'incident',
                            timestamp: timestamp,
                            content: `Incident: ${data.type} pour ${data.studentName}`,
                            icon: ShieldAlert
                        });
                    }
                } catch(e) { console.error("Invalid date format for incident", data.date)}
            }
        });


        return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

    }, [loading, studentsData, paymentsData, absencesData, staffData, incidentsData, studentMap]);
    
    if (!schoolId) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Activité Récente</CardTitle>
                <CardDescription>Derniers événements dans votre établissement.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {loading ? (
                         [...Array(5)].map((_, i) => (
                             <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/4" />
                                </div>
                            </div>
                         ))
                    ) : recentItems.length > 0 ? recentItems.map((item) => (
                        <div key={item.id + item.type} className="flex items-center gap-4">
                            <div className="p-2 bg-muted rounded-full">
                                <item.icon className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">{item.content}</p>
                                <p className="text-xs text-muted-foreground">
                                    {item.timestamp ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: fr }) : ''}
                                </p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground text-center py-8">Aucune activité récente à afficher.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
