'use client';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import type { student as Student } from '@/lib/data-types';
import { SafeImage } from '../ui/safe-image';
import { ChevronRight } from 'lucide-react';

interface ParentStudentCardProps {
    schoolId: string;
    studentId: string;
}

export function ParentStudentCard({ schoolId, studentId }: ParentStudentCardProps) {
    const firestore = useFirestore();
    const studentRef = useMemoFirebase(() => doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`), [firestore, schoolId, studentId]);
    const { data: student, loading } = useDoc<Student>(studentRef);

    if (loading) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </CardHeader>
            </Card>
        );
    }
    
    if (!student) {
        return (
             <Card>
                <CardHeader>
                    <p className="text-destructive">Impossible de charger les informations pour l'élève ID: {studentId}</p>
                </CardHeader>
            </Card>
        );
    }
    
    const studentFullName = `${student.firstName} ${student.lastName}`;
    const fallback = studentFullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <Link href={`/dashboard/dossiers-eleves/${studentId}`}>
            <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <SafeImage src={student.photoUrl} alt={studentFullName} />
                            <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-bold">{studentFullName}</p>
                            <p className="text-sm text-muted-foreground">{student.class}</p>
                        </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
            </Card>
        </Link>
    )
}
