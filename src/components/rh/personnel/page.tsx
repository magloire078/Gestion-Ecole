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
import { PlusCircle, MoreHorizontal, FileText, BookUser, Mail, Phone, Trash2, Search, List, LayoutGrid, Users, Briefcase, Shield } from "lucide-react";
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
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, doc, query } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import type { staff as Staff, admin_role as AdminRole, subject as Subject } from '@/lib/data-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { class_type as Class } from '@/lib/data-types';
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { StaffEditForm } from "@/components/rh/staff-edit-form";
import { Input } from "@/components/ui/input";
import { deleteStaffMember } from "@/services/staff-services";
import { StaffGrid } from '@/components/rh/staff-grid'; // New import
import { StaffTable } from '@/components/rh/staff-table'; // New import

type StaffMember = Staff & { id: string };

const StatCard = ({ title, value, icon: Icon, loading }: { title: string, value: string | number, icon: React.ElementType, loading: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}
        </CardContent>
    </Card>
);

export default function PersonnelPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();
  
  const canManageUsers = !!user?.profile?.permissions?.manageUsers;

  const staffQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
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

  const classesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [schoolId, firestore]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const adminRolesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/admin_roles`)) : null, [schoolId, firestore]);
  const { data: adminRolesData, loading: adminRolesLoading } = useCollection(adminRolesQuery);
  const adminRoles: (AdminRole & {id: string})[] = useMemo(() => adminRolesData?.map(d => ({ id: d.id, ...d.data() } as AdminRole & {id: string})) || [], [adminRolesData]);

  const subjectsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/matieres`)) : null, [schoolId, firestore]);
  const { data: subjectsData, loading: subjectsLoading } = useCollection(subjectsQuery);
  const subjects = useMemo(() => subjectsData?.map(d => ({ id: d.id, ...d.data() } as Subject & {id: string})) || [], [subjectsData]);

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

  const isLoading = schoolLoading || staffLoading || classesLoading || adminRolesLoading || userLoading || subjectsLoading;

  return (
    <>
      <div className="space-y-6">
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total du Personnel" value={staffData?.length || 0} icon={Users} loading={isLoading} />
            <StatCard title="Enseignants" value={teachers.length} icon={BookUser} loading={isLoading} />
            <StatCard title="Autres Rôles" value={otherStaff.length} icon={Briefcase} loading={isLoading} />
            <StatCard title="Rôles Admin" value={adminRoles.length} icon={Shield} loading={isLoading} />
        </div>
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 flex-1">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Rechercher par nom ou email..." 
                        className="pl-10"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                 <Button variant="outline" size="icon" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-accent' : ''}>
                    <List className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-accent' : ''}>
                    <LayoutGrid className="h-4 w-4" />
                </Button>
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
                 {isLoading ? <Skeleton className="h-64 w-full" /> : (
                    viewMode === 'grid' ? (
                        <StaffGrid staff={teachers} onEdit={handleOpenFormDialog} onDelete={handleOpenDeleteDialog} classes={classes} />
                    ) : (
                        <StaffTable staff={teachers} onEdit={handleOpenFormDialog} onDelete={handleOpenDeleteDialog} classes={classes} />
                    )
                 )}
            </TabsContent>
             <TabsContent value="staff" className="mt-6">
                 {isLoading ? <Skeleton className="h-64 w-full" /> : (
                    viewMode === 'grid' ? (
                        <StaffGrid staff={otherStaff} onEdit={handleOpenFormDialog} onDelete={handleOpenDeleteDialog} classes={classes} />
                    ) : (
                        <StaffTable staff={otherStaff} onEdit={handleOpenFormDialog} onDelete={handleOpenDeleteDialog} classes={classes} />
                    )
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
          
           <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogContent className="sm:max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>{editingStaff ? "Modifier un Membre" : "Ajouter un Membre du Personnel"}</DialogTitle>
                    <DialogDescription>
                      {editingStaff ? `Mettez à jour les informations de ${editingStaff.firstName} ${editingStaff.lastName}.` : "Renseignez les informations du nouveau membre."}
                    </DialogDescription>
                  </DialogHeader>
                  <StaffEditForm
                      key={editingStaff?.id || 'new'}
                      schoolId={schoolId!}
                      editingStaff={editingStaff}
                      classes={classes}
                      adminRoles={adminRoles}
                      subjects={subjects}
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
