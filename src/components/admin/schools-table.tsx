

'use client';
import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Edit, Database, Trash2, RotateCcw, Building } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useToast } from '@/hooks/use-toast';
import { deleteSchool, restoreSchool } from '@/services/school-services';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SchoolEditForm } from './school-edit-form';
import { SchoolViewDetails } from './school-view-details';

import type { school as School } from '@/lib/data-types';

type SchoolWithId = School & { id: string };

export function SchoolsTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();

  const [schoolToDelete, setSchoolWithIdToDelete] = useState<SchoolWithId | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [schoolToRestore, setSchoolWithIdToRestore] = useState<SchoolWithId | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [schoolToEdit, setSchoolWithIdToEdit] = useState<SchoolWithId | null>(null);

  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [schoolToView, setSchoolWithIdToView] = useState<SchoolWithId | null>(null);

  const schoolsQuery = useMemo(() =>
    user?.profile?.isAdmin
      ? query(collection(firestore, 'ecoles'), orderBy('createdAt', 'desc'))
      : null,
    [firestore, user?.profile?.isAdmin]
  );
  const { data: schoolsData, loading: schoolsLoading } = useCollection(schoolsQuery);

  const schools: SchoolWithId[] = useMemo(() => schoolsData?.map(doc => ({ id: doc.id, ...doc.data() } as SchoolWithId)) || [], [schoolsData]);

  const handleOpenEditDialog = (school: SchoolWithId) => {
    setSchoolWithIdToEdit(school);
    setIsEditDialogOpen(true);
  };

  const handleOpenViewDialog = (school: SchoolWithId) => {
    setSchoolWithIdToView(school);
    setIsViewDialogOpen(true);
  };

  const handleOpenDeleteDialog = (school: SchoolWithId) => {
    setSchoolWithIdToDelete(school);
  };

  const handleDeleteSchool = () => {
    if (!schoolToDelete || !user?.uid) return;

    setIsDeleting(true);
    deleteSchool(firestore, schoolToDelete.id, user.uid)
      .then(() => {
        toast({
          title: "École mise à la corbeille",
          description: `L'école "${schoolToDelete.name}" a été marquée comme supprimée.`,
        });
      })
      .catch((error) => {
        console.error("Component caught error during school deletion:", error);
        toast({
          variant: "destructive",
          title: "Erreur de suppression",
          description: "Impossible de mettre cette école à la corbeille."
        });
      })
      .finally(() => {
        setIsDeleting(false);
        setSchoolWithIdToDelete(null);
      });
  };

  const handleRestoreSchool = (school: SchoolWithId) => {
    if (!user?.uid) return;
    setSchoolWithIdToRestore(school);
    setIsRestoring(true);
    restoreSchool(firestore, school.id, user.uid)
      .then(() => {
        toast({
          title: "École restaurée",
          description: `L'école "${school.name}" est à nouveau active.`,
        });
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Erreur de restauration",
          description: "Impossible de restaurer cette école."
        });
      })
      .finally(() => {
        setIsRestoring(false);
        setSchoolWithIdToRestore(null);
      });
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    // Firestore Timestamps have a toDate() method
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }
    return format(date, 'dd/MM/yyyy', { locale: fr });
  };


  const getPlanBadgeVariant = (plan?: string) => {
    switch (plan) {
      case 'Pro': return 'default';
      case 'Premium': return 'default';
      case 'Essentiel': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'active':
        return 'secondary';
      case 'suspended':
      case 'deleted':
        return 'destructive';
      default:
        return 'outline';
    }
  };


  return (
    <>
      <div className="bg-white dark:bg-[hsl(var(--admin-card))] rounded-[40px] border border-blue-50/50 dark:border-white/10 shadow-sm overflow-hidden transition-colors duration-500">
        <div className="p-8 border-b border-blue-50/50 dark:border-white/10 flex justify-between items-center bg-slate-50/30 dark:bg-white/5">
          <div>
            <h3 className="text-xl font-black text-[hsl(var(--admin-primary-dark))] dark:text-white font-outfit tracking-tight">Liste des Établissements</h3>
            <p className="text-sm text-slate-400 font-medium">Gestion et surveillance des accès scolaires.</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-white/10 flex items-center justify-center text-[hsl(var(--admin-primary))]">
            <Building className="h-5 w-5" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">École</TableHead>
                <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Directeur</TableHead>
                <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Plan</TableHead>
                <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Statut</TableHead>
                <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Créée le</TableHead>
                <TableHead className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schoolsLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i} className="border-blue-50/30">
                    <TableCell colSpan={6} className="px-8 py-4"><Skeleton className="h-8 w-full rounded-xl" /></TableCell>
                  </TableRow>
                ))
              ) : schools.length > 0 ? schools.map(school => (
                <TableRow key={school.id} className={cn("border-blue-50/30 dark:border-white/5 transition-colors hover:bg-blue-50/20 dark:hover:bg-white/5", school.status === 'deleted' && 'bg-slate-50/50 dark:bg-white/5 italic opacity-60')}>
                  <TableCell className="px-8 py-4">
                    <div className="font-black text-[hsl(var(--admin-primary-dark))] dark:text-white font-outfit">{school.name}</div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="font-bold text-slate-700 text-sm">{school.directorFirstName} {school.directorLastName}</div>
                    <div className="text-xs text-slate-400 font-medium">{school.directorEmail}</div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge className={cn("rounded-lg px-2.5 py-0.5 font-bold text-[10px] uppercase tracking-wider border-none shadow-sm",
                      school.subscription?.plan === 'Premium' ? "bg-gradient-to-r from-[hsl(var(--admin-primary-dark))] to-[hsl(var(--admin-primary))] text-white shadow-lg shadow-blue-900/10" :
                        school.subscription?.plan === 'Pro' ? "bg-[hsl(var(--admin-primary))] text-white" : "bg-slate-100 dark:bg-white/10 text-slate-500"
                    )}>
                      {school.subscription?.plan || 'Essentiel'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className={cn("rounded-lg px-2.5 py-0.5 font-black text-[10px] uppercase tracking-widest border-2",
                      school.status === 'active' ? "border-emerald-100 text-emerald-600 bg-emerald-50/30" :
                        "border-rose-100 text-rose-600 bg-rose-50/30"
                    )}>
                      {school.status || 'active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 text-sm font-bold text-slate-500">
                    {formatDate(school.createdAt)}
                  </TableCell>
                  <TableCell className="px-8 py-4 text-right">
                    <div className="flex gap-1.5 justify-end">
                      {school.status === 'deleted' ? (
                        <Button variant="outline" size="sm" className="h-8 rounded-xl border-blue-100 dark:border-white/10 text-[hsl(var(--admin-primary-dark))] dark:text-white font-bold text-xs" onClick={() => handleRestoreSchool(school)} disabled={isRestoring && schoolToRestore?.id === school.id}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                          {isRestoring && schoolToRestore?.id === school.id ? '...' : 'Restaurer'}
                        </Button>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-blue-50 dark:hover:bg-white/10 text-[hsl(var(--admin-primary))] transition-colors" onClick={() => handleOpenViewDialog(school)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-blue-50 text-slate-600 transition-colors" onClick={() => handleOpenEditDialog(school)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors" onClick={() => handleOpenDeleteDialog(school)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="px-8 py-12 text-center text-slate-400 font-bold italic">
                    Aucune école enregistrée pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!schoolToDelete} onOpenChange={(open) => !open && setSchoolWithIdToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mettre à la corbeille ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'école <strong>"{schoolToDelete?.name}"</strong> sera marquée comme supprimée et deviendra inaccessible pour ses utilisateurs. Vous pourrez la restaurer pendant 30 jours.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSchool} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting ? "Mise à la corbeille..." : "Oui, mettre à la corbeille"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'école</DialogTitle>
            <DialogDescription>
              Modification des informations pour {schoolToEdit?.name}.
            </DialogDescription>
          </DialogHeader>
          {schoolToEdit && (
            <SchoolEditForm
              school={schoolToEdit}
              onSave={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Détails de l'établissement
            </DialogTitle>
            <DialogDescription>
              Aperçu complet des informations de l'établissement <strong>{schoolToView?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          {schoolToView && (
            <SchoolViewDetails school={schoolToView} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
