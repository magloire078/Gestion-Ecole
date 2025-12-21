
'use client';

import { notFound, useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, BookUser, Building, Wallet, Cake, School, Users, Hash, Receipt, VenetianMask, MapPin, FileText, CalendarDays, FileSignature, Pencil, Sparkles, Tag, CalendarCheck, Loader2, CreditCard } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import { TuitionStatusBadge } from '@/components/tuition-status-badge';
import { Separator } from '@/components/ui/separator';
import { useDoc, useFirestore, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, collection, query, orderBy, writeBatch, increment } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TuitionReceipt, type ReceiptData } from '@/components/tuition-receipt';
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { staff as Staff, class_type as Class, student as Student, gradeEntry as GradeEntry, payment as Payment, fee as Fee, niveau as Niveau } from '@/lib/data-types';
import { ImageUploader } from '@/components/image-uploader';
import { useToast } from '@/hooks/use-toast';
import { StudentEditForm } from '@/components/student-edit-form';
import { updateStudentPhoto } from '@/services/student-services';
import { SafeImage } from '@/components/ui/safe-image';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


const paymentSchema = z.object({
  paymentDate: z.string().min(1, "La date est requise."),
  paymentDescription: z.string().min(1, "La description est requise."),
  paymentAmount: z.coerce.number().positive("Le montant doit être un nombre positif."),
  payerFirstName: z.string().min(1, "Le prénom du payeur est requis."),
  payerLastName: z.string().min(1, "Le nom de la personne qui a effectué le paiement est requis."),
  payerContact: z.string().optional(),
  paymentMethod: z.string().min(1, "Le mode de paiement est requis."),
});
type PaymentFormValues = z.infer<typeof paymentSchema>;

// ====================================================================================
// Main Page Component
// ====================================================================================
export default function StudentProfilePage() {
  const params = useParams();
  const eleveId = params.eleveId as string;
  const { schoolId, loading: schoolLoading } = useSchoolData();

  if (schoolLoading) {
    return <EmployeeDetailSkeleton />;
  }

  if (!schoolId) {
    // This can happen if the user has no school associated.
    // An AuthGuard should ideally handle this, but as a fallback:
    return <p>Erreur: Aucune école n'est associée à votre compte.</p>;
  }
  
  if (!eleveId) {
    return <p>Erreur: ID de l'élève manquant.</p>;
  }

  return <StudentProfileContent eleveId={eleveId} schoolId={schoolId} />;
}


// ====================================================================================
// Content Component
// ====================================================================================
interface StudentProfileContentProps {
  eleveId: string;
  schoolId: string;
}

function StudentProfileContent({ eleveId, schoolId }: StudentProfileContentProps) {
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0); // State to force re-render
  
  const firestore = useFirestore();
  const { schoolName, schoolData } = useSchoolData();
  const { user } = useUser();
  const canManageUsers = !!user?.profile?.permissions?.manageUsers;

  const { toast } = useToast();

  const [receiptToView, setReceiptToView] = useState<ReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  // --- Data Fetching ---
  const studentRef = useMemoFirebase(() => doc(firestore, `ecoles/${schoolId}/eleves/${eleveId}`), [firestore, schoolId, eleveId, refreshTrigger]);
  const { data: studentData, loading: studentLoading, error } = useDoc<Student>(studentRef);
  
  const paymentsQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/eleves/${eleveId}/paiements`), orderBy('date', 'desc')), [firestore, schoolId, eleveId, refreshTrigger]);
  const { data: paymentHistoryData, loading: paymentsLoading } = useCollection(paymentsQuery);

  const gradesQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/eleves/${eleveId}/notes`), orderBy('date', 'desc')), [firestore, schoolId, eleveId]);
  const { data: gradesData, loading: gradesLoading } = useCollection(gradesQuery);
  
  const student = studentData as Student | null;
  const classRef = useMemoFirebase(() => student?.classId ? doc(firestore, `ecoles/${schoolId}/classes/${student.classId}`) : null, [student, schoolId, firestore]);
  const { data: studentClass, loading: classLoading } = useDoc<Class>(classRef);

  const teacherRef = useMemoFirebase(() => studentClass?.mainTeacherId ? doc(firestore, `ecoles/${schoolId}/personnel/${studentClass.mainTeacherId}`) : null, [studentClass, schoolId, firestore]);
  const { data: mainTeacher, loading: teacherLoading } = useDoc<Staff>(teacherRef);
  
  const allSchoolClassesQuery = useMemoFirebase(() => collection(firestore, `ecoles/${schoolId}/classes`), [firestore, schoolId]);
  const { data: allSchoolClassesData, loading: allClassesLoading } = useCollection(allSchoolClassesQuery);
  const feesQuery = useMemoFirebase(() => collection(firestore, `ecoles/${schoolId}/frais_scolarite`), [firestore, schoolId]);
  const { data: feesData, loading: feesLoading } = useCollection(feesQuery);
  const niveauxQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/niveaux`)), [firestore, schoolId]);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);

  const grades: GradeEntry[] = useMemo(() => gradesData?.map(d => ({ id: d.id, ...d.data() } as GradeEntry)) || [], [gradesData]);
  const paymentHistory: PaymentHistoryEntry[] = useMemo(() => paymentHistoryData?.map(d => ({ id: d.id, ...d.data() } as PaymentHistoryEntry)) || [], [paymentHistoryData]);
  const allSchoolClasses: Class[] = useMemo(() => allSchoolClassesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [allSchoolClassesData]);
  const allSchoolFees: Fee[] = useMemo(() => feesData?.map(d => ({ id: d.id, ...d.data() } as Fee)) || [], [feesData]);
  const allNiveaux: Niveau[] = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau)) || [], [niveauxData]);


  const studentFullName = student ? `${student.firstName} ${student.lastName}` : '';
  const { subjectAverages, generalAverage } = useMemo(() => calculateAverages(grades), [grades]);
  
  const isLoading = studentLoading || gradesLoading || paymentsLoading || classLoading || teacherLoading || allClassesLoading || feesLoading || niveauxLoading;

  if (isLoading) {
    return <EmployeeDetailSkeleton />;
  }

  if (!student) {
    notFound();
  }
  
  const handlePhotoUploadComplete = async (url: string) => {
    try {
        await updateStudentPhoto(firestore, schoolId, eleveId, url);
        toast({ title: 'Photo de profil mise à jour !' });
    } catch (error) {
        // Error is handled by the service
    }
  };
  
  const handleViewReceipt = (payment: PaymentHistoryEntry) => {
    if (!student) return;
  
    const totalPaid = (student.tuitionFee ?? 0) - (student.amountDue ?? 0);
  
    const paymentsAfterCurrent = paymentHistory
        .filter(p => new Date(p.date) > new Date(payment.date));
  
    const sumOfPaymentsAfter = paymentsAfterCurrent.reduce((sum, p) => sum + p.amount, 0);
  
    const totalPaidBeforeThisPayment = totalPaid - sumOfPaymentsAfter - payment.amount;
  
    const amountDueBeforeThisPayment = (student.tuitionFee ?? 0) - (student.discountAmount || 0) - totalPaidBeforeThisPayment;
  
    const receipt: ReceiptData = {
        schoolName: schoolName || "Votre École",
        studentName: studentFullName,
        studentMatricule: student.matricule || "N/A",
        className: student.class || "N/A",
        date: new Date(payment.date),
        description: payment.description,
        amountPaid: payment.amount,
        amountDue: amountDueBeforeThisPayment - payment.amount,
        payerName: `${payment.payerFirstName} ${payment.payerLastName}`,
        payerContact: payment.payerContact,
        paymentMethod: payment.method,
    };
    setReceiptToView(receipt);
    setIsReceiptOpen(true);
  };
  
  const fallback = studentFullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();


  return (
    <>
    <div className="space-y-6">
        <div className="flex flex-wrap justify-end items-center gap-2">
            <Button variant="outline" onClick={() => router.push(`/dashboard/dossiers-eleves/${eleveId}/carte`)}>
              <CreditCard className="mr-2 h-4 w-4" />Carte Étudiant
            </Button>
            <Button variant="outline" onClick={() => router.push(`/dashboard/dossiers-eleves/${eleveId}/bulletin`)}>
              <FileText className="mr-2 h-4 w-4" />Bulletin
            </Button>
            <Button variant="outline" onClick={() => router.push(`/dashboard/dossiers-eleves/${eleveId}/emploi-du-temps`)}>
              <CalendarDays className="mr-2 h-4 w-4" />Emploi du Temps
            </Button>
            <Button variant="outline" onClick={() => router.push(`/dashboard/dossiers-eleves/${eleveId}/fiche`)}>
              <FileSignature className="mr-2 h-4 w-4" />Fiche
            </Button>
            {canManageUsers && (
                <Button onClick={() => setIsEditDialogOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" /> Modifier
                </Button>
            )}
        </div>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-4">

            {/* Left Column */}
            <div className="lg:col-span-1 flex flex-col gap-6">
                 <Card>
                    <CardHeader className="flex-row items-center gap-4 pb-4">
                        <ImageUploader 
                            onUploadComplete={handlePhotoUploadComplete}
                            storagePath={`ecoles/${schoolId}/eleves/${eleveId}/avatars/`}
                             currentImageUrl={student.photoUrl}
                        >
                            <Avatar className="h-16 w-16 cursor-pointer hover:opacity-80 transition-opacity">
                                <SafeImage src={student.photoUrl} alt={studentFullName} width={64} height={64} className="rounded-full" />
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
                            <span>Cycle: <strong>{studentClass?.cycleId || student.cycle || 'N/A'}</strong></span>
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
                <Tabs defaultValue="payments">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="payments">Paiements</TabsTrigger>
                        <TabsTrigger value="grades">Résultats</TabsTrigger>
                        <TabsTrigger value="info">Informations</TabsTrigger>
                    </TabsList>
                    
                    {/* Grades Tab */}
                    <TabsContent value="grades" className="space-y-4 mt-6">
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
                                                            <TableCell className="py-1 text-xs pl-8 text-muted-foreground">{format(new Date(grade.date), 'd MMM', { locale: fr }) }</TableCell>
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
                     <TabsContent value="payments" className="space-y-4 mt-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /><span>Scolarité</span></CardTitle></CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Frais de scolarité:</span>
                                        <span className="font-semibold">{formatCurrency(student.tuitionFee)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Remise:</span>
                                        <span className="font-semibold text-emerald-600">{`-${formatCurrency(student.discountAmount)}`}</span>
                                    </div>
                                     <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Total Payé:</span>
                                        <span className="font-semibold text-emerald-600">{formatCurrency((student.tuitionFee || 0) - (student.amountDue || 0))}</span>
                                    </div>
                                    <Separator />
                                     <div className="flex justify-between items-center font-bold">
                                        <span>Total à payer:</span>
                                        <span>{formatCurrency((student.tuitionFee || 0) - (student.discountAmount || 0))}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Statut:</span>
                                        <TuitionStatusBadge status={student.tuitionStatus ?? 'Partiel'}/>
                                    </div>
                                    <div className="flex justify-between items-center text-lg">
                                        <span className="font-bold">Solde dû:</span>
                                        <span className="font-bold text-primary">{formatCurrency(student.amountDue)}</span>
                                    </div>
                                     {(student.discountAmount || 0) > 0 && (
                                        <Card className="bg-muted/50 p-3 text-xs">
                                            <CardDescription className="flex items-start gap-2">
                                                <Tag className="h-4 w-4 mt-0.5 shrink-0" />
                                                <div>
                                                    <strong>Motif de la remise:</strong>
                                                    <p>{student.discountReason || 'Non spécifié'}</p>
                                                </div>
                                            </CardDescription>
                                        </Card>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full" onClick={() => setIsPaymentDialogOpen(true)}>Enregistrer un paiement</Button>
                                </CardFooter>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-500" /><span>Appréciations</span></CardTitle></CardHeader>
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
                                                    <TableCell>{format(new Date(payment.date), 'd MMMM yyyy', {locale: fr})}</TableCell>
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
                    <TabsContent value="info" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Informations Administratives</CardTitle>
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
                                <div className="flex items-center">
                                    <CalendarCheck className="mr-3 h-5 w-5 text-muted-foreground" />
                                    <span>Année d'inscription: <strong>{student.inscriptionYear || 'N/A'}</strong></span>
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
                </Tabs>
            </div>
        </div>
    </div>
    
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Modifier l'Élève</DialogTitle>
            <DialogDescription>
                Mettez à jour les informations de <strong>{student?.firstName} {student?.lastName}</strong>.
            </DialogDescription>
          </DialogHeader>
            {student && (
              <StudentEditForm 
                student={student} 
                classes={allSchoolClasses} 
                fees={allSchoolFees}
                niveaux={allNiveaux}
                schoolId={schoolId} 
                onFormSubmit={() => {
                  setIsEditDialogOpen(false);
                  setRefreshTrigger(prev => prev + 1); // Déclenche le re-rendu
                }} 
              />
            )}
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

      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        student={student}
        schoolData={schoolData}
        onSave={() => {
            setIsPaymentDialogOpen(false);
            setRefreshTrigger(prev => prev + 1);
        }}
      />
    </>
  );
}

function PaymentDialog({ isOpen, onClose, onSave, student, schoolData }: { isOpen: boolean, onClose: () => void, onSave: () => void, student: Student, schoolData: any }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isSaving, setIsSaving] = useState(false);
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    
    const [todayDateString, setTodayDateString] = useState('');
    useEffect(() => { setTodayDateString(format(new Date(), 'yyyy-MM-dd')); }, []);

    const paymentForm = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentSchema),
    });

    useEffect(() => {
        if (student && isOpen) {
            paymentForm.reset({
                paymentAmount: 0,
                paymentDescription: `Scolarité - ${student.firstName} ${student.lastName}`,
                paymentDate: todayDateString,
                payerFirstName: student.parent1FirstName || '',
                payerLastName: student.parent1LastName || '',
                payerContact: student.parent1Contact || '',
                paymentMethod: 'Espèces',
            });
        }
    }, [student, isOpen, paymentForm, todayDateString]);
    
    const handleSaveChanges = async (values: PaymentFormValues) => {
        if (!student || !schoolData?.id || !student.id) return;
        
        setIsSaving(true);
        
        const amountPaid = values.paymentAmount;
        const newAmountDue = Math.max(0, (student.amountDue || 0) - amountPaid);
        const newStatus: "Soldé" | "Partiel" = newAmountDue <= 0 ? 'Soldé' : 'Partiel';
        
        const batch = writeBatch(firestore);

        const studentRef = doc(firestore, `ecoles/${schoolData.id}/eleves/${student.id}`);
        batch.update(studentRef, { amountDue: newAmountDue, tuitionStatus: newStatus });

        const accountingColRef = collection(firestore, `ecoles/${schoolData.id}/comptabilite`);
        const newTransactionRef = doc(accountingColRef);
        batch.set(newTransactionRef, {
            schoolId: schoolData.id, date: values.paymentDate,
            description: values.paymentDescription || `Paiement scolarité pour ${student.firstName} ${student.lastName}`,
            category: 'Scolarité', type: 'Revenu', amount: amountPaid,
        });
        
        const paymentHistoryRef = doc(collection(firestore, `ecoles/${schoolData.id}/eleves/${student.id}/paiements`));
        batch.set(paymentHistoryRef, {
            date: values.paymentDate, amount: amountPaid, description: values.paymentDescription,
            accountingTransactionId: newTransactionRef.id, payerFirstName: values.payerFirstName,
            payerLastName: values.payerLastName, payerContact: values.payerContact, method: values.paymentMethod,
        });
        
        batch.commit().then(() => {
            toast({ title: "Paiement enregistré" });
            const amountDueBeforePayment = (student.amountDue || 0);
            setReceiptData({
                schoolName: schoolData?.name || "Votre École", studentName: `${student.firstName} ${student.lastName}`,
                studentMatricule: student.matricule || 'N/A', className: student.class || 'N/A',
                date: new Date(values.paymentDate), description: values.paymentDescription,
                amountPaid: amountPaid, amountDue: amountDueBeforePayment - amountPaid, payerName: `${values.payerFirstName} ${values.payerLastName}`,
                payerContact: values.payerContact, paymentMethod: values.paymentMethod,
            });
            setShowReceipt(true); // Show receipt view
        }).catch((serverError) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `[BATCH]`, operation: 'write'}));
        }).finally(() => {
            setIsSaving(false);
        });
    };

    const handleClose = () => {
        if (showReceipt) { // If we were showing a receipt, it means a save happened
            onSave();
        }
        onClose(); // Always call onClose to ensure dialog state is managed by parent
        // Reset state for next time
        setShowReceipt(false);
        setReceiptData(null);
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-lg">
                {!showReceipt ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Enregistrer un paiement pour {student.firstName}</DialogTitle>
                            <DialogDescription>Le solde actuel est de <strong>{formatCurrency(student?.amountDue || 0)}</strong>.</DialogDescription>
                        </DialogHeader>
                        <Form {...paymentForm}>
                            <form id="payment-form" onSubmit={paymentForm.handleSubmit(handleSaveChanges)} className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                                <FormField control={paymentForm.control} name="paymentDate" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={paymentForm.control} name="paymentDescription" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={paymentForm.control} name="paymentAmount" render={({ field }) => (<FormItem><FormLabel>Montant Payé</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="paymentMethod" render={({ field }) => (<FormItem><FormLabel>Mode de paiement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Espèces">Espèces</SelectItem><SelectItem value="Chèque">Chèque</SelectItem><SelectItem value="Virement Bancaire">Virement Bancaire</SelectItem><SelectItem value="Paiement Mobile">Paiement Mobile</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={paymentForm.control} name="payerFirstName" render={({ field }) => (<FormItem><FormLabel>Prénom du Payeur</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="payerLastName" render={({ field }) => (<FormItem><FormLabel>Nom du Payeur</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="payerContact" render={({ field }) => (<FormItem><FormLabel>Contact Payeur</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            </form>
                        </Form>
                        <DialogFooter>
                            <Button variant="outline" onClick={onClose}>Annuler</Button>
                            <Button type="submit" form="payment-form" disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Enregistrer
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Reçu de Paiement</DialogTitle>
                            <DialogDescription>Aperçu du reçu. Vous pouvez l'imprimer.</DialogDescription>
                        </DialogHeader>
                        {receiptData && <TuitionReceipt receiptData={receiptData} />}
                        <DialogFooter><Button onClick={handleClose}>Fermer</Button></DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ====================================================================================
// Helper & Skeleton Components
// ====================================================================================
interface PaymentHistoryEntry extends Payment {
  id: string;
}
const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return `${value.toLocaleString('fr-FR')} CFA`;
};
const getStatusBadgeVariant = (status: Student['status']) => {
    switch (status) {
        case 'Actif': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
        case 'Radié': return 'bg-destructive/80 text-destructive-foreground';
        case 'En attente': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
        default: return 'bg-secondary text-secondary-foreground';
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

function EmployeeDetailSkeleton() {
    return (
        <div className="space-y-6">
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
