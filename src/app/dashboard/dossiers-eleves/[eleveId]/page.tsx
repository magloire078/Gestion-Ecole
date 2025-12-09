
'use client';

import { notFound, useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, BookUser, Building, Wallet, MessageSquare, Cake, School, Users, Hash, Receipt, VenetianMask, MapPin, FileText, CalendarDays, FileSignature } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TuitionReceipt, type ReceiptData } from '@/components/tuition-receipt';
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { teacher as Teacher, class_type as Class, student as Student, gradeEntry as GradeEntry, payment as Payment } from '@/lib/data-types';
import { useHydrationFix } from '@/hooks/use-hydration-fix';

const getStatusBadgeVariant = (status: Student['status']) => {
    switch (status) {
        case 'Actif':
            return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
        case 'Radié':
            return 'bg-destructive/80 text-destructive-foreground';
        case 'En attente':
            return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
        default:
            return 'bg-secondary text-secondary-foreground';
    }
};

const calculateAverages = (grades: GradeEntry[]) => {
    const gradesBySubject: Record<string, { totalPoints: number; totalCoeffs: number }> = {};

    grades.forEach(g => {
        if (!gradesBySubject[g.subject]) {
            gradesBySubject[g.subject] = { totalPoints: 0, totalCoeffs: 0 };
        }
        gradesBySubject[g.subject].totalPoints += g.grade * g.coefficient;
        gradesBySubject[g.subject].totalCoeffs += g.coefficient;
    });
    
    const averages: Record<string, {average: number, totalCoeffs: number}> = {};
    let totalPoints = 0;
    let totalCoeffs = 0;

    for (const subject in gradesBySubject) {
        const { totalPoints: subjectTotalPoints, totalCoeffs: subjectTotalCoeffs } = gradesBySubject[subject];
        if (subjectTotalCoeffs > 0) {
            const average = subjectTotalPoints / subjectTotalCoeffs;
            averages[subject] = { average, totalCoeffs: subjectTotalCoeffs };
            totalPoints += subjectTotalPoints;
            totalCoeffs += subjectTotalCoeffs;
        }
    }
    
    const generalAverage = totalCoeffs > 0 ? totalPoints / totalCoeffs : 0;

    return { subjectAverages: averages, generalAverage };
};

interface PaymentHistoryEntry extends Payment {
    id: string;
}


export default function StudentProfilePage() {
  const isMounted = useHydrationFix();
  const params = useParams();
  const router = useRouter();
  const studentId = params.eleveId as string;
  const firestore = useFirestore();
  const { schoolId, schoolName, loading: schoolLoading } = useSchoolData();

  const [receiptToView, setReceiptToView] = useState<ReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // --- Student Data ---
  const studentRef = useMemoFirebase(() => 
    (schoolId && studentId) ? doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`) : null
  , [firestore, schoolId, studentId]);
  const { data: student, loading: studentLoading } = useDoc<Student>(studentRef);

  // --- Related Data ---
  const gradesQuery = useMemoFirebase(() => schoolId && studentId ? query(collection(firestore, `ecoles/${schoolId}/eleves/${studentId}/notes`), orderBy('date', 'desc')) : null, [schoolId, studentId]);
  const paymentsQuery = useMemoFirebase(() => schoolId && studentId ? query(collection(firestore, `ecoles/${schoolId}/eleves/${studentId}/paiements`), orderBy('date', 'desc')) : null, [schoolId, studentId]);
  
  const { data: gradesData, loading: gradesLoading } = useCollection(gradesQuery);
  const { data: paymentHistoryData, loading: paymentsLoading } = useCollection(paymentsQuery);
  
  const grades: GradeEntry[] = useMemo(() => gradesData?.map(d => ({ id: d.id, ...d.data() } as GradeEntry)) || [], [gradesData]);
  const paymentHistory: PaymentHistoryEntry[] = useMemo(() => paymentHistoryData?.map(d => ({ id: d.id, ...d.data() } as PaymentHistoryEntry)) || [], [paymentHistoryData]);

  const classRef = useMemoFirebase(() => student?.classId && schoolId ? doc(firestore, `ecoles/${schoolId}/classes/${student.classId}`) : null, [student, schoolId]);
  const { data: studentClass, loading: classLoading } = useDoc<Class>(classRef);
  
  const teacherRef = useMemoFirebase(() => studentClass?.mainTeacherId && schoolId ? doc(firestore, `ecoles/${schoolId}/enseignants/${studentClass.mainTeacherId}`) : null, [studentClass, schoolId]);
  const { data: mainTeacher, loading: teacherLoading } = useDoc<Teacher>(teacherRef);
  
  const studentFullName = student ? `${student.firstName} ${student.lastName}` : '';
  const { subjectAverages, generalAverage } = useMemo(() => calculateAverages(grades), [grades]);
  
  const isLoading = schoolLoading || studentLoading || gradesLoading || paymentsLoading || classLoading || teacherLoading;
  
  const handleViewReceipt = (payment: PaymentHistoryEntry) => {
    if (!student) return;
    
    const currentPaymentIndex = paymentHistory.findIndex(p => p.id === payment.id);
    const paymentsUpToThisOne = paymentHistory.slice(currentPaymentIndex);
    const totalPaidSinceThisPayment = paymentsUpToThisOne.reduce((sum, p) => sum + p.amount, 0);
    const amountDueAtTimeOfPayment = (student.amountDue ?? 0) + totalPaidSinceThisPayment;

    const receipt: ReceiptData = {
        schoolName: schoolName || "Votre École",
        studentName: studentFullName,
        studentMatricule: student.matricule || "N/A",
        className: student.class,
        date: new Date(payment.date),
        description: payment.description,
        amountPaid: payment.amount,
        amountDue: amountDueAtTimeOfPayment - payment.amount,
        payerName: `${payment.payerFirstName} ${payment.payerLastName}`,
        payerContact: payment.payerContact,
        paymentMethod: payment.method,
    };
    setReceiptToView(receipt);
    setIsReceiptOpen(true);
  };

  if (isLoading) {
    return (
        <div className="space-y-6">
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
  
  const fallback = studentFullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();


  return (
    <>
    <div className="space-y-6">
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-4">

            {/* Left Column */}
            <div className="lg:col-span-1 flex flex-col gap-6">
                 <Card>
                    <CardHeader className="flex-row items-center gap-4 pb-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={student.photoUrl || `https://picsum.photos/seed/${studentId}/100/100`} alt={studentFullName} data-ai-hint="person face" />
                            <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        <div>
                             <CardTitle className="text-2xl">{studentFullName}</CardTitle>
                             <CardDescription className='flex items-center gap-2'><Hash className='h-3 w-3' />{student.matricule || 'N/A'}</CardDescription>
                             <Badge className={cn("mt-2 border-transparent", getStatusBadgeVariant(student.status || 'Actif'))}>{student.status || 'Actif'}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex items-center">
                            <BookUser className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Classe: <strong>{student.class}</strong></span>
                        </div>
                        <div className="flex items-center">
                            <User className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Prof. Principal: <strong>{mainTeacher ? `${mainTeacher.firstName} ${mainTeacher.lastName}`: 'N/A'}</strong></span>
                        </div>
                         <div className="flex items-center">
                            <Building className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Cycle: <strong>{studentClass?.cycle || student.cycle || 'N/A'}</strong></span>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /><span>Contacts des Parents</span></CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-3 text-sm">
                        <div className="font-medium">{student.parent1FirstName} {student.parent1LastName}</div>
                        <a href={`tel:${student.parent1Contact}`} className="text-muted-foreground hover:text-primary">{student.parent1Contact}</a>
                        {student.parent2FirstName && student.parent2LastName && (
                            <>
                                <Separator className="my-3"/>
                                <div className="font-medium">{student.parent2FirstName} {student.parent2LastName}</div>
                                <a href={`tel:${student.parent2Contact}`} className="text-muted-foreground hover:text-primary">{student.parent2Contact}</a>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-3 flex flex-col gap-6">
                <Tabs defaultValue="grades">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="grades">Résultats</TabsTrigger>
                        <TabsTrigger value="payments">Paiements</TabsTrigger>
                        <TabsTrigger value="info">Informations</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                    </TabsList>
                    
                    {/* Grades Tab */}
                    <TabsContent value="grades" className="space-y-4">
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
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Matière</TableHead>
                                        <TableHead className="text-right">Coeff.</TableHead>
                                        <TableHead className="text-right">Moyenne</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.keys(subjectAverages).length > 0 ? Object.entries(subjectAverages).map(([subject, subjectData]) => {
                                            const subjectGrades = grades.filter(g => g.subject === subject);
                                            return (
                                                <React.Fragment key={subject}>
                                                    <TableRow>
                                                        <TableCell className="font-medium">{subject}</TableCell>
                                                        <TableCell className="text-right font-mono">{subjectData.totalCoeffs}</TableCell>
                                                        <TableCell className="text-right font-mono text-lg">{subjectData.average.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                    {subjectGrades.map(grade => (
                                                        <TableRow key={grade.id} className="bg-muted/50">
                                                            <TableCell className="py-1 text-xs pl-8 text-muted-foreground">{isMounted ? format(new Date(grade.date), 'd MMM', { locale: fr }) : '...' }</TableCell>
                                                            <TableCell className="py-1 text-xs text-right text-muted-foreground">x{grade.coefficient}</TableCell>
                                                            <TableCell className="py-1 text-xs text-right text-muted-foreground">{grade.grade}/20</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        }) : (
                                            <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Aucune note enregistrée pour cet élève.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    {/* Payments Tab */}
                     <TabsContent value="payments" className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /><span>Scolarité</span></CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center text-lg">
                                    <span className="text-muted-foreground">Statut</span>
                                    <TuitionStatusBadge status={student.tuitionStatus ?? 'Partiel'} />
                                    </div>
                                    <div className="flex justify-between items-center text-lg">
                                    <span className="text-muted-foreground">Solde dû</span>
                                    <span className="font-bold text-primary">{(student.amountDue ?? 0) > 0 ? `${(student.amountDue ?? 0).toLocaleString('fr-FR')} CFA` : '-'}</span>
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
                                            <TableHead>Mode</TableHead>
                                            <TableHead className="text-right">Montant</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paymentHistory.length > 0 ? (
                                            paymentHistory.map(payment => (
                                                <TableRow key={payment.id}>
                                                    <TableCell>{isMounted ? format(new Date(payment.date), 'd MMMM yyyy', {locale: fr}) : <Skeleton className="h-5 w-24"/>}</TableCell>
                                                    <TableCell>{payment.description}</TableCell>
                                                    <TableCell>{payment.method}</TableCell>
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
                                                <TableCell colSpan={5} className="text-center h-24">Aucun paiement enregistré.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    {/* Info Tab */}
                    <TabsContent value="info">
                        <Card>
                            <CardHeader>
                                <CardTitle>Informations Administratives</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                 <div className="flex items-center">
                                    <Cake className="mr-3 h-5 w-5 text-muted-foreground" />
                                    <span>Né(e) le <strong>{isMounted && student.dateOfBirth ? format(new Date(student.dateOfBirth), 'd MMMM yyyy', { locale: fr }) : <Skeleton className="h-4 w-32 inline-block"/>}</strong> à <strong>{student.placeOfBirth}</strong></span>
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
                                    <School className="mr-3 h-5 w-5 text-muted-foreground" />
                                    <span>Ancien Etab.: <strong>{student.previousSchool || 'N/A'}</strong></span>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Documents Tab */}
                    <TabsContent value="documents">
                         <Card>
                            <CardHeader>
                                <CardTitle>Documents</CardTitle>
                                <CardDescription>Générez et consultez les documents de l'élève.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Button onClick={() => router.push(`/dashboard/dossiers-eleves/${studentId}/bulletin`)} className="w-full justify-start">
                                    <FileText className="mr-2 h-4 w-4" />
                                    Générer le Bulletin de Notes
                                </Button>
                                <Button onClick={() => router.push(`/dashboard/dossiers-eleves/${studentId}/emploi-du-temps`)} className="w-full justify-start">
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    Voir l'Emploi du Temps
                                </Button>
                                <Button onClick={() => router.push(`/dashboard/dossiers-eleves/${studentId}/fiche`)} className="w-full justify-start">
                                    <FileSignature className="mr-2 h-4 w-4" />
                                    Générer la Fiche de Renseignements
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
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
