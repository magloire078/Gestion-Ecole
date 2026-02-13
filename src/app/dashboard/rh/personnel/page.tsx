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
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useSchoolData } from "@/hooks/use-school-data";
import { useStaff } from "@/hooks/use-staff"; // Import useStaff hook
import type { staff as Staff, admin_role as AdminRole, subject as Subject } from '@/lib/data-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { class_type as Class } from '@/lib/data-types';
import Link from 'next/link';
import { StaffEditForm } from "@/components/rh/staff-edit-form";
import { Input } from "@/components/ui/input";
import { StaffService } from "@/services/staff-services"; // Import StaffService
import { StaffGrid } from '@/components/rh/staff-grid';
import { StaffTable } from '@/components/rh/staff-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


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

  // Use useStaff hook instead of direct collection query
  const { staff: allStaff, loading: staffLoading } = useStaff(schoolId);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // allStaff is already formatted by the hook

  const uniqueRoles = useMemo(() => {
    const roles = new Set(allStaff.map(s => s.role));
    return Array.from(roles).sort((a, b) => a.localeCompare(b));
  }, [allStaff]);

  const filteredStaff = useMemo(() => {
    return allStaff.filter(s => {
      const searchMatch = searchTerm === '' ||
        (s.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase());
      const roleMatch = selectedRole === 'all' || s.role === selectedRole;
      return searchMatch && roleMatch;
    });
  }, [allStaff, searchTerm, selectedRole]);


  const classesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [schoolId, firestore]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const adminRolesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/admin_roles`)) : null, [schoolId, firestore]);
  const { data: adminRolesData, loading: adminRolesLoading } = useCollection(adminRolesQuery);
  const adminRoles: (AdminRole & { id: string })[] = useMemo(() => adminRolesData?.map(d => ({ id: d.id, ...d.data() } as AdminRole & { id: string })) || [], [adminRolesData]);

  const subjectsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/matieres`)) : null, [schoolId, firestore]);
  const { data: subjectsData, loading: subjectsLoading } = useCollection(subjectsQuery);
  const subjects = useMemo(() => subjectsData?.map(d => ({ id: d.id, ...d.data() } as Subject & { id: string })) || [], [subjectsData]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);

  const handleDelete = () => {
    if (!schoolId || !staffToDelete) return;

    // Use StaffService for deletion
    StaffService.deleteStaffMember(schoolId, staffToDelete.id)
      .then(() => {
        toast({ title: "Membre du personnel supprimé", description: `${staffToDelete.firstName} ${staffToDelete.lastName} a été retiré(e) de la liste.` });
      }).catch((serverError) => {
        console.error("Erreur lors de la suppression du membre du personnel :", serverError);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de supprimer le membre du personnel.",
        });
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
          <StatCard title="Total du Personnel" value={allStaff.length} icon={Users} loading={isLoading} />
          <StatCard title="Enseignants" value={allStaff.filter(s => s.role === 'enseignant' || s.role === 'enseignant_principal').length} icon={BookUser} loading={isLoading} />
          <StatCard title="Autres Rôles" value={allStaff.filter(s => s.role !== 'enseignant' && s.role !== 'enseignant_principal').length} icon={Briefcase} loading={isLoading} />
          <StatCard title="Rôles Admin" value={adminRoles.length} icon={Shield} loading={isLoading} />
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou email..."
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par rôle..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                {uniqueRoles.map(r => (
                  <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        {viewMode === 'grid' ? (
          <StaffGrid staff={filteredStaff} onEdit={handleOpenFormDialog} onDelete={handleOpenDeleteDialog} classes={classes} />
        ) : (
          <StaffTable staff={filteredStaff} onEdit={handleOpenFormDialog} onDelete={handleOpenDeleteDialog} classes={classes} />
        )}
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

