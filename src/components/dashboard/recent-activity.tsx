
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, collectionGroup, where, documentId } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { User, CreditCard, UserX, UserPlus, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
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

    const { data: studentsData, loading: studentsLoading } = useCollection(recentStudentsQuery, { name: 'RecentActivity:students' });
    const { data: paymentsData, loading: paymentsLoading } = useCollection(recentPaymentsQuery, { name: 'RecentActivity:payments' });

    // Optimized: Fetch only the students involved in the recent payments
    const paymentStudentIds = useMemo(() => {
        if (!paymentsData) return [];
        const ids = new Set<string>();
        paymentsData.forEach(doc => {
            const data = doc.data() as accountingTransaction;
            if (data.studentId) ids.add(data.studentId);
        });
        return Array.from(ids);
    }, [paymentsData]);

    const paymentStudentsQuery = useMemo(() => {
        if (!schoolId || !firestore || paymentStudentIds.length === 0) return null;
        return query(collection(firestore, `ecoles/${schoolId}/eleves`), where(documentId(), 'in', paymentStudentIds));
    }, [firestore, schoolId, paymentStudentIds]);

    const { data: paymentStudentsData, loading: paymentStudentsLoading } = useCollection(paymentStudentsQuery, { name: 'RecentActivity:paymentStudents' });
    const { data: absencesData, loading: absencesLoading } = useCollection(recentAbsencesQuery, { name: 'RecentActivity:absences' });
    const { data: staffData, loading: staffLoading } = useCollection(recentStaffQuery, { name: 'RecentActivity:staff' });
    const { data: incidentsData, loading: incidentsLoading } = useCollection(recentIncidentsQuery, { name: 'RecentActivity:incidents' });

    const studentMap = useMemo(() => {
        const map = new Map<string, string>();

        // Map recent student registrations
        studentsData?.forEach(doc => {
            const s = doc.data() as student;
            map.set(doc.id, `${s.firstName} ${s.lastName}`);
        });

        // Map students from targeted payment fetch
        paymentStudentsData?.forEach(doc => {
            const s = doc.data() as student;
            map.set(doc.id, `${s.firstName} ${s.lastName}`);
        });

        return map;
    }, [studentsData, paymentStudentsData]);

    const loading = studentsLoading || paymentsLoading || paymentStudentsLoading || absencesLoading || staffLoading || incidentsLoading;

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
            if (data.date) {
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
                } catch (e) { console.error("Invalid date format for payment", data.date) }
            }
        });

        absencesData?.forEach(doc => {
            const data = doc.data() as absence;
            if (data.date) {
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
                } catch (e) { console.error("Invalid date format for absence", data.date) }
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
                } catch (e) { console.error("Invalid date format for staff hireDate", data.hireDate) }
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
                } catch (e) { console.error("Invalid date format for incident", data.date) }
            }
        });


        return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

    }, [loading, studentsData, paymentsData, absencesData, staffData, incidentsData, studentMap]);

    if (!schoolId) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
        >
            <Card className="glass-card h-full overflow-hidden relative">
                <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mt-16 blur-3xl" />
                <CardHeader>
                    <CardTitle className="text-xl font-bold">Activité Récente</CardTitle>
                    <CardDescription>Derniers événements dans votre établissement.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6 relative z-10">
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
                        ) : recentItems.length > 0 ? (
                            <div className="relative">
                                {/* Vertical line for timeline */}
                                <div className="absolute left-[1.25rem] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />

                                <div className="space-y-6">
                                    {recentItems.map((item, index) => (
                                        <motion.div
                                            key={item.id + item.type}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.3, delay: index * 0.05 }}
                                            className="flex items-center gap-4 group"
                                        >
                                            <div className={cn(
                                                "p-2.5 rounded-full relative z-10 transition-transform duration-300 group-hover:scale-110",
                                                item.type === 'payment' ? "bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
                                                    item.type === 'absence' ? "bg-orange-100/50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" :
                                                        item.type === 'incident' ? "bg-destructive/10 text-destructive" :
                                                            item.type === 'staff' ? "bg-cyan-100/50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400" :
                                                                "bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                            )}>
                                                <item.icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">
                                                    {item.content}
                                                </p>
                                                <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/60">
                                                    {item.timestamp ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: fr }) : ''}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-sm text-muted-foreground">Aucune activité récente à afficher.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
