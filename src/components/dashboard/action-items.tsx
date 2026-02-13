'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, BookX, CalendarClock, ArrowRight } from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';

interface ActionItem {
    label: string;
    count: number;
    href: string;
    icon: React.ElementType;
}

export function ActionItems() {
    const { user } = useUser();
    const { schoolId } = useSchoolData();
    const firestore = useFirestore();

    // Query for pending leave requests
    const pendingLeavesQuery = useMemo(() => {
        if (!schoolId || !user?.profile?.permissions?.manageUsers) return null;
        return query(collection(firestore, `ecoles/${schoolId}/conges_personnel`), where('status', '==', 'En attente'));
    }, [schoolId, firestore, user?.profile?.permissions?.manageUsers]);
    const { data: pendingLeavesData, loading: leavesLoading } = useCollection(pendingLeavesQuery);

    // Query for students with overdue fees
    const overdueStudentsQuery = useMemo(() => {
        if (!schoolId || !user?.profile?.permissions?.manageBilling) return null;
        return query(collection(firestore, `ecoles/${schoolId}/eleves`), where('tuitionStatus', '==', 'En retard'));
    }, [schoolId, firestore, user?.profile?.permissions?.manageBilling]);
    const { data: overdueStudentsData, loading: studentsLoading } = useCollection(overdueStudentsQuery);

    // Query for overdue books
    const overdueLoansQuery = useMemo(() => {
        if (!schoolId || !user?.profile?.permissions?.manageLibrary) return null;
        // The 'overdue' status is set manually or by a function. We can just query for it.
        return query(collection(firestore, `ecoles/${schoolId}/bibliotheque_prets`), where('status', '==', 'overdue'));
    }, [schoolId, firestore, user?.profile?.permissions?.manageLibrary]);
    const { data: overdueLoansData, loading: loansLoading } = useCollection(overdueLoansQuery);

    const loading = leavesLoading || studentsLoading || loansLoading;

    const actionItems: ActionItem[] = useMemo(() => {
        const items: ActionItem[] = [];
        if (pendingLeavesData && pendingLeavesData.length > 0) {
            items.push({
                label: `demande(s) de congé en attente`,
                count: pendingLeavesData.length,
                href: '/dashboard/rh/conges',
                icon: CalendarClock
            });
        }
        if (overdueStudentsData && overdueStudentsData.length > 0) {
            items.push({
                label: `élève(s) avec scolarité en retard`,
                count: overdueStudentsData.length,
                href: '/dashboard/paiements',
                icon: AlertTriangle
            });
        }
        if (overdueLoansData && overdueLoansData.length > 0) {
            items.push({
                label: `livre(s) en retard`,
                count: overdueLoansData.length,
                href: '/dashboard/bibliotheque',
                icon: BookX
            });
        }
        return items;
    }, [pendingLeavesData, overdueStudentsData, overdueLoansData]);

    if (loading) {
        return (
            <Card>
                <CardHeader><CardTitle>Actions Requises</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (actionItems.length === 0) {
        return null; // Don't show the card if there's nothing to do
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="glass-card border-amber-200/50 dark:border-amber-900/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Actions Requises
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {actionItems.map((item, index) => (
                        <Link href={item.href} key={index} className="block">
                            <motion.div
                                whileHover={{ x: 5 }}
                                className="p-3 rounded-md border border-amber-200/50 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    <div>
                                        <span className="font-bold text-lg text-amber-700 dark:text-amber-300">{item.count}</span>
                                        <span className="text-sm ml-2">{item.label}</span>
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </motion.div>
                        </Link>
                    ))}
                </CardContent>
            </Card>
        </motion.div>
    );
}
