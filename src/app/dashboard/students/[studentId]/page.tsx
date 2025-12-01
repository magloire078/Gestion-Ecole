'use client';

import { notFound, useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, BookUser, Building, Wallet, MessageSquare, Cake, School, Users, Shield, Hash, Calendar, Receipt, VenetianMask, MapPin, FileText, CalendarDays } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import { TuitionStatusBadge } from '@/components/tuition-status-badge';
import { Separator } from '@/components/ui/separator';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, collection, query, orderBy, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { allSubjects } from '@/lib/data';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TuitionReceipt, type ReceiptData } from '@/components/tuition-receipt';

interface Student {
  matricule?: string;
  name: string;
  class: string;
  classId: string;
  cycle?: string;
  dateOfBirth: string;
  placeOfBirth: string;
  gender: string;
  address: string;
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

interface GradeEntry {
    id: string;
    subject: string;
    type: 'Interrogation' | 'Devoir';
    date: string;
    grade: number;
    coefficient: number;
}

interface PaymentHistoryEntry {
    id: string;
    date: string;
    amount: number;
    description: string;
    accountingTransactionId: string;
    payerName: string;
    payerContact?: string;
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

const calculateAverages = (grades: GradeEntry[]) => {
    const gradesBySubject: Record<string, { totalPoints: number; totalCoeffs: number }> = {};

    grades.forEach(g => {
        if (!gradesBySubject[g.subject]) {
            gradesBySubject[g.subject] = { totalPoints: 0, totalCoeffs: 0 };
        }
        gradesBySubject[g.subject].totalPoints += g.grade * g.coefficient;
        gradesBySubject[g.subject].totalCoeffs += g.coefficient;
    });
    
    const averages: Record<string, number> = {};
    let totalPoints = 0;
    let totalCoeffs = 0;

    for (const subject in gradesBySubject) {
        const { totalPoints: subjectTotalPoints, totalCoeffs: subjectTotalCoeffs } = gradesBySubject[subject];
        if (subjectTotalCoeffs > 0) {
            const average = subjectTotalPoints / subjectTotalCoeffs;
            averages[subject] = average;
            totalPoints += subjectTotalPoints;
            totalCoeffs += subjectTotalCoeffs;
        }
    }
    
    const generalAverage = totalCoeffs > 0 ? totalPoints / totalCoeffs : null;

    return { subjectAverages: averages, generalAverage };
};

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;
  const firestore = useFirestore();
  const { schoolId, schoolName, loading: schoolLoading } = useSchoolData();

  const [receiptToView, setReceiptToView] = useState<ReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // --- Student Data ---
  const studentRef = useMemoFirebase(() => 
    (schoolId && studentId) ? doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`) : null
  , [firestore, schoolId, studentId]);
  const { data: studentData, loading: studentLoading } = useDoc<Student>(studentRef);
  const student = studentData;

  // --- Teacher and Class Data (Loaded separately) ---
  const [mainTeacher, setMainTeacher] = useState<Teacher | null>(null);
  const [studentClass, setStudentClass] = useState<Class | null>(null);
  const [classTeacherLoading, setClassTeacherLoading] = useState(true);

  useEffect(() => {
    async function fetchClassAndTeacher() {
        if (!firestore || !schoolId || !student?.classId) {
            setClassTeacherLoading(false);
            return;
        }

        setClassTeacherLoading(true);
        try {
            const classRef = doc(firestore, `ecoles/${schoolId}/classes/${student.classId}`);
            const classSnap = await getDoc(classRef);
            
            if (classSnap.exists()) {
                const classData = { id: classSnap.id, ...classSnap.data() } as Class;
                setStudentClass(classData);
                
                if (classData.mainTeacherId) {
                    const teacherRef = doc(firestore, `ecoles/${schoolId}/enseignants/${classData.mainTeacherId}`);
                    const teacherSnap = await getDoc(teacherRef);
                    if (teacherSnap.exists()) {
                        setMainTeacher({ id: teacherSnap.id, ...teacherSnap.data() } as Teacher);
                    } else {
                        setMainTeacher(null); // Teacher not found or deleted
                    }
                } else {
                  setMainTeacher(null); // No main teacher assigned
                }
            }
        } catch (error) {
            console.error("Error fetching class and teacher details:", error);
        } finally {
            setClassTeacherLoading(false);
        }
    }
    fetchClassAndTeacher();
  }, [firestore, schoolId, student?.classId]);


  // --- Grades and Payments ---
  const gradesQuery = useMemoFirebase(() =>
    (schoolId && studentId) ? query(collection(firestore, `ecoles/${schoolId}/eleves/${studentId}/notes`), orderBy('date', 'desc')) : null
  , [firestore, schoolId, studentId]);

  const paymentsQuery = useMemoFirebase(() =>
    (schoolId && studentId) ? query(collection(firestore, `ecoles/${schoolId}/eleves/${studentId}/paiements`), orderBy('date', 'desc')) : null
  , [firestore, schoolId, studentId]);

  const { data: gradesData, loading: gradesLoading } = useCollection<GradeEntry>(gradesQuery);
  const { data: paymentsData, loading: paymentsLoading } = useCollection<PaymentHistoryEntry>(paymentsQuery);
  
  const grades: GradeEntry[] = useMemo(() => gradesData?.map(d => ({ id: d.id, ...d.data() })) || [], [gradesData]);
  const paymentHistory: PaymentHistoryEntry[] = useMemo(() => paymentsData?.map(d => ({ id: d.id, ...d.data() })) || [], [paymentsData]);

  const { subjectAverages, generalAverage } = useMemo(() => calculateAverages(grades), [grades]);
  
  const isLoading = schoolLoading || studentLoading || classTeacherLoading || gradesLoading || paymentsLoading;
  
  const handleViewReceipt = (payment: PaymentHistoryEntry) => {
    if (!student) return;
    
    // Calculate the amount due *at the time of this payment*
    const currentPaymentIndex = paymentHistory.findIndex(p => p.id === payment.id);
    const paymentsUpToThisOne = paymentHistory.slice(currentPaymentIndex);
    const totalPaidSinceThisPayment = paymentsUpToThisOne.reduce((sum, p) => sum + p.amount, 0);
    const amountDueAtTimeOfPayment = student.amountDue + totalPaidSinceThisPayment - payment.amount;

    const receipt: ReceiptData = {
        schoolName: schoolName || "Votre École",
        studentName: student.name,
        studentMatricule: student.matricule || "N/A",
        className: student.class,
        date: new Date(payment.date),
        description: payment.description,
        amountPaid: payment.amount,
        amountDue: amountDueAtTimeOfPayment,
        payerName: payment.payerName,
        payerContact: payment.payerContact,
    };
    setReceiptToView(receipt);
    setIsReceiptOpen(true);
  };

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
                    <Skeleton className="h-48 w-full" />
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
    <>
    <div className="space-y-6">
       <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
                <h1 className="text-lg font-semibold md:text-2xl">Fiche d'Information de l'Élève</h1>
                <p className="text-muted-foreground">Vue détaillée du profil, des notes et des informations de l'élève.</p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push(`/dashboard/students/${studentId}/timetable`)}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Voir l'emploi du temps
                </Button>
                <Button onClick={() => router.push(`/dashboard/students/${studentId}/report`)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Voir le bulletin
                </Button>
            </div>
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
                             <CardDescription className='flex items-center gap-2'><Hash className='h-3 w-3' />{student.matricule || 'N/A'}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                         <div className="flex items-center">
                            <Cake className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Né(e) le <strong>{student.dateOfBirth ? format(new Date(student.dateOfBirth), 'd MMMM yyyy', { locale: fr }) : 'N/A'}</strong> à <strong>{student.placeOfBirth}</strong></span>
                        </div>
                        <div className="flex items-center">
                            <VenetianMask className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Sexe: <strong>{student.gender || 'N/A'}</strong></span>
                        </div>
                        <div className="flex items-start">
                            <MapPin className="mr-3 h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <span>Adresse: <strong>{student.address || 'N/A'}</strong></span>
                        </div>
                        <Separator />
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
                            <span>Cycle: <strong>{studentClass?.cycle || student.cycle || 'N/A'}</strong></span>
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
                                <p className="text-3xl font-bold text-primary">{generalAverage !== null ? generalAverage.toFixed(2) : 'N/A'}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Matière</TableHead><TableHead className="text-right">Moyenne</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {allSubjects.map((subject) => {
                                    const average = subjectAverages[subject];
                                    const subjectGrades = grades.filter(g => g.subject === subject);

                                    if(subjectGrades.length === 0) return null; // Don't show subjects with no grades

                                    return (
                                        <React.Fragment key={subject}>
                                            <TableRow>
                                                <TableCell className="font-medium">{subject}</TableCell>
                                                <TableCell className="text-right font-mono text-lg">{average !== undefined ? average.toFixed(2) : 'N/A'}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell colSpan={2} className="p-0">
                                                    <div className="px-4 py-2 bg-muted/50">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead className="h-8 text-xs">Date</TableHead>
                                                                    <TableHead className="h-8 text-xs">Type</TableHead>
                                                                    <TableHead className="h-8 text-xs text-right">Note</TableHead>
                                                                    <TableHead className="h-8 text-xs text-right">Coeff.</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {subjectGrades.map(grade => (
                                                                    <TableRow key={grade.id} className="bg-muted/50">
                                                                        <TableCell className="py-1 text-xs">{format(new Date(grade.date), 'd MMM', { locale: fr })}</TableCell>
                                                                        <TableCell className="py-1 text-xs">{grade.type}</TableCell>
                                                                        <TableCell className="py-1 text-xs text-right">{grade.grade}/20</TableCell>
                                                                        <TableCell className="py-1 text-xs text-right">x{grade.coefficient}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                })}
                                 {grades.length === 0 && (
                                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">Aucune note enregistrée pour cet élève.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /><span>Appréciations</span></CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground italic">"{student.feedback || "Aucune appréciation pour le moment."}"</p></CardContent>
                    </Card>
                </div>
                 <Card>
                    <CardHeader>
                        <CardTitle>Historique des Paiements</CardTitle>
                        <CardDescription>Liste de tous les versements de scolarité effectués.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Montant</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paymentHistory.length > 0 ? (
                                    paymentHistory.map(payment => (
                                        <TableRow key={payment.id}>
                                            <TableCell>{format(new Date(payment.date), 'd MMMM yyyy', {locale: fr})}</TableCell>
                                            <TableCell>{payment.description}</TableCell>
                                            <TableCell className="text-right font-mono">{payment.amount.toLocaleString('fr-FR')} CFA</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => handleViewReceipt(payment)}>
                                                    <Receipt className="mr-2 h-3 w-3" /> Reçu
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">Aucun paiement enregistré.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
     <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reçu de Paiement</DialogTitle>
            <DialogDescription>Aperçu du reçu. Vous pouvez l'imprimer.</DialogDescription>
          </DialogHeader>
          {receiptToView && <TuitionReceipt receiptData={receiptToView} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
