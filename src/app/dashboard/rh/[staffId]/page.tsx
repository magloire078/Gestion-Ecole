

'use client';

import { notFound, useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Phone, BookUser, FileText, Briefcase, Building, Book, Shield, Pencil } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, collection, query, where, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { staff as Staff, class_type as Class, school as OrganizationSettings, timetableEntry as TimetableEntry, admin_role as AdminRole } from '@/lib/data-types';
import { useToast } from '@/hooks/use-toast';
import { ImageUploader } from '@/components/image-uploader';
import { updateStaffPhoto } from '@/services/staff-services';
import { SafeImage } from '@/components/ui/safe-image';
import { StaffEditForm } from '@/components/staff-edit-form';

export default function StaffProfilePage() {
    const params = useParams();
    const staffId = params.staffId as string;
    const { schoolId, loading: schoolLoading } = useSchoolData();

    if (schoolLoading) {
        return <StaffDetailSkeleton />;
    }
    
    if (!schoolId) {
        return <p>Erreur: Aucune école n'est associée à votre compte.</p>;
    }
    
    if (!staffId) {
        return <p>Erreur: ID du membre du personnel manquant.</p>;
    }

    return <StaffProfileContent staffId={staffId} schoolId={schoolId} />;
}

interface StaffProfileContentProps {
    staffId: string;
    schoolId: string;
}

function StaffProfileContent({ staffId, schoolId }: StaffProfileContentProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const canManageUsers = !!user?.profile?.permissions?.manageUsers;

  const { toast } = useToast();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const staffRef = useMemoFirebase(() => doc(firestore, `ecoles/${schoolId}/personnel/${staffId}`), [firestore, schoolId, staffId]);
  const { data: staffMemberData, loading: staffLoading } = useDoc<Staff>(staffRef);

  const staffMember = staffMemberData as Staff | null;
  
  const adminRoleRef = useMemoFirebase(() => staffMember?.adminRole ? doc(firestore, `ecoles/${schoolId}/admin_roles/${staffMember.adminRole}`) : null, [staffMember, schoolId, firestore]);
  const { data: adminRoleData, loading: adminRoleLoading } = useDoc<AdminRole>(adminRoleRef);
  const adminRole = adminRoleData as AdminRole | null;

  const classRef = useMemoFirebase(() => staffMember?.classId ? doc(firestore, `ecoles/${schoolId}/classes/${staffMember.classId}`) : null, [staffMember, schoolId, firestore]);
  const { data: mainClass, loading: classLoading } = useDoc<Class>(classRef);
  
  const allSchoolClassesQuery = useMemoFirebase(() => collection(firestore, `ecoles/${schoolId}/classes`), [firestore, schoolId]);
  const { data: allSchoolClassesData, loading: allClassesLoading } = useCollection(allSchoolClassesQuery);
  const allSchoolClasses: Class[] = useMemo(() => allSchoolClassesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [allSchoolClassesData]);

  const allAdminRolesQuery = useMemoFirebase(() => collection(firestore, `ecoles/${schoolId}/admin_roles`), [firestore, schoolId]);
  const { data: allAdminRolesData, loading: allAdminRolesLoading } = useCollection(allAdminRolesQuery);
  const allAdminRoles: (AdminRole & {id: string})[] = useMemo(() => allAdminRolesData?.map(d => ({ id: d.id, ...d.data() } as AdminRole & {id: string})) || [], [allAdminRolesData]);

  const timetableQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/emploi_du_temps`), where('teacherId', '==', staffId)), [firestore, schoolId, staffId]);
  const { data: timetableData, loading: timetableLoading } = useCollection(timetableQuery);
  const timetableEntries = useMemo(() => timetableData?.map(d => d.data() as TimetableEntry) || [], [timetableData]);
  
  const isLoading = staffLoading || classLoading || timetableLoading || adminRoleLoading || allClassesLoading || allAdminRolesLoading;

  if (isLoading) {
    return <StaffDetailSkeleton />;
  }

  if (!staffMember) {
    notFound();
  }

  const handlePhotoUploadComplete = async (url: string) => {
    try {
        await updateStaffPhoto(firestore, schoolId, staffId, url);
        toast({ title: 'Photo de profil mise à jour !' });
    } catch (error) {
        // Error is handled by the service
    }
  };

  const staffFullName = `${staffMember.firstName} ${staffMember.lastName}`;
  const fallback = staffFullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();

  const uniqueSubjects = [...new Set(timetableEntries.map(e => e.subject))];
  const uniqueClasses = [...new Set(timetableEntries.map(e => e.classId))];


  return (
    <>
    <div className="space-y-6">
        <div className="flex flex-wrap justify-end items-center gap-2">
            <Button variant="outline" onClick={() => router.push(`/dashboard/rh/${staffId}/fiche`)}>
              <span className="flex items-center gap-2"><FileText className="mr-2 h-4 w-4" />Imprimer la Fiche</span>
            </Button>
            {canManageUsers && (
              <Button onClick={() => setIsEditDialogOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Modifier
              </Button>
            )}
        </div>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">

            {/* Left Column */}
            <div className="lg:col-span-1 flex flex-col gap-6">
                 <Card>
                    <CardHeader className="items-center text-center">
                        <ImageUploader 
                            onUploadComplete={handlePhotoUploadComplete}
                            storagePath={`ecoles/${schoolId}/staff/${staffId}/avatars/`}
                            currentImageUrl={staffMember.photoURL}
                        >
                            <Avatar className="h-24 w-24 mb-2 cursor-pointer hover:opacity-80 transition-opacity">
                                <SafeImage src={staffMember.photoURL} alt={staffFullName} width={96} height={96} className="rounded-full" />
                                <AvatarFallback>{fallback}</AvatarFallback>
                            </Avatar>
                        </ImageUploader>
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
                         {adminRole && (
                            <div className="flex items-center">
                                <Shield className="mr-3 h-4 w-4 text-muted-foreground" />
                                <span>Rôle Admin: <strong>{adminRole.name}</strong></span>
                            </div>
                         )}
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
                        <CardTitle>Statistiques</CardTitle>
                         <CardDescription>Aperçu de l'activité de l'enseignant.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                                <Book className="h-8 w-8 text-primary mb-2"/>
                                <p className="text-2xl font-bold">{uniqueSubjects.length}</p>
                                <p className="text-sm text-muted-foreground">Matière(s) enseignée(s)</p>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                                <School className="h-8 w-8 text-primary mb-2"/>
                                <p className="text-2xl font-bold">{uniqueClasses.length}</p>
                                <p className="text-sm text-muted-foreground">Classe(s) assignée(s)</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
    
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Modifier un Membre du Personnel</DialogTitle>
            <DialogDescription>Mettez à jour les informations de {staffMember.firstName} {staffMember.lastName}.</DialogDescription>
          </DialogHeader>
          <StaffEditForm
              schoolId={schoolId}
              editingStaff={staffMember}
              classes={allSchoolClasses}
              adminRoles={allAdminRoles}
              onFormSubmit={() => setIsEditDialogOpen(false)}
           />
        </DialogContent>
      </Dialog>
    </>
  );
}

function StaffDetailSkeleton() {
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
    )
}
