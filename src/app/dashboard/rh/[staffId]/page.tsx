
'use client';

import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Phone, BookUser, FileText, Briefcase, Building } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, collection, query, where, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { staff as Staff, class_type as Class, school as OrganizationSettings } from '@/lib/data-types';
import { getPayslipDetails, type PayslipDetails } from '@/app/bulletin-de-paie';
import { PayslipPreview } from '@/components/payroll/payslip-template';
import { useToast } from '@/hooks/use-toast';
import { TeacherInfoSheet } from '@/components/teacher-info-sheet';

const getStatusBadgeVariant = (status: Staff['status']) => {
    switch (status) {
        case 'Actif':
            return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
        case 'Inactif':
            return 'bg-destructive/80 text-destructive-foreground';
        default:
            return 'bg-secondary text-secondary-foreground';
    }
};


export default function StaffProfilePage() {
  const params = useParams();
  const staffId = params.staffId as string;
  
  const firestore = useFirestore();
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();

  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [isInfoSheetOpen, setIsInfoSheetOpen] = useState(false);
  const [payslipDetails, setPayslipDetails] = useState<PayslipDetails | null>(null);
  const [isGeneratingPayslip, setIsGeneratingPayslip] = useState(false);
  
  // --- Data Fetching ---
  const staffRef = useMemoFirebase(() => (schoolId && staffId) ? doc(firestore, `ecoles/${schoolId}/personnel/${staffId}`) : null, [firestore, schoolId, staffId]);
  const { data: staffMember, loading: staffLoading } = useDoc<Staff>(staffRef);

  const classRef = useMemoFirebase(() => staffMember?.classId && schoolId ? doc(firestore, `ecoles/${schoolId}/classes/${staffMember.classId}`) : null, [staffMember, schoolId, firestore]);
  const { data: mainClass, loading: classLoading } = useDoc<Class>(classRef);
  
  const isLoading = schoolLoading || staffLoading || classLoading;

  if (!staffId) {
    return <div>ID du membre du personnel invalide ou manquant dans l'URL.</div>;
  }
  
  const handleGeneratePayslip = async () => {
    if (!schoolData || !schoolId || !staffMember) return;

    setIsGeneratingPayslip(true);
    setPayslipDetails(null);
    setIsPayslipOpen(true);
    
    try {
        const staffDocRef = doc(firestore, `ecoles/${schoolId}/personnel/${staffId}`);
        const staffDocSnap = await getDoc(staffDocRef);
        const fullStaffData = staffDocSnap.exists() ? staffDocSnap.data() as Staff : staffMember;

        const payslipDate = new Date().toISOString();
        const details = await getPayslipDetails(fullStaffData, payslipDate, schoolData as OrganizationSettings);
        setPayslipDetails(details);
    } catch(e) {
        console.error(e);
        toast({
            variant: "destructive",
            title: "Erreur de génération",
            description: "Impossible de calculer le bulletin de paie. Vérifiez que toutes les données de paie sont renseignées.",
        });
        setIsPayslipOpen(false);
    } finally {
        setIsGeneratingPayslip(false);
    }
  };


  if (isLoading) {
    return (
        <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <Skeleton className="h-64 w-full" />
                </div>
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <Skeleton className="h-40 w-full" />
                </div>
            </div>
        </div>
    );
  }

  if (!staffMember) {
    notFound();
  }

  const staffFullName = `${staffMember.firstName} ${staffMember.lastName}`;
  const fallback = staffFullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();


  return (
    <>
    <div className="space-y-6">
        <div className="flex flex-wrap justify-end items-center gap-2">
             <Button variant="outline" onClick={() => handleGeneratePayslip()}>
              <FileText className="mr-2 h-4 w-4" />Bulletin de Paie
            </Button>
            <Button variant="outline" onClick={() => setIsInfoSheetOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />Imprimer la Fiche
            </Button>
        </div>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">

            {/* Left Column */}
            <div className="lg:col-span-1 flex flex-col gap-6">
                 <Card>
                    <CardHeader className="items-center text-center">
                        <Avatar className="h-24 w-24 mb-2">
                            <AvatarImage src={staffMember.photoURL || `https://picsum.photos/seed/${staffId}/100`} alt={staffFullName} data-ai-hint="person face" />
                            <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-2xl">{staffFullName}</CardTitle>
                        <CardDescription className='capitalize'>{staffMember.role}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex items-center">
                            <Mail className="mr-3 h-4 w-4 text-muted-foreground" />
                            <span>{staffMember.email}</span>
                        </div>
                        {staffMember.phone && (
                            <div className="flex items-center">
                                <Phone className="mr-3 h-4 w-4 text-muted-foreground" />
                                <span>{staffMember.phone}</span>
                            </div>
                        )}
                         <div className="flex items-center">
                            <Briefcase className="mr-3 h-4 w-4 text-muted-foreground" />
                            <span className="capitalize">{staffMember.role}</span>
                        </div>
                         {staffMember.role === 'enseignant' && (
                            <div className="flex items-center">
                                <Building className="mr-3 h-4 w-4 text-muted-foreground" />
                                <span>Matière: <strong>{staffMember.subject}</strong></span>
                            </div>
                         )}
                         {mainClass && (
                            <div className="flex items-center">
                                <BookUser className="mr-3 h-4 w-4 text-muted-foreground" />
                                <span>Prof. principal de: <strong>{mainClass.name}</strong></span>
                            </div>
                         )}
                    </CardContent>
                </Card>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 flex flex-col gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>À venir...</CardTitle>
                         <CardDescription>Cette section affichera des informations contextuelles comme les classes gérées, les performances des élèves, etc.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-40 w-full flex items-center justify-center bg-muted rounded-md">
                            <p className="text-muted-foreground">Bientôt disponible</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
    
     <Dialog open={isPayslipOpen} onOpenChange={setIsPayslipOpen}>
        <DialogContent className="max-w-4xl p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>Bulletin de paie</DialogTitle>
              <DialogDescription>
                Aperçu du bulletin de paie pour {payslipDetails?.employeeInfo.firstName} {payslipDetails?.employeeInfo.lastName || "..."}.
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 pt-2">
              {isGeneratingPayslip ? (
                  <div className="flex items-center justify-center h-96">
                      <p>Génération du bulletin de paie...</p>
                  </div>
              ) : payslipDetails ? (
                  <PayslipPreview details={payslipDetails} />
              ) : (
                  <div className="flex items-center justify-center h-96">
                      <p className="text-muted-foreground">La prévisualisation du bulletin n'a pas pu être générée.</p>
                  </div>
              )}
            </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isInfoSheetOpen} onOpenChange={setIsInfoSheetOpen}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Fiche de renseignements</DialogTitle>
            <DialogDescription>
                Aperçu de la fiche pour {staffMember.firstName} {staffMember.lastName}.
            </DialogDescription>
          </DialogHeader>
          {schoolData && <TeacherInfoSheet teacher={staffMember as Staff & {id: string}} school={schoolData} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
