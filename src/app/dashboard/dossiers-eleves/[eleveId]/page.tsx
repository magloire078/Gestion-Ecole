
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
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { staff as Staff, class_type as Class, student as Student, gradeEntry as GradeEntry, payment as Payment, fee as Fee, niveau as Niveau } from '@/lib/data-types';
import { ImageUploader } from '@/components/image-uploader';
import { useToast } from '@/hooks/use-toast';
import { StudentEditForm } from '@/components/student-edit-form';
import { updateStudentPhoto } from '@/services/student-services';
import { SafeImage } from '@/components/ui/safe-image';
import { PaymentsTab } from '@/components/students/payments-tab';
import { GradesTab } from '@/components/students/grades-tab';
import { InfoTab } from '@/components/students/info-tab';

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
  const { user } = useUser();
  const canManageUsers = !!user?.profile?.permissions?.manageUsers;

  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // --- Data Fetching ---
  const studentRef = useMemoFirebase(() => doc(firestore, `ecoles/${schoolId}/eleves/${eleveId}`), [firestore, schoolId, eleveId, refreshTrigger]);
  const { data: studentData, loading: studentLoading, error } = useDoc<Student>(studentRef);
  
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

  const allSchoolClasses: Class[] = useMemo(() => allSchoolClassesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [allSchoolClassesData]);
  const allSchoolFees: Fee[] = useMemo(() => feesData?.map(d => ({ id: d.id, ...d.data() } as Fee)) || [], [feesData]);
  const allNiveaux: Niveau[] = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau)) || [], [niveauxData]);

  const studentFullName = student ? `${student.firstName} ${student.lastName}` : '';
  
  const isLoading = studentLoading || classLoading || teacherLoading || allClassesLoading || feesLoading || niveauxLoading;

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
  
  const fallback = studentFullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  const getStatusBadgeVariant = (status: Student['status']) => {
    switch (status) {
        case 'Actif': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
        case 'Radié': return 'bg-destructive/80 text-destructive-foreground';
        case 'En attente': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
        default: return 'bg-secondary text-secondary-foreground';
    }
};

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
                    <TabsContent value="payments" className="mt-6">
                       <PaymentsTab student={student} onPaymentSuccess={() => setRefreshTrigger(prev => prev + 1)} />
                    </TabsContent>
                    <TabsContent value="grades" className="mt-6">
                        <GradesTab schoolId={schoolId} studentId={eleveId} />
                    </TabsContent>
                    <TabsContent value="info" className="mt-6">
                        <InfoTab student={student}/>
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
    </>
  );
}


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

