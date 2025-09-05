
'use client';

import { notFound, useParams } from 'next/navigation';
import { mockStudentData, mockGradeData, mockClassData, mockTeacherData } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, BookUser, Building, Hash, Wallet, MessageSquare, BadgeCent } from 'lucide-react';
import { useMemo } from 'react';

type TuitionStatus = 'Payé' | 'En retard' | 'Partiel';

const TuitionStatusBadge = ({ status }: { status: TuitionStatus }) => {
  switch (status) {
    case 'Payé':
      return <Badge variant="secondary" className="text-base bg-emerald-100 text-emerald-800">Payé</Badge>;
    case 'En retard':
      return <Badge variant="destructive" className="text-base">En retard</Badge>;
    case 'Partiel':
      return <Badge variant="secondary" className="text-base bg-amber-100 text-amber-800">Partiel</Badge>;
    default:
      return null;
  }
};

export default function StudentProfilePage() {
  const params = useParams();
  const studentId = params.studentId as string;

  const student = mockStudentData.find(s => s.id === studentId);
  const studentGrades = mockGradeData.filter(g => g.studentId === studentId);
  
  const studentClass = useMemo(() => 
    mockClassData.find(c => c.name === student?.class),
  [student]);
  
  const mainTeacher = useMemo(() =>
    mockTeacherData.find(t => t.id === studentClass?.mainTeacherId),
  [studentClass]);

  const averageGrade = useMemo(() => {
    if (studentGrades.length === 0) return 'N/A';
    const total = studentGrades.reduce((acc, g) => acc + g.score, 0);
    return (total / studentGrades.length).toFixed(2);
  }, [studentGrades]);

  if (!student) {
    notFound();
  }

  return (
    <div className="space-y-6">
       <div>
            <h1 className="text-lg font-semibold md:text-2xl">Fiche d'information de l'élève</h1>
            <p className="text-muted-foreground">Vue détaillée du profil, des notes et des informations de l'élève.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 flex flex-col gap-6">
                 <Card>
                    <CardHeader className="flex-row items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={`https://picsum.photos/seed/${student.id}/100/100`} alt={student.name} data-ai-hint="person face" />
                            <AvatarFallback>{student.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                             <CardTitle className="text-2xl">{student.name}</CardTitle>
                             <CardDescription>ID Élève: {student.id}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         <div className="flex items-center text-sm">
                            <BookUser className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Classe: <strong>{student.class}</strong></span>
                        </div>
                        <div className="flex items-center text-sm">
                            <User className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Prof. Principal: <strong>{mainTeacher?.name || 'N/A'}</strong></span>
                        </div>
                        <div className="flex items-center text-sm">
                            <Building className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Cycle: <strong>{studentClass?.cycle || 'N/A'}</strong></span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5" />
                            <span>Scolarité</span>
                        </CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-lg">
                           <span className="text-muted-foreground">Statut</span>
                           <TuitionStatusBadge status={student.tuitionStatus} />
                        </div>
                         <div className="flex justify-between items-center text-lg">
                           <span className="text-muted-foreground">Solde dû</span>
                           <span className="font-bold text-primary">{student.amountDue.toLocaleString('fr-FR')} CFA</span>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <MessageSquare className="h-5 w-5" />
                            <span>Feedback</span>
                        </CardTitle>
                    </CardHeader>
                     <CardContent>
                        <p className="text-sm text-muted-foreground italic">"{student.feedback || "Aucun feedback pour le moment."}"</p>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
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
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Matière</TableHead>
                                    <TableHead className="text-right">Note</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentGrades.length > 0 ? studentGrades.map(grade => (
                                    <TableRow key={grade.id}>
                                        <TableCell className="font-medium">{grade.subject}</TableCell>
                                        <TableCell className="text-right font-mono text-lg">{grade.score}/20</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground py-8">Aucune note enregistrée pour cet élève.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
