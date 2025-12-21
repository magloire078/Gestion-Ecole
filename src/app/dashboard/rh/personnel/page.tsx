
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, MoreHorizontal, FileText, BookUser, Mail, Phone, Trash2 } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCollection, useFirestore, useAuth, useMemoFirebase, useUser } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc, writeBatch, query, where, getDoc } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { getPayslipDetails } from '@/lib/bulletin-de-paie';
import type { PayslipDetails } from '@/lib/bulletin-de-paie';
import type { staff as Staff, school as OrganizationSettings, admin_role as AdminRole } from '@/lib/data-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PayslipPreview } from '@/components/payroll/payslip-template';
import type { class_type as Class } from '@/lib/data-types';
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { StaffEditForm } from "@/components/staff-edit-form";


type StaffMember = Staff & { id: string };

export default function PersonnelPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();
  
  const canManageUsers = !!user?.profile?.permissions?.manageUsers;

  const staffQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);
  
  const { teachers, otherStaff } = useMemo(() => {
    const allStaff: StaffMember[] = staffData?.map(d => ({ id: d.id, ...d.data() } as StaffMember)) || [];
    return {
        teachers: allStaff.filter(s => s.role === 'enseignant' || s.role === 'enseignant_principal'),
        otherStaff: allStaff.filter(s => s.role !== 'enseignant' && s.role !== 'enseignant_principal'),
    }
  }, [staffData]);

  const classesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const adminRolesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/admin_roles`)) : null, [firestore, schoolId]);
  const { data: adminRolesData, loading: adminRolesLoading } = useCollection(adminRolesQuery);
  const adminRoles: (AdminRole & {id: string})[] = useMemo(() => adminRolesData?.map(d => ({ id: d.id, ...d.data() } as AdminRole & {id: string})) || [], [adminRolesData]);


  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  
  const handleDelete = () => {
    if (!schoolId || !staffToDelete) return;
    const staffDocRef = doc(firestore, `ecoles/${schoolId}/personnel/${staffToDelete.id}`);
    
    deleteDoc(staffDocRef)
      .then(() => {
        toast({ title: "Membre du personnel supprimé", description: `${staffToDelete.firstName} ${staffToDelete.lastName} a été retiré(e) de la liste.` });
      }).catch((serverError) => {
        const permissionError = new FirestorePermissionError({ path: staffDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
      }).finally(() => {
        setIsDeleteDialogOpen(false);
        setStaffToDelete(null);
      });
  };

  const handleOpenFormDialog = (staffMember: StaffMember | null) => {
    setEditingStaff(staffMember);
    setIsFormOpen(true);
  };
  
  const handleOpenDeleteDialog = (staffMember: StaffMember) => {
    setStaffToDelete(staffMember);
    setIsDeleteDialogOpen(true);
  };

  const isLoading = schoolLoading || staffLoading || classesLoading || adminRolesLoading || userLoading;

  const renderStaffCard = (member: StaffMember) => {
    const fullName = `${member.firstName} ${member.lastName}`;
    const fallback = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase();
    const className = classes.find(c => c.id === member.classId)?.name;

    return (
        <Card key={member.id} className="flex flex-col">
          <Link href={`/dashboard/rh/${member.id}`} className="flex-1 flex flex-col hover:bg-accent/50 rounded-t-xl transition-colors">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={member.photoURL || `https://picsum.photos/seed/${member.id}/100`} alt={fullName} data-ai-hint="person face" />
                            <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle>{fullName}</CardTitle>
                            <CardDescription className="capitalize">{member.role === 'enseignant' ? member.subject : member.role?.replace(/_/g, ' ')}</CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center">
                    <Mail className="mr-2 h-4 w-4" />
                    <span className="truncate">{member.email}</span>
                </div>
                {member.phone && (
                    <div className="flex items-center">
                        <Phone className="mr-2 h-4 w-4" />
                        <span className="truncate">{member.phone}</span>
                    </div>
                )}
                {className && (
                     <div className="flex items-center">
                        <BookUser className="mr-2 h-4 w-4" />
                        <span>Classe principale: <strong>{className}</strong></span>
                    </div>
                )}
            </CardContent>
          </Link>
           <CardFooter className="pt-4 border-t">
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start">
                      <span className="flex items-center gap-2">
                        <MoreHorizontal className="h-4 w-4" /> Actions
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/rh/${member.id}`)}>
                        <span className="flex items-center gap-2"><BookUser className="h-4 w-4" />Voir le Profil</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/rh/${member.id}/fiche`)}>
                        <span className="flex items-center gap-2"><FileText className="h-4 w-4" />Imprimer Fiche</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/rh/${member.id}/payslip`)}>
                        <span className="flex items-center gap-2"><FileText className="h-4 w-4" />Bulletin de Paie</span>
                      </DropdownMenuItem>
                      {canManageUsers && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOpenFormDialog(member)}>
                            <span className="flex items-center gap-2">Modifier</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(member)}>
                            <span className="flex items-center gap-2"><Trash2 className="h-4 w-4" />Supprimer</span>
                          </DropdownMenuItem>
                        </>
                      )}
                  </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
        </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
              <h1 className="text-lg font-semibold md:text-2xl">Gestion du Personnel</h1>
              <p className="text-muted-foreground">Gérez le personnel (enseignant et non-enseignant) de votre école.</p>
          </div>
          {canManageUsers && (
            <Button onClick={() => handleOpenFormDialog(null)}>
              <span className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" /> Ajouter un Membre
              </span>
            </Button>
          )}
        </div>
        
        <Tabs defaultValue="teachers">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="teachers">Enseignants ({teachers.length})</TabsTrigger>
                <TabsTrigger value="staff">Autre Personnel ({otherStaff.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="teachers" className="mt-6">
                {isLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                    </div>
                ) : teachers.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {teachers.map(renderStaffCard)}
                    </div>
                ) : (
                    <Card className="flex items-center justify-center h-48">
                        <p className="text-muted-foreground">Aucun enseignant n'a été ajouté pour le moment.</p>
                    </Card>
                )}
            </TabsContent>
             <TabsContent value="staff" className="mt-6">
                {isLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                    </div>
                ) : otherStaff.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {otherStaff.map(renderStaffCard)}
                    </div>
                ) : (
                    <Card className="flex items-center justify-center h-48">
                        <p className="text-muted-foreground">Aucun autre membre du personnel n'a été ajouté.</p>
                    </Card>
                )}
            </TabsContent>
        </Tabs>
      </div>
      
      {canManageUsers && (
        <>
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Le membre du personnel <strong>{staffToDelete?.firstName} {staffToDelete?.lastName}</strong> sera définitivement supprimé. Son compte utilisateur ne sera pas supprimé mais il n'aura plus accès à l'école.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
           <Dialog open={isFormOpen} onOpenChange={() => { setIsFormOpen(false); setEditingStaff(null); }}>
              <DialogContent className="sm:max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>{editingStaff ? "Modifier un Membre" : "Ajouter un Membre du Personnel"}</DialogTitle>
                    <DialogDescription>
                      {editingStaff ? `Mettez à jour les informations de ${editingStaff.firstName} ${editingStaff.lastName}.` : "Renseignez les informations du nouveau membre."}
                    </DialogDescription>
                  </DialogHeader>
                  <StaffEditForm
                      schoolId={schoolId}
                      editingStaff={editingStaff}
                      classes={classes}
                      adminRoles={adminRoles}
                      onFormSubmit={() => {
                          setIsFormOpen(false);
                          setEditingStaff(null);
                      }}
                   />
              </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
