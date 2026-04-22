'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, BookX, CalendarClock, ArrowRight, BellRing } from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { AnimatePresence } from 'framer-motion';

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
    const { data: pendingLeavesData, loading: leavesLoading } = useCollection(pendingLeavesQuery, { name: 'ActionItems:pendingLeaves' });

    // Query for students with overdue fees
    const overdueStudentsQuery = useMemo(() => {
        if (!schoolId || !user?.profile?.permissions?.manageBilling) return null;
        return query(collection(firestore, `ecoles/${schoolId}/eleves`), where('tuitionStatus', '==', 'En retard'));
    }, [schoolId, firestore, user?.profile?.permissions?.manageBilling]);
    const { data: overdueStudentsData, loading: studentsLoading } = useCollection(overdueStudentsQuery, { name: 'ActionItems:overdueStudents' });

    // Query for overdue books
    const overdueLoansQuery = useMemo(() => {
        if (!schoolId || !user?.profile?.permissions?.manageLibrary) return null;
        // The 'overdue' status is set manually or by a function. We can just query for it.
        return query(collection(firestore, `ecoles/${schoolId}/bibliotheque_prets`), where('status', '==', 'overdue'));
    }, [schoolId, firestore, user?.profile?.permissions?.manageLibrary]);
    const { data: overdueLoansData, loading: loansLoading } = useCollection(overdueLoansQuery, { name: 'ActionItems:overdueLoans' });

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
            <Card className="glass-card overflow-hidden">
                <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-1/3 bg-white/10" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-14 w-full bg-white/5" />
                    <Skeleton className="h-14 w-full bg-white/5" />
                </CardContent>
            </Card>
        );
    }

    if (actionItems.length === 0) {
        return null; // Don't show the card if there's nothing to do
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -20 },
        show: { opacity: 1, x: 0 }
    };

    if (loading) {
        return (
            <Card className="glass-card overflow-hidden">
                <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-1/3 bg-white/10" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-14 w-full bg-white/5" />
                    <Skeleton className="h-14 w-full bg-white/5" />
                </CardContent>
            </Card>
        );
    }

    if (actionItems.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
        >
            <Card className="glass-card relative overflow-hidden group border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all duration-500">
                {/* Animated urgency glow background */}
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-amber-500/10 blur-[60px] rounded-full group-hover:bg-amber-500/20 transition-all duration-700" />
                
                <CardHeader className="relative z-10 pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight text-amber-500">
                        <div className="p-2 rounded-lg bg-amber-500/20 backdrop-blur-md">
                            <BellRing className="h-5 w-5 animate-pulse" />
                        </div>
                        Actions Requises
                    </CardTitle>
                </CardHeader>

                <CardContent className="relative z-10 space-y-3">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="space-y-3"
                    >
                        {actionItems.map((item, index) => (
                            <Link href={item.href} key={index} className="block group/item">
                                <motion.div
                                    variants={itemVariants}
                                    whileHover={{ scale: 1.02, x: 5 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="relative p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:border-amber-500/30 transition-all duration-300 flex items-center justify-between overflow-hidden"
                                >
                                    {/* Hover Shine Effect */}
                                    <div className="absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-700">
                                        <div className="absolute inset-0 translate-x-[-100%] group-hover/item:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                            <item.icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-black text-white leading-none tracking-tighter">
                                                    {item.count}
                                                </span>
                                                <span className="text-sm font-medium text-amber-200/70">
                                                    {item.label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-amber-500 group-hover/item:bg-amber-500 group-hover/item:text-white transition-all duration-300 shadow-lg group-hover/item:shadow-amber-500/40">
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                </motion.div>
                            </Link>
                        ))}
                    </motion.div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
