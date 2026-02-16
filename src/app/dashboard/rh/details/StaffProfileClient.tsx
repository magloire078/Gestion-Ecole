'use client';

import { notFound, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Phone, BookUser, FileText, Briefcase, Building, Shield, Pencil, CalendarDays } from 'lucide-react';
import React, { useMemo, useState, Suspense } from 'react';
import { useDoc, useFirestore, useCollection, useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, collection, query, where, type DocumentReference, type DocumentData } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { staff as Staff, class_type as Class, admin_role as AdminRole, timetableEntry, subject as Subject } from '@/lib/data-types';
import { useToast } from '@/hooks/use-toast';
import { ImageUploader } from '@/components/image-uploader';
import { updateStaffPhoto } from '@/services/staff-services';
import { StaffEditForm } from '@/components/rh/staff-edit-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { group } from 'd3-array';
import { StaffInfoTab } from '@/components/rh/staff-info-tab';
import { StaffPayrollTab } from '@/components/rh/staff-payroll-tab';

function MainClassInfo({ schoolId, classId }: { schoolId: string, classId?: string }) {
    const firestore = useFirestore();
    const classRef = useMemo(() => classId ? doc(firestore, `ecoles/${schoolId}/classes/${classId}`) as DocumentReference<Class, DocumentData> : null, [schoolId, classId, firestore]);
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
    const adminRoleRef = useMemo(() => adminRoleId ? doc(firestore, `ecoles/${schoolId}/admin_roles/${adminRoleId}`) as DocumentReference<AdminRole, DocumentData> : null, [schoolId, adminRoleId, firestore]);
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

function TimetableTab({ timetableEntries, classMap, loading }: {
    timetableEntries: timetableEntry[],
    classMap: Map<string, string>,
    loading: boolean
}) {
    const groupedTimetable = useMemo(() => {
        const entries = timetableEntries || [];
        const grouped = group(entries, d => d.day);
        grouped.forEach((dayEntries) => {
            dayEntries.sort((a, b) => a.startTime.localeCompare(b.startTime));
        });
        return Array.from(grouped.entries()).sort(([dayA], [dayB]) => {
            const order = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
            return order.indexOf(dayA) - order.indexOf(dayB);
        });
    }, [timetableEntries]);

    if (loading) {
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

function StaffProfileContent({ staffId }: { staffId: string }) {
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();
    const { user } = useUser();
    const canManageUsers = !!user?.profile?.permissions?.manageUsers;

    const { toast } = useToast();
    const router = useRouter();

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const staffRef = useMemo(() => (schoolId && staffId) ? doc(firestore, `ecoles/${schoolId}/personnel/${staffId}`) as DocumentReference<Staff, DocumentData> : null, [firestore, schoolId, staffId, refreshKey]);
    const { data: staffData, loading: staffLoading } = useDoc<Staff>(staffRef);
    const staffMember = useMemo(() => staffData ? { ...staffData, id: staffId } as Staff & { id: string } : null, [staffData, staffId]);

    const allSchoolClassesQuery = useMemo(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
    const { data: allSchoolClassesData, loading: allClassesLoading } = useCollection(allSchoolClassesQuery);

    const allAdminRolesQuery = useMemo(() => schoolId ? collection(firestore, `ecoles/${schoolId}/admin_roles`) : null, [firestore, schoolId]);
    const { data: allAdminRolesData, loading: allAdminRolesLoading } = useCollection(allAdminRolesQuery);

    const subjectsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/matieres`)) : null, [schoolId, firestore]);
    const { data: subjectsData, loading: subjectsLoading } = useCollection(subjectsQuery);

    const allSchoolClasses = useMemo(() => (allSchoolClassesData || []).map(d => ({ id: d.id, ...d.data() } as Class & { id: string })), [allSchoolClassesData]);
    const allAdminRoles = useMemo(() => (allAdminRolesData || []).map(d => ({ id: d.id, ...d.data() } as AdminRole & { id: string })), [allAdminRolesData]);
    const subjects = useMemo(() => (subjectsData || []).map(d => ({ id: d.id, ...d.data() } as Subject & { id: string })), [subjectsData]);

    const timetableQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/emploi_du_temps`), where('teacherId', '==', staffId)) : null, [firestore, schoolId, staffId]);
    const { data: timetableData, loading: timetableLoading } = useCollection(timetableQuery);

    const timetableEntries = useMemo(() => timetableData?.map(d => d.data() as timetableEntry) || [], [timetableData]);
    const classMap = useMemo(() => new Map(allSchoolClasses.map(c => [c.id, c.name])), [allSchoolClasses]);

    const isLoading = staffLoading || schoolLoading || timetableLoading || allClassesLoading || allAdminRolesLoading || subjectsLoading;

    if (isLoading) {
        return <StaffDetailSkeleton />;
    }

    if (!staffMember) {
        notFound();
    }

    const handlePhotoUploadComplete = async (url: string) => {
        try {
            await updateStaffPhoto(schoolId!, staffId, url);
            toast({ title: 'Photo de profil mise à jour !' });
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            // Error managed in service
        }
    };

    const staffFullName = `${staffMember.firstName} ${staffMember.lastName}`;
    const fallback = staffFullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-wrap justify-end items-center gap-2">
                    <Button variant="outline" onClick={() => router.push(`/dashboard/rh/fiche?id=${staffId}`)}>
                        <span className="flex items-center gap-2"><FileText className="mr-2 h-4 w-4" />Fiche de Renseignements</span>
                    </Button>
                    <Button variant="outline" onClick={() => router.push(`/dashboard/rh/bulletin?id=${staffId}`)}>
                        <span className="flex items-center gap-2"><FileText className="mr-2 h-4 w-4" />Voir Bulletin de Paie</span>
                    </Button>
                    {canManageUsers && (
                        <Button onClick={() => setIsEditDialogOpen(true)}>
                            <Pencil className="mr-2 h-4 w-4" /> Modifier
                        </Button>
                    )}
                </div>
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <Card>
                            <CardHeader className="items-center text-center">
                                <ImageUploader
                                    onUploadComplete={handlePhotoUploadComplete}
                                    storagePath={`ecoles/${schoolId}/staff/${staffId}/avatars/`}
                                    currentImageUrl={staffMember.photoURL}
                                    resizeWidth={400}
                                >
                                    <Avatar className="h-24 w-24 mb-2 cursor-pointer border-2 border-muted">
                                        <AvatarImage src={staffMember.photoURL || undefined} alt={staffFullName} />
                                        <AvatarFallback className="text-xl font-bold bg-primary/5 text-primary">{fallback}</AvatarFallback>
                                    </Avatar>
                                </ImageUploader>
                                <CardTitle className="text-2xl">{staffFullName}</CardTitle>
                                <CardDescription className='capitalize'>{staffMember.role?.replace(/_/g, ' ')}</CardDescription>
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
                                    <span className="capitalize">{staffMember.role?.replace(/_/g, ' ')}</span>
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
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <Tabs defaultValue="timetable">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="timetable">Emploi du Temps</TabsTrigger>
                                <TabsTrigger value="payroll">Paie</TabsTrigger>
                                <TabsTrigger value="info">Informations</TabsTrigger>
                            </TabsList>
                            <TabsContent value="timetable" className="mt-4">
                                <TimetableTab
                                    timetableEntries={timetableEntries}
                                    classMap={classMap}
                                    loading={isLoading}
                                />
                            </TabsContent>
                            <TabsContent value="payroll" className="mt-4">
                                <StaffPayrollTab staff={staffMember} />
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
                        key={staffMember.id}
                        schoolId={schoolId!}
                        editingStaff={staffMember}
                        classes={allSchoolClasses}
                        adminRoles={allAdminRoles}
                        subjects={subjects}
                        onFormSubmit={() => setIsEditDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}

export default function StaffProfileClient() {
    const searchParams = useSearchParams();
    const staffId = searchParams.get('id') as string;

    return (
        <Suspense fallback={<StaffDetailSkeleton />}>
            <StaffProfileContent staffId={staffId} />
        </Suspense>
    )
}
