
'use client';

import { notFound, useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, BookUser, Building, Wallet, MessageSquare, Cake, School, Users, Hash, Receipt, VenetianMask, MapPin, FileText, CalendarDays, FileSignature, Pencil, Bot } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import { TuitionStatusBadge } from '@/components/tuition-status-badge';
import { Separator } from '@/components/ui/separator';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, collection, query, orderBy, setDoc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { TuitionReceipt, type ReceiptData } from '@/components/tuition-receipt';
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { teacher as Teacher, class_type as Class, student as Student, gradeEntry as GradeEntry, payment as Payment } from '@/lib/data-types';
import { useHydrationFix } from '@/hooks/use-hydration-fix';
import { ImageUploader } from '@/components/image-uploader';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { analyzeAndSummarizeFeedback, AnalyzeAndSummarizeFeedbackOutput } from '@/ai/flows/analyze-and-summarize-feedback';

const studentSchema = z.object({
    firstName: z.string().min(1, { message: "Le prénom est requis." }),
    lastName: z.string().min(1, { message: "Le nom est requis." }),
    classId: z.string().min(1, { message: "La classe est requise." }),
    dateOfBirth: z.string().min(1, { message: "La date de naissance est requise." }),
    amountDue: z.coerce.number().min(0, "Le montant dû ne peut pas être négatif."),
    tuitionStatus: z.enum(['Soldé', 'En retard', 'Partiel']),
    status: z.enum(['Actif', 'En attente', 'Radié']),
    feedback: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

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
  
  const { toast } = useToast();

  const [receiptToView, setReceiptToView] = useState<ReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // AI Analysis State
  const [analysisResult, setAnalysisResult] = useState<AnalyzeAndSummarizeFeedbackOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- Student Data ---
  const studentRef = useMemoFirebase(() => 
    (schoolId && studentId) ? doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`) : null
  , [firestore, schoolId, studentId]);
  const { data: student, loading: studentLoading } = useDoc<Student>(studentRef);

  // --- Related Data ---
  const gradesQuery = useMemoFirebase(() => schoolId && studentId ? query(collection(firestore, `ecoles/${schoolId}/eleves/${studentId}/notes`), orderBy('date', 'desc')) : null, [schoolId, studentId]);
  const paymentsQuery = useMemoFirebase(() => schoolId && studentId ? query(collection(firestore, `ecoles/${schoolId}/eleves/${studentId}/paiements`), orderBy('date', 'desc')) : null, [schoolId, studentId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
  
  const { data: gradesData, loading: gradesLoading } = useCollection(gradesQuery);
  const { data: paymentHistoryData, loading: paymentsLoading } = useCollection(paymentsQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  
  const grades: GradeEntry[] = useMemo(() => gradesData?.map(d => ({ id: d.id, ...d.data() } as GradeEntry)) || [], [gradesData]);
  const paymentHistory: PaymentHistoryEntry[] = useMemo(() => paymentHistoryData?.map(d => ({ id: d.id, ...d.data() } as PaymentHistoryEntry)) || [], [paymentHistoryData]);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const classRef = useMemoFirebase(() => student?.classId && schoolId ? doc(firestore, `ecoles/${schoolId}/classes/${student.classId}`) : null, [student, schoolId]);
  const { data: studentClass, loading: classLoading } = useDoc<Class>(classRef);
  
  const teacherRef = useMemoFirebase(() => studentClass?.mainTeacherId && schoolId ? doc(firestore, `ecoles/${schoolId}/enseignants/${studentClass.mainTeacherId}`) : null, [studentClass, schoolId]);
  const { data: mainTeacher, loading: teacherLoading } = useDoc<Teacher>(teacherRef);
  
  const studentFullName = student ? `${student.firstName} ${student.lastName}` : '';
  const { subjectAverages, generalAverage } = useMemo(() => calculateAverages(grades), [grades]);
  
  const isLoading = schoolLoading || studentLoading || gradesLoading || paymentsLoading || classLoading || teacherLoading || classesLoading;

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
        firstName: '',
        lastName: '',
        classId: '',
        dateOfBirth: '',
        amountDue: 0,
        tuitionStatus: 'Partiel',
        status: 'Actif',
        feedback: '',
    }
  });

  useEffect(() => {
    if(isEditDialogOpen && student) {
      form.reset({
        firstName: student.firstName,
        lastName: student.lastName,
        classId: student.classId,
        dateOfBirth: student.dateOfBirth,
        amountDue: student.amountDue,
        tuitionStatus: student.tuitionStatus,
        status: student.status || 'Actif',
        feedback: student.feedback || '',
      });
    }
    setAnalysisResult(null);
  }, [student, isEditDialogOpen, form]);

  if (!studentId) {
    return <div>ID d'élève invalide ou manquant dans l'URL.</div>;
  }

  const handlePhotoUploadComplete = async (url: string) => {
    if (!studentRef) {
        toast({ variant: 'destructive', title: "Erreur", description: "Référence de l'élève non trouvée." });
        return;
    }
    try {
        await updateDoc(studentRef, { photoUrl: url });
        toast({ title: 'Photo de profil mise à jour !' });
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la photo de profil:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour la photo de profil.' });
    }
  };
  
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
  
   const handleEditStudent = (values: StudentFormValues) => {
    if (!schoolId || !student) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de modifier l'élève." });
      return;
    }
    
    const studentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${student.id}`);
    const selectedClassInfo = classes.find(c => c.id === values.classId);
    
    const updatedData = {
      firstName: values.firstName,
      lastName: values.lastName,
      classId: values.classId,
      class: selectedClassInfo?.name || 'N/A',
      cycle: selectedClassInfo?.cycle || student.cycle,
      dateOfBirth: values.dateOfBirth,
      amountDue: values.amountDue,
      tuitionStatus: values.tuitionStatus,
      status: values.status,
      feedback: values.feedback || '',
    };
    
    setDoc(studentDocRef, updatedData, { merge: true })
    .then(() => {
        toast({ title: "Élève modifié", description: `Les informations de ${values.firstName} ${values.lastName} ont été mises à jour.` });
        setIsEditDialogOpen(false);
    }).catch(async (serverError) => {
        // Error handling is now centralized in the hook
    });
  };

   const handleAnalyzeFeedback = async () => {
    const feedbackText = form.getValues('feedback');
    if (!feedbackText) {
        toast({ variant: 'destructive', title: "Aucun texte", description: "Le champ d'appréciation est vide."});
        return;
    }
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
        const result = await analyzeAndSummarizeFeedback({ feedbackText });
        setAnalysisResult(result);
    } catch (error) {
        console.error("AI analysis failed:", error);
        toast({ variant: 'destructive', title: "Erreur d'analyse", description: "L'analyse par IA a échoué."});
    } finally {
        setIsAnalyzing(false);
    }
  };

  const renderSentiment = (sentiment: string) => {
    const sentimentLower = sentiment.toLowerCase();
    if (sentimentLower === 'positif') {
        return <span className="flex items-center gap-1 text-emerald-600"><Smile className="h-4 w-4" /> Positif</span>
    }
    if (sentimentLower === 'négatif') {
        return <span className="flex items-center gap-1 text-red-600"><Frown className="h-4 w-4" /> Négatif</span>
    }
    return <span className="flex items-center gap-1 text-gray-600"><Meh className="h-4 w-4" /> Neutre</span>
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
        <div className="flex justify-between items-center">
            <div />
            <Button onClick={() => setIsEditDialogOpen(true)} variant="outline"><Pencil className="mr-2 h-4 w-4" /> Modifier la fiche</Button>
        </div>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-4">

            {/* Left Column */}
            <div className="lg:col-span-1 flex flex-col gap-6">
                 <Card>
                    <CardHeader className="flex-row items-center gap-4 pb-4">
                        <ImageUploader 
                            onUploadComplete={handlePhotoUploadComplete}
                            storagePath={`ecoles/${schoolId}/eleves/${studentId}/avatars/`}
                        >
                            <Avatar className="h-16 w-16 cursor-pointer hover:opacity-80 transition-opacity">
                                <AvatarImage src={student.photoUrl || `https://picsum.photos/seed/${studentId}/100/100`} alt={studentFullName} data-ai-hint="person face" />
                                <AvatarFallback>{fallback}</AvatarFallback>
                            </Avatar>
                        </ImageUploader>
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
                                <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /><span>Appréciations</span></CardTitle></Header>
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
    
    {/* Edit Dialog */}
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l'Élève</DialogTitle>
            <DialogDescription>
                Mettez à jour les informations de <strong>{student?.firstName} {student?.lastName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form id="edit-student-form" onSubmit={form.handleSubmit(handleEditStudent)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
               <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="dateOfBirth" render={({ field }) => (<FormItem><FormLabel>Date de naissance</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classe</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {classes.map((opt) => (<SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Statut Élève</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Actif">Actif</SelectItem><SelectItem value="En attente">En attente</SelectItem><SelectItem value="Radié">Radié</SelectItem></SelectContent></Select></FormItem>)} />
              <FormField control={form.control} name="amountDue" render={({ field }) => (<FormItem><FormLabel>Solde (CFA)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField
                control={form.control}
                name="tuitionStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut Paiement</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Soldé">Soldé</SelectItem><SelectItem value="En retard">En retard</SelectItem><SelectItem value="Partiel">Partiel</SelectItem></SelectContent></Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appréciation</FormLabel>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <FormControl><Textarea {...field} /></FormControl>
                            <Button type="button" variant="outline" size="icon" onClick={handleAnalyzeFeedback} disabled={isAnalyzing}><Bot className="h-4 w-4" /></Button>
                        </div>
                        {isAnalyzing && <p className="text-xs text-muted-foreground">Analyse en cours...</p>}
                        {analysisResult && (
                             <Card className="bg-muted/50 text-xs">
                                <CardHeader className="p-3"><CardTitle className="text-sm flex justify-between items-center"><span>Analyse IA</span>{renderSentiment(analysisResult.sentiment)}</CardTitle></CardHeader>
                                <CardContent className="p-3 pt-0">
                                    <p><strong>Résumé:</strong> {analysisResult.summary}</p>
                                    <p className="mt-2"><strong>Points d'amélioration:</strong> {analysisResult.keyImprovementAreas}</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
            <Button type="submit" form="edit-student-form" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
     
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
