
'use client';

import { notFound, useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Phone, BookUser, FileText, Briefcase, Building, Book, Shield, Pencil, CalendarDays } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, collection, query, where, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { staff as Staff, class_type as Class, admin_role as AdminRole, timetableEntry } from '@/lib/data-types';
import { useToast } from '@/hooks/use-toast';
import { ImageUploader } from '@/components/image-uploader';
import { updateStaffPhoto } from '@/services/staff-services';
import { SafeImage } from '@/components/ui/safe-image';
import { StaffEditForm } from '@/components/staff-edit-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { group } from 'd3-array';
import { StaffInfoTab } from '@/components/rh/staff-info-tab';


// ====================================================================================
// NOUVEAUX SOUS-COMPOSANTS POUR LE RENDU PROGRESSIF
// ====================================================================================

function MainClassInfo({ schoolId, classId }: { schoolId: string, classId?: string }) {
    const firestore = useFirestore();
    const classRef = useMemoFirebase(() => classId ? doc(firestore, `ecoles/${schoolId}/classes/${classId}`) : null, [schoolId, classId, firestore]);
    const { data: mainClass, loading } = useDoc<Class>(classRef);

    if (loading) return <Skeleton className="h-5 w-24" />;
    if (!mainClass) return null;

    return (
        <div className="flex items-center">
            <BookUser className="mr-3 h-4 w-4 text-muted-foreground" />
            <span>Prof. principal de: <strong>{mainClass.name}</strong></span>
        </div>
    );
}

function AdminRoleInfo({ schoolId, adminRoleId }: { schoolId: string, adminRoleId?: string }) {
    const firestore = useFirestore();
    const adminRoleRef = useMemoFirebase(() => adminRoleId ? doc(firestore, `ecoles/${schoolId}/admin_roles/${adminRoleId}`) : null, [schoolId, adminRoleId, firestore]);
    const { data: adminRole, loading } = useDoc<AdminRole>(adminRoleRef);

    if (loading) return <Skeleton className="h-5 w-32" />;
    if (!adminRole) return null;

    return (
        <div className="flex items-center">
            <Shield className="mr-3 h-4 w-4 text-muted-foreground" />
            <span>Rôle Admin: <strong>{adminRole.name}</strong></span>
        </div>
    );
}


function TimetableTab({ schoolId, staffId }: { schoolId: string, staffId: string }) {
    const firestore = useFirestore();
    const timetableQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/emploi_du_temps`), where('teacherId', '==', staffId)), [firestore, schoolId, staffId]);
    const classesQuery = useMemoFirebase(() => collection(firestore, `ecoles/${schoolId}/classes`), [firestore, schoolId]);

    const { data: timetableData, loading: timetableLoading } = useCollection(timetableQuery);
    const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
    
    const classMap = useMemo(() => new Map(classesData?.map(d => [d.id, d.data().name])), [classesData]);

    const groupedTimetable = useMemo(() => {
        const entries = timetableData?.map(d => d.data() as timetableEntry) || [];
        // Group by day, then sort by start time
        const grouped = group(entries, d => d.day);
        grouped.forEach((dayEntries, day) => {
            dayEntries.sort((a, b) => a.startTime.localeCompare(b.startTime));
        });
        return Array.from(grouped.entries()).sort(([dayA], [dayB]) => {
            const order = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
            return order.indexOf(dayA) - order.indexOf(dayB);
        });
    }, [timetableData]);

    if (timetableLoading || classesLoading) {
        return <Skeleton className="h-48 w-full" />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" />Emploi du Temps Hebdomadaire</CardTitle>
                <CardDescription>Aperçu des cours assignés à cet enseignant.</CardDescription>
            </CardHeader>
            <CardContent>
                {groupedTimetable.length > 0 ? (
                     <div className="space-y-4">
                        {groupedTimetable.map(([day, entries]) => (
                            <div key={day}>
                                <h3 className="font-semibold text-md mb-2">{day}</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-24">Heure</TableHead>
                                            <TableHead>Classe</TableHead>
                                            <TableHead>Matière</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {entries.map((entry, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{entry.startTime} - {entry.endTime}</TableCell>
                                                <TableCell>{classMap.get(entry.classId) || 'N/A'}</TableCell>
                                                <TableCell>{entry.subject}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                           </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-8">
                        Aucun cours assigné dans l'emploi du temps pour cet enseignant.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ====================================================================================
// COMPOSANT PRINCIPAL
// ====================================================================================

export default function StaffProfilePage() {
    const params = useParams();
    const staffId = params.staffId as string;
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();
    const { user } = useUser();
    const canManageUsers = !!user?.profile?.permissions?.manageUsers;

    const { toast } = useToast();
    const router = useRouter();
    
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
    const staffRef = useMemoFirebase(() => (schoolId && staffId) ? doc(firestore, `ecoles/${schoolId}/personnel/${staffId}`) : null, [firestore, schoolId, staffId]);
    const { data: staffMember, loading: staffLoading, error } = useDoc<Staff>(staffRef);

    // Queries for the edit form, can load in background
    const allSchoolClassesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
    const { data: allSchoolClassesData, loading: allClassesLoading } = useCollection(allSchoolClassesQuery);

    const allAdminRolesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/admin_roles`) : null, [firestore, schoolId]);
    const { data: allAdminRolesData, loading: allAdminRolesLoading } = useCollection(allAdminRolesQuery);
    
    const allSchoolClasses = useMemo(() => allSchoolClassesData?.docs.map(d => ({ id: d.id, ...d.data() } as Class & {id: string})) || [], [allSchoolClassesData]);
    const allAdminRoles = useMemo(() => allAdminRolesData?.docs.map(d => ({ id: d.id, ...d.data() } as AdminRole & {id: string})) || [], [allAdminRolesData]);


    const isLoading = staffLoading || schoolLoading;

    if (isLoading) {
        return <StaffDetailSkeleton />;
    }

    if (!staffMember) {
        notFound();
    }

    const handlePhotoUploadComplete = async (url: string) => {
        try {
            await updateStaffPhoto(firestore, schoolId!, staffId, url);
            toast({ title: 'Photo de profil mise à jour !' });
        } catch (error) {
            // L'erreur est gérée dans le service via l'emitter
        }
    };

    const staffFullName = `${staffMember.firstName} ${staffMember.lastName}`;
    const fallback = staffFullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
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
    
                {/* Colonne de gauche */}
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
                            <AdminRoleInfo schoolId={schoolId!} adminRoleId={staffMember.adminRole} />
                            {staffMember.role === 'enseignant' && (
                                <div className="flex items-center">
                                    <Building className="mr-3 h-4 w-4 text-muted-foreground" />
                                    <span>Matière: <strong>{staffMember.subject || 'N/A'}</strong></span>
                                </div>
                             )}
                            <MainClassInfo schoolId={schoolId!} classId={staffMember.classId} />
                        </CardContent>
                    </Card>
                </div>
    
                {/* Colonne de droite */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                     <Tabs defaultValue="timetable">
                        <TabsList>
                            <TabsTrigger value="timetable">Emploi du Temps</TabsTrigger>
                            <TabsTrigger value="info">Informations</TabsTrigger>
                        </TabsList>
                        <TabsContent value="timetable" className="mt-4">
                             <TimetableTab schoolId={schoolId!} staffId={staffId} />
                        </TabsContent>
                        <TabsContent value="info" className="mt-4">
                            <StaffInfoTab staff={staffMember} />
                        </TabsContent>
                    </Tabs>
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
                  schoolId={schoolId!}
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
            <div className="flex justify-end"><Skeleton className="h-10 w-48" /></div>
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
