
'use client';
import { useMemo } from 'react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { school as School } from '@/lib/data-types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export function RecentSchoolsList() {
    const firestore = useFirestore();
    const { user } = useUser();

    const schoolsQuery = useMemo(() =>
        user?.profile?.isAdmin ? query(collection(firestore, 'ecoles'), orderBy('createdAt', 'desc'), limit(5)) : null
        , [firestore, user?.profile?.isAdmin]);

    const { data: schoolsData, loading } = useCollection(schoolsQuery);

    const recentSchools = useMemo(() =>
        schoolsData?.map(doc => ({ id: doc.id, ...doc.data() as School })) || []
        , [schoolsData]);

    if (loading) {
        return (
            <Card className="rounded-[40px] border-blue-50/50 dark:border-white/10 shadow-sm overflow-hidden bg-white/50 dark:bg-[hsl(var(--admin-card))]/50 backdrop-blur-sm">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-2xl font-black text-[hsl(var(--admin-primary-dark))] dark:text-white font-outfit tracking-tight">Nouvelles Écoles</CardTitle>
                    <CardDescription className="text-slate-500 font-medium">Les 5 derniers établissements inscrits.</CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="rounded-[40px] border-blue-50/50 dark:border-white/10 shadow-sm overflow-hidden bg-white/50 dark:bg-[hsl(var(--admin-card))]/50 backdrop-blur-sm">
            <CardHeader className="p-8 pb-4">
                <CardTitle className="text-2xl font-black text-[hsl(var(--admin-primary-dark))] dark:text-white font-outfit tracking-tight">Nouvelles Écoles</CardTitle>
                <CardDescription className="text-slate-500 font-medium">Les 5 derniers établissements inscrits.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
                <div className="space-y-4">
                    {recentSchools.map((school, idx) => (
                        <div key={school.id} className="group flex items-center p-3 rounded-2xl hover:bg-white dark:hover:bg-white/10 hover:shadow-lg hover:shadow-blue-900/5 transition-all">
                            <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-800 ring-4 ring-blue-50/50 dark:ring-white/5">
                                <AvatarImage src={school.mainLogoUrl || undefined} alt={school.name} />
                                <AvatarFallback className="bg-blue-50 dark:bg-white/10 text-[hsl(var(--admin-primary))] font-bold">{school.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div className="ml-4 space-y-0.5">
                                <p className="text-sm font-black text-[hsl(var(--admin-primary-dark))] dark:text-white font-outfit leading-tight">{school.name}</p>
                                <p className="text-xs text-slate-400 font-medium">{school.directorEmail}</p>
                            </div>
                            <div className="ml-auto flex flex-col items-end">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--admin-primary))] mb-1">Inscription</span>
                                <div className="text-xs font-bold text-slate-400">
                                    {school.createdAt ? (
                                        (() => {
                                            try {
                                                const date = school.createdAt?.toDate ? school.createdAt.toDate() : new Date(school.createdAt);
                                                return formatDistanceToNow(date, { addSuffix: false, locale: fr });
                                            } catch (e) {
                                                return '--';
                                            }
                                        })()
                                    ) : '--'}
                                </div>
                            </div>
                        </div>
                    ))}
                    {recentSchools.length === 0 && (
                        <div className="text-center py-10 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                            <p className="text-sm font-bold text-slate-400 italic">
                                Aucune inscription récente détectée.
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
