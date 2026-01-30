
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { key_trousseau as KeyTrousseau, key_log as KeyLog, staff } from '@/lib/data-types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TrousseauForm } from '@/components/immobilier/trousseau-form';
import { LogForm } from '@/components/immobilier/log-form';


interface LogWithDetails extends KeyLog {
  id: string;
  trousseauName?: string;
  staffName?: string;
}

export default function ClesPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageContent = !!user?.profile?.permissions?.manageInventory;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrousseau, setEditingTrousseau] = useState<(KeyTrousseau & { id: string }) | null>(null);
  
  const [isLogFormOpen, setIsLogFormOpen] = useState(false);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [trousseauToDelete, setTrousseauToDelete] = useState<(KeyTrousseau & { id: string }) | null>(null);

  const trousseauxQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cles_trousseaux`)) : null, [firestore, schoolId]);
  const { data: trousseauxData, loading: trousseauxLoading } = useCollection(trousseauxQuery);
  const trousseaux = useMemo(() => trousseauxData?.map(d => ({ id: d.id, ...d.data() } as KeyTrousseau & { id: string })) || [], [trousseauxData]);
  
  const staffQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);
  const staffMembers = useMemo(() => staffData?.map(d => ({ id: d.id, ...d.data() } as staff & { id: string })) || [], [staffData]);
  
  const logsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cles_log`), orderBy('timestamp', 'desc')) : null, [firestore, schoolId]);
  const { data: logsData, loading: logsLoading } = useCollection(logsQuery);
  
  const trousseauxMap = useMemo(() => new Map(trousseaux.map(t => [t.id, t.name])), [trousseaux]);
  const staffMap = useMemo(() => new Map(staffMembers.map(s => [s.id, s.displayName])), [staffMembers]);

  const logs: LogWithDetails[] = useMemo(() => logsData?.map(doc => {
      const data = doc.data() as KeyLog;
      return {
          id: doc.id,
          ...data,
          trousseauName: trousseauxMap.get(data.trousseauId) || 'Inconnu',
          staffName: staffMap.get(data.staffId) || 'Inconnu'
      };
  }) || [], [logsData, trousseauxMap, staffMap]);


  const handleOpenForm = (trousseau: (KeyTrousseau & { id: string }) | null) => {
    setEditingTrousseau(trousseau);
    setIsFormOpen(true);
  };
  
  const handleOpenDeleteDialog = (trousseau: KeyTrousseau & { id: string }) => {
    setTrousseauToDelete(trousseau);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteTrousseau = async () => {
    if (!schoolId || !trousseauToDelete) return;
    
    if (trousseauToDelete.status === 'emprunté') {
        toast({
            variant: 'destructive',
            title: 'Action impossible',
            description: 'Vous ne pouvez pas supprimer un trousseau actuellement emprunté.'
        });
        setIsDeleteDialogOpen(false);
        return;
    }

    try {
        await deleteDoc(doc(firestore, `ecoles/${schoolId}/cles_trousseaux`, trousseauToDelete.id));
        toast({ title: 'Trousseau supprimé', description: `Le trousseau "${trousseauToDelete.name}" a été supprimé.`});
    } catch (error) {
        console.error("Error deleting trousseau:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer le trousseau.' });
    } finally {
        setIsDeleteDialogOpen(false);
        setTrousseauToDelete(null);
    }
  };

  const isLoading = schoolLoading || trousseauxLoading || logsLoading || staffLoading;

  return (
    <>
      <div className="space-y-6">
        <Card>
            <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                <CardTitle>Gestion des Trousseaux de Clés</CardTitle>
                <CardDescription>Suivez les trousseaux de clés de l'établissement.</CardDescription>
                </div>
                {canManageContent && (
                    <div className="flex gap-2">
                        <Button onClick={() => setIsLogFormOpen(true)}>Enregistrer un mouvement</Button>
                        <Button onClick={() => handleOpenForm(null)}><PlusCircle className="mr-2 h-4 w-4" />Ajouter un Trousseau</Button>
                    </div>
                )}
            </div>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader><TableRow><TableHead>Nom du Trousseau</TableHead><TableHead>Description</TableHead><TableHead>Statut</TableHead><TableHead>Dernier Détenteur</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                {isLoading ? (
                    [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
                ) : trousseaux.map(t => (
                    <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>{t.description}</TableCell>
                        <TableCell><Badge variant={t.status === 'disponible' ? 'secondary' : 'outline'}>{t.status}</Badge></TableCell>
                        <TableCell>{t.lastHolderId ? (staffMembers.find(s => s.id === t.lastHolderId)?.displayName || 'N/A') : 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          {canManageContent && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleOpenForm(t)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(t)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Journal des Mouvements</CardTitle>
                <CardDescription>Historique des emprunts et retours de clés.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Mouvement</TableHead><TableHead>Trousseau</TableHead><TableHead>Personnel</TableHead></TableRow></TableHeader>
                    <TableBody>
                         {isLoading ? (
                            [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
                         ) : logs.map(log => (
                            <TableRow key={log.id}>
                                <TableCell>{format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
                                <TableCell><Badge variant={log.type === 'emprunt' ? 'outline' : 'secondary'}>{log.type}</Badge></TableCell>
                                <TableCell>{log.trousseauName}</TableCell>
                                <TableCell>{log.staffName}</TableCell>
                            </TableRow>
                         ))}
                    </TableBody>
                 </Table>
            </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTrousseau ? 'Modifier' : 'Nouveau'} Trousseau</DialogTitle></DialogHeader>
          <TrousseauForm 
            schoolId={schoolId!}
            trousseau={editingTrousseau}
            onSave={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isLogFormOpen} onOpenChange={setIsLogFormOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Enregistrer un mouvement de clé</DialogTitle></DialogHeader>
            <LogForm 
                schoolId={schoolId!} 
                trousseaux={trousseaux} 
                staffMembers={staffMembers}
                onSave={() => setIsLogFormOpen(false)}
            />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Cette action est irréversible. Le trousseau <strong>"{trousseauToDelete?.name}"</strong> sera définitivement supprimé.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTrousseau} className="bg-destructive hover:bg-destructive/90">
                    Supprimer
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
