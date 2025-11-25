
'use client';

import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, BookUser, Building, Wallet, MessageSquare, Cake, School, Users, Shield } from 'lucide-react';
import { useMemo } from 'react';
import { TuitionStatusBadge } from '@/components/tuition-status-badge';
import { Separator } from '@/components/ui/separator';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthProtection } from '@/hooks/use-auth-protection';

interface Student {
  name: string;
  class: string;
  classId: string;
  dateOfBirth: string;
  placeOfBirth: string;
  previousSchool: string;
  parent1Name: string;
  parent1Contact: string;
  parent2Name: string;
  parent2Contact: string;
  guardianName?: string;
  guardianContact?: string;
  feedback: string;
  tuitionStatus: 'Soldé' | 'En retard' | 'Partiel';
  amountDue: number;
}

interface Teacher {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
  mainTeacherId: string;
  cycle: string;
}

export default function StudentProfilePage() {
  const { isLoading: isAuthLoading, AuthProtectionLoader } = useAuthProtection();
  const params = useParams();
  const studentId = params.studentId as string;
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  const studentRef = useMemoFirebase(() => 
    (schoolId && studentId) ? doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`) : null
  , [firestore, schoolId, studentId]);

  const { data: studentData, loading: studentLoading } = useDoc(studentRef);
  const student = studentData as Student | null;

  const classRef = useMemoFirebase(() => 
    (schoolId && student?.classId) ? doc(firestore, `ecoles/${schoolId}/classes/${student.classId}`) : null
  , [firestore, schoolId, student?.classId]);

  const { data: classData, loading: classLoading } = useDoc(classRef);
  const studentClass = classData as Class | null;

  const teacherRef = useMemoFirebase(() => 
    (schoolId && studentClass?.mainTeacherId) ? doc(firestore, `ecoles/${schoolId}/enseignants/${studentClass.mainTeacherId}`) : null
  , [firestore, schoolId, studentClass?.mainTeacherId]);

  const { data: teacherData, loading: teacherLoading } = useDoc(teacherRef);
  const mainTeacher = teacherData as Teacher | null;
  
  // Note: Grades are still mock data as per request to focus on main pages first
  const studentGrades = []; // mockGradeData.filter(g => g.studentId === studentId);
  const averageGrade = 'N/A'; // For now

  const isLoading = schoolLoading || studentLoading || classLoading || teacherLoading;

  if (isAuthLoading) {
    return <AuthProtectionLoader />;
  }

  if (isLoading) {
    return (
        <div className="space-y-6">
            <div>
                <Skeleton className="h-8 w-96 mb-2" />
                <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <Skeleton className="h-56 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            </div>
        </div>
    );
  }

  if (!student) {
    notFound();
  }
  
  const fallback = student.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();


  return (
    <div className="space-y-6">
       <div>
            <h1 className="text-lg font-semibold md:text-2xl">Fiche d'Information de l'Élève</h1>
            <p className="text-muted-foreground">Vue détaillée du profil, des notes et des informations de l'élève.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 flex flex-col gap-6">
                 <Card>
                    <CardHeader className="flex-row items-center gap-4 pb-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={`https://picsum.photos/seed/${studentId}/100/100`} alt={student.name} data-ai-hint="person face" />
                            <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        <div>
                             <CardTitle className="text-2xl">{student.name}</CardTitle>
                             <CardDescription>Matricule: {studentId}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                         <div className="flex items-center">
                            <Cake className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Né(e) le <strong>{student.dateOfBirth}</strong> à <strong>{student.placeOfBirth}</strong></span>
                        </div>
                        <div className="flex items-center">
                            <BookUser className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Classe: <strong>{student.class}</strong></span>
                        </div>
                        <div className="flex items-center">
                            <User className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Prof. Principal: <strong>{mainTeacher?.name || 'N/A'}</strong></span>
                        </div>
                        <div className="flex items-center">
                            <Building className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Cycle: <strong>{studentClass?.cycle || 'N/A'}</strong></span>
                        </div>
                        <div className="flex items-center">
                            <School className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Ancien Etab.: <strong>{student.previousSchool || 'N/A'}</strong></span>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /><span>Contacts des Parents</span></CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-3 text-sm">
                        <div className="font-medium">{student.parent1Name}</div>
                        <a href={`tel:${student.parent1Contact}`} className="text-muted-foreground hover:text-primary">{student.parent1Contact}</a>
                        {student.parent2Name && (
                            <>
                                <Separator className="my-3"/>
                                <div className="font-medium">{student.parent2Name}</div>
                                <a href={`tel:${student.parent2Contact}`} className="text-muted-foreground hover:text-primary">{student.parent2Contact}</a>
                            </>
                        )}
                    </CardContent>
                </Card>
                 {student.guardianName && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /><span>Contact du Tuteur</span></CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                             <div className="font-medium">{student.guardianName}</div>
                            <a href={`tel:${student.guardianContact}`} className="text-muted-foreground hover:text-primary">{student.guardianContact}</a>
                        </CardContent>
                    </Card>
                )}
            </div>
            <div className="lg:col-span-2 flex flex-col gap-6">
                 <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Résultats Scolaires</CardTitle>
                                <CardDescription>Notes et moyenne générale de l'élève.</CardDescription>
                            </div>
                             <div className="text-right">
                                <p className="text-sm text-muted-foreground">Moyenne Générale</p>
                                <p className="text-3xl font-bold text-primary">{averageGrade}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Matière</TableHead><TableHead className="text-right">Note</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {studentGrades.length > 0 ? studentGrades.map((grade: any) => (
                                    <TableRow key={grade.id}><TableCell className="font-medium">{grade.subject}</TableCell><TableCell className="text-right font-mono text-lg">{grade.score}/20</TableCell></TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">Aucune note enregistrée pour cet élève.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <div className="grid grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /><span>Scolarité</span></CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-lg">
                            <span className="text-muted-foreground">Statut</span>
                            <TuitionStatusBadge status={student.tuitionStatus} />
                            </div>
                            <div className="flex justify-between items-center text-lg">
                            <span className="text-muted-foreground">Solde dû</span>
                            <span className="font-bold text-primary">{student.amountDue > 0 ? `${student.amountDue.toLocaleString('fr-FR')} CFA` : '-'}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /><span>Feedback</span></CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground italic">"{student.feedback || "Aucun feedback pour le moment."}"</p></CardContent>
                    </Card>
                </div>
            </div>
        </div>
    </div>
  );
}
