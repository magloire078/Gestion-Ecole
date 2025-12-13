
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { classe as Classe } from '@/lib/data-types';

interface ClassesGridViewProps {
    cycleId: string;
}

export function ClassesGridView({ cycleId }: ClassesGridViewProps) {
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();

    const classesQuery = useMemoFirebase(() => {
        if (!schoolId) return null;
        if (cycleId === 'all') {
            return query(collection(firestore, `ecoles/${schoolId}/classes`));
        }
        return query(collection(firestore, `ecoles/${schoolId}/classes`), where('cycleId', '==', cycleId));
    }, [schoolId, cycleId, firestore]);

    const { data: classesData, loading: classesLoading } = useCollection(classesQuery);

    const classes = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Classe & { id: string })) || [], [classesData]);

    const isLoading = schoolLoading || classesLoading;

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
            </div>
        );
    }
    
    if (classes.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Aucune classe trouvée pour ce cycle.</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classe) => (
                <Card key={classe.id} className="flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{classe.name}</CardTitle>
                                <CardDescription>{classe.academicYear}</CardDescription>
                            </div>
                            <Badge variant={classe.status === 'active' ? 'secondary' : 'outline'}>{classe.status}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="h-4 w-4 mr-2" />
                            <span>{classe.studentCount} / {classe.maxStudents} élèves</span>
                        </div>
                         <div className="flex items-center text-sm text-muted-foreground">
                            <User className="h-4 w-4 mr-2" />
                            <span>Prof. Principal: {classe.mainTeacherName || 'Non assigné'}</span>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline" className="w-full">
                            <Link href={`/dashboard/classes/${classe.id}`}>
                                Gérer la classe <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
