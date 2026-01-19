
'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, MoreHorizontal, FileText, BookUser, Mail, Phone, Trash2, Search } from "lucide-react";
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
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, query } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import type { staff as Staff, admin_role as AdminRole } from '@/lib/data-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { class_type as Class } from '@/lib/data-types';
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { StaffEditForm } from "@/components/rh/staff-edit-form";
import { Input } from "@/components/ui/input";
import { deleteStaffMember } from "@/services/staff-services";

type StaffMember = Staff & { id: string };

export default function PersonnelPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();
  
  const canManageUsers = !!user?.profile?.permissions?.manageUsers;

  const staffQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const { teachers, otherStaff } = useMemo(() => {
    const allStaff: StaffMember[] = staffData?.map(d => ({ id: d.id, ...d.data() } as StaffMember)) || [];
    
    const filteredStaff = allStaff.filter(s => 
        (s.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return {
        teachers: filteredStaff.filter(s => s.role === 'enseignant' || s.role === 'enseignant_principal'),
        otherStaff: filteredStaff.filter(s => s.role !== 'enseignant' && s.role !== 'enseignant_principal'),
    }
  }, [staffData, searchTerm]);

  const classesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [schoolId, firestore]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const adminRolesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/admin_roles`)) : null, [schoolId, firestore]);
  const { data: adminRolesData, loading: adminRolesLoading } = useCollection(adminRolesQuery);
  const adminRoles: (AdminRole & {id: string})[] = useMemo(() => adminRolesData?.map(d => ({ id: d.id, ...d.data() } as AdminRole & {id: string})) || [], [adminRolesData]);


  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  
  const handleDelete = () => {
    if (!schoolId || !staffToDelete) return;
    
    deleteStaffMember(firestore, schoolId, staffToDelete.id, staffToDelete.role)
      .then(() => {
        toast({ title: "Membre du personnel supprimé", description: `${staffToDelete.firstName} ${staffToDelete.lastName} a été retiré(e) de la liste.` });
      }).catch((serverError) => {
        // L'erreur est gérée par le service, pas besoin de toast ici.
        console.error("Erreur lors de la suppression du membre du personnel :", serverError);
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
              <div className="flex w-full items-center justify-between">
                  <Button asChild size="sm">
                      <Link href={`/dashboard/rh/${member.id}`}>
                        <BookUser className="mr-2 h-4 w-4" />
                        Voir Profil
                      </Link>
                  </Button>
                  {canManageUsers && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/rh/${member.id}/fiche`)}>
                            <FileText className="mr-2 h-4 w-4" />Imprimer Fiche
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/rh/${member.id}/bulletin`)}>
                            <FileText className="mr-2 h-4 w-4" />Bulletin de Paie
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOpenFormDialog(member)}>
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(member)}>
                            Supprimer
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
                  )}
              </div>
            </CardFooter>
        </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Rechercher par nom ou email..." 
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
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
                        <p className="text-muted-foreground">Aucun enseignant trouvé.</p>
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
                        <p className="text-muted-foreground">Aucun autre membre du personnel trouvé.</p>
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
