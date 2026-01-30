'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, BookUser, Briefcase, DollarSign, ArrowRight } from 'lucide-react';
import type { staff as Staff } from '@/lib/data-types';
import { useSchoolData } from '@/hooks/use-school-data';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { StatCard } from '@/components/ui/stat-card';

export default function RHDashboardPage() {
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();

    const staffQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
    const { data: staffData, loading: staffLoading } = useCollection(staffQuery);

    const staff: (Staff & { id: string })[] = useMemo(() => staffData?.map(doc => ({ id: doc.id, ...doc.data() } as Staff & { id: string })) || [], [staffData]);
    
    const recentHires = useMemo(() => {
        return staff
            .sort((a, b) => new Date(b.hireDate).getTime() - new Date(a.hireDate).getTime())
            .slice(0, 5);
    }, [staff]);

    const stats = useMemo(() => {
        const totalStaff = staff.length;
        const teachers = staff.filter(s => s.role === 'enseignant' || s.role === 'enseignant_principal').length;
        const adminStaff = totalStaff - teachers;
        const totalSalaryMass = staff.reduce((acc, s) => acc + (s.baseSalary || 0), 0);

        return {
            totalStaff,
            teachers,
            adminStaff,
            totalSalaryMass,
        };
    }, [staff]);

    const loading = schoolLoading || staffLoading;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total du Personnel" value={stats.totalStaff} icon={Users} loading={loading} />
                <StatCard title="Enseignants" value={stats.teachers} icon={BookUser} loading={loading} />
                <StatCard title="Personnel Administratif" value={stats.adminStaff} icon={Briefcase} loading={loading} />
                <StatCard title="Masse Salariale Mensuelle" value={stats.totalSalaryMass.toLocaleString('fr-FR') + ' CFA'} icon={DollarSign} loading={loading} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Derniers Recrutements</CardTitle>
                    <CardDescription>Les 5 derniers membres du personnel ajoutés.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="space-y-4">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div> : recentHires.length > 0 ? (
                    <div className="space-y-3">
                        {recentHires.map(staffMember => (
                             <Link href={`/dashboard/rh/${staffMember.id}`} key={staffMember.id} className="block hover:bg-muted/50 p-3 rounded-lg border -mx-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={staffMember.photoURL || undefined} />
                                            <AvatarFallback>{staffMember.firstName?.[0]}{staffMember.lastName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{staffMember.firstName} {staffMember.lastName}</p>
                                            <p className="text-sm text-muted-foreground capitalize">{staffMember.role?.replace(/_/g, ' ')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm text-muted-foreground">
                                        Recruté {formatDistanceToNow(new Date(staffMember.hireDate), { addSuffix: true, locale: fr })}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">Aucun personnel récemment ajouté.</div>
                    )}
                </CardContent>
                 <CardFooter>
                    <Button asChild variant="outline">
                        <Link href="/dashboard/rh/personnel">Voir tout le personnel <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
