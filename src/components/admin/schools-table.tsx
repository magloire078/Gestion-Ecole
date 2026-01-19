
'use client';
import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Edit, Database, Trash2, RotateCcw } from 'lucide-react';
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

interface School {
    id: string;
    name: string;
    createdAt: string;
    status?: 'active' | 'suspended' | 'deleted';
    subscription: {
        plan: 'Essentiel' | 'Pro' | 'Premium';
        status: 'active' | 'trialing' | 'past_due' | 'canceled';
    };
    directorFirstName: string;
    directorLastName: string;
    directorEmail: string;
}

export function SchoolsTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();

  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [schoolToRestore, setSchoolToRestore] = useState<School | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const schoolsQuery = useMemo(() => query(collection(firestore, 'ecoles'), orderBy('createdAt', 'desc')), [firestore]);
  const { data: schoolsData, loading: schoolsLoading } = useCollection(schoolsQuery);

  const schools: School[] = useMemo(() => schoolsData?.map(doc => ({ id: doc.id, ...doc.data() } as School)) || [], [schoolsData]);

  const handleOpenDeleteDialog = (school: School) => {
    setSchoolToDelete(school);
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
        // L'erreur est déjà gérée par le service. Pas besoin de toast ici.
        console.error("Component caught error during school deletion:", error);
      })
      .finally(() => {
        setIsDeleting(false);
        setSchoolToDelete(null);
      });
  };

  const handleRestoreSchool = (school: School) => {
    if (!user?.uid) return;
    setSchoolToRestore(school);
    setIsRestoring(true);
    restoreSchool(firestore, school.id, user.uid)
        .then(() => {
             toast({
                title: "École restaurée",
                description: `L'école "${school.name}" est à nouveau active.`,
            });
        })
        .catch((error) => {
            // Erreur gérée par le service.
        })
        .finally(() => {
            setIsRestoring(false);
            setSchoolToRestore(null);
        });
  }

  const getPlanBadgeVariant = (plan: string) => {
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
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>École</TableHead>
              <TableHead>Directeur</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créée le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schoolsLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><Skeleton className="h-5 w-full"/></TableCell>
                </TableRow>
              ))
            ) : schools.length > 0 ? schools.map(school => (
              <TableRow key={school.id} className={cn(school.status === 'deleted' && 'bg-muted/50 text-muted-foreground')}>
                <TableCell>
                  <div className="font-medium">{school.name}</div>
                </TableCell>
                <TableCell>
                  <div>{school.directorFirstName} {school.directorLastName}</div>
                  <div className="text-sm">{school.directorEmail}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={getPlanBadgeVariant(school.subscription?.plan)}>{school.subscription?.plan}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(school.status)}>
                    {school.status || 'active'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {school.createdAt ? format(new Date(school.createdAt), 'dd/MM/yyyy', {locale: fr}) : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    {school.status === 'deleted' ? (
                       <Button variant="ghost" size="sm" onClick={() => handleRestoreSchool(school)} disabled={isRestoring && schoolToRestore?.id === school.id}>
                          <RotateCcw className="h-4 w-4 mr-2" /> 
                          {isRestoring && schoolToRestore?.id === school.id ? 'Restauration...' : 'Restaurer'}
                        </Button>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDeleteDialog(school)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">Aucune école trouvée.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
       <AlertDialog open={!!schoolToDelete} onOpenChange={(open) => !open && setSchoolToDelete(null)}>
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
    </>
  );
}
