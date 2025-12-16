
'use client';
import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Edit, Database, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
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
import { deleteSchool } from '@/services/school-services';

interface School {
    id: string;
    name: string;
    createdAt: { seconds: number; nanoseconds: number };
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

  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const schoolsQuery = useMemoFirebase(() => query(collection(firestore, 'ecoles'), orderBy('createdAt', 'desc')), [firestore]);
  const { data: schoolsData, loading: schoolsLoading } = useCollection(schoolsQuery);

  const schools: School[] = useMemo(() => schoolsData?.map(doc => ({ id: doc.id, ...doc.data() } as School)) || [], [schoolsData]);

  const handleOpenDeleteDialog = (school: School) => {
    setSchoolToDelete(school);
    setIsDeleting(true);
  };
  
  const handleDeleteSchool = async () => {
    if (!schoolToDelete) return;
    
    try {
        await deleteSchool(firestore, schoolToDelete.id);
        toast({
            title: "École supprimée",
            description: `L'école "${schoolToDelete.name}" a été supprimée.`,
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Erreur de suppression",
            description: "Une erreur est survenue lors de la suppression.",
        });
    } finally {
        setIsDeleting(false);
        setSchoolToDelete(null);
    }
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
        case 'Pro': return 'default';
        case 'Premium': return 'default';
        case 'Essentiel': return 'secondary';
        default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
      switch (status) {
          case 'active':
          case 'trialing':
              return 'secondary';
          case 'past_due':
          case 'canceled':
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
              <TableRow key={school.id}>
                <TableCell>
                  <div className="font-medium">{school.name}</div>
                </TableCell>
                <TableCell>
                  <div>{school.directorFirstName} {school.directorLastName}</div>
                  <div className="text-sm text-muted-foreground">{school.directorEmail}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={getPlanBadgeVariant(school.subscription?.plan)}>{school.subscription?.plan}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(school.subscription?.status)}>
                    {school.subscription?.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {school.createdAt ? format(new Date(school.createdAt.seconds * 1000), 'dd/MM/yyyy') : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDeleteDialog(school)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
       <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous absolument sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Cette action est irréversible. L'école <strong>"{schoolToDelete?.name}"</strong> sera supprimée définitivement, ainsi que toutes ses données associées (élèves, personnel, etc.).
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSchool} className="bg-destructive hover:bg-destructive/90">
                    Oui, supprimer cette école
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
