'use client';

import { useParams, useRouter, notFound } from 'next/navigation';
import { useMemo } from 'react';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, collection, query, where, type DocumentReference, type DocumentData, type Query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Users } from 'lucide-react';
import Link from 'next/link';
import { TuitionStatusBadge } from '@/components/tuition-status-badge';
import type { class_type as Class, student as Student } from '@/lib/data-types';

function ClassDetailsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10" />
                <div className="space-y-2">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-96" />
        </div>
    );
}

export default function ClassDetailsClient() {
    const params = useParams();
    const router = useRouter();
    const classId = params.classId as string;
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();

    // Fetch Class Details
    const classRef = useMemo(() =>
        (schoolId && classId) ? doc(firestore, `ecoles/${schoolId}/classes/${classId}`) as DocumentReference<Class, DocumentData> : null
        , [firestore, schoolId, classId]);
    const { data: classData, loading: classLoading } = useDoc<Class>(classRef);

    // Fetch Students in this class
    const studentsQuery = useMemo(() =>
        (schoolId && classId) ? query(collection(firestore, `ecoles/${schoolId}/eleves`), where('classId', '==', classId)) as Query<Student, DocumentData> : null
        , [firestore, schoolId, classId]);
    const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);

    const students = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);

    const isLoading = schoolLoading || classLoading || studentsLoading;

    if (isLoading) {
        return <ClassDetailsSkeleton />;
    }

    if (!classData) {
        notFound();
    }

    const formatCurrency = (value: number | undefined) => {
        if (value === undefined) return 'N/A';
        return `${value.toLocaleString('fr-FR')} CFA`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Retour</span>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{classData.name}</h1>
                    <p className="text-muted-foreground">Année scolaire {classData.academicYear}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Enseignant Principal</CardDescription>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <User className="h-5 w-5" />
                            {classData.mainTeacherName || 'Non assigné'}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Effectif</CardDescription>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {classData.studentCount} / {classData.maxStudents} élèves
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Taux de remplissage</CardDescription>
                        <CardTitle className="text-xl">
                            {classData.maxStudents > 0 ? `${Math.round((classData.studentCount / classData.maxStudents) * 100)}%` : 'N/A'}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Liste des Élèves de la Classe</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Matricule</TableHead>
                                <TableHead className="text-center">Statut Scolarité</TableHead>
                                <TableHead className="text-right">Solde Dû</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.length > 0 ? students.map(student => (
                                <TableRow key={student.id}>
                                    <TableCell>
                                        <Link href={`/dashboard/dossiers-eleves/${student.id}`} className="flex items-center gap-3 hover:underline">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={student.photoUrl || ''} alt={`${student.firstName} ${student.lastName}`} />
                                                <AvatarFallback>{student.firstName?.[0]}{student.lastName?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{student.firstName} {student.lastName}</span>
                                        </Link>
                                    </TableCell>
                                    <TableCell>{student.matricule}</TableCell>
                                    <TableCell className="text-center">
                                        <TuitionStatusBadge status={student.tuitionStatus || 'Partiel'} />
                                    </TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(student.amountDue)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">Aucun élève dans cette classe.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
