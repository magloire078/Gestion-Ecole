
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
  DialogDescription,
  DialogFooter,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, addDoc, setDoc, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { key_trousseau as KeyTrousseau, key_log as KeyLog, staff } from '@/lib/data-types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const keyTrousseauSchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  description: z.string().optional(),
  keys: z.array(z.object({ value: z.string().min(1, "L'identifiant de la clé est requis.") })).optional(),
});

type KeyTrousseauFormValues = z.infer<typeof keyTrousseauSchema>;

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
  const [logType, setLogType] = useState<'emprunt' | 'retour'>('emprunt');
  const [selectedTrousseauForLog, setSelectedTrousseauForLog] = useState<string>('');
  const [selectedStaffForLog, setSelectedStaffForLog] = useState<string>('');
  const [isSavingLog, setIsSavingLog] = useState(false);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [trousseauToDelete, setTrousseauToDelete] = useState<(KeyTrousseau & { id: string }) | null>(null);

  const trousseauxQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cles_trousseaux`)) : null, [firestore, schoolId]);
  const { data: trousseauxData, loading: trousseauxLoading } = useCollection(trousseauxQuery);
  const trousseaux = useMemo(() => trousseauxData?.map(d => ({ id: d.id, ...d.data() } as KeyTrousseau & { id: string })) || [], [trousseauxData]);
  
  const staffQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);
  const staffMembers = useMemo(() => staffData?.map(d => ({ id: d.id, ...d.data() } as staff & { id: string })) || [], [staffData]);
  
  const logsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cles_log`), orderBy('timestamp', 'desc')) : null, [firestore, schoolId]);
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


  const form = useForm<KeyTrousseauFormValues>({
    resolver: zodResolver(keyTrousseauSchema),
    defaultValues: { name: '', description: '', keys: [{ value: '' }] },
  });
  
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'keys' });

  const handleOpenForm = (trousseau: (KeyTrousseau & { id: string }) | null) => {
    setEditingTrousseau(trousseau);
    form.reset(trousseau ? { ...trousseau, keys: trousseau.keys?.map(k => ({value: k})) } : { name: '', description: '', keys: [{ value: '' }] });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: KeyTrousseauFormValues) => {
    if (!schoolId) return;

    const keysArray = values.keys ? values.keys.map(k => k.value).filter(Boolean) : [];
    const dataToSave: Partial<KeyTrousseau> = { 
        ...values, 
        keys: keysArray 
    };
    if (!editingTrousseau) {
      dataToSave.status = 'disponible';
    }

    const promise = editingTrousseau
      ? setDoc(doc(firestore, `ecoles/${schoolId}/cles_trousseaux/${editingTrousseau.id}`), dataToSave, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/cles_trousseaux`), dataToSave);

    try {
      await promise;
      toast({ title: `Trousseau ${editingTrousseau ? 'modifié' : 'ajouté'}` });
      setIsFormOpen(false);
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `ecoles/${schoolId}/cles_trousseaux`, operation: 'write', requestResourceData: dataToSave }));
    }
  };

  const handleLogSubmit = async () => {
    if(!schoolId || !selectedTrousseauForLog || !selectedStaffForLog) {
      toast({ variant: 'destructive', title: "Champs manquants"});
      return;
    }
    setIsSavingLog(true);
    const logData: Omit<KeyLog, 'id'> = {
        trousseauId: selectedTrousseauForLog,
        staffId: selectedStaffForLog,
        type: logType,
        timestamp: new Date().toISOString(),
        notes: '',
    };
    
    try {
        await addDoc(collection(firestore, `ecoles/${schoolId}/cles_log`), logData);
        const trousseauRef = doc(firestore, `ecoles/${schoolId}/cles_trousseaux`, selectedTrousseauForLog);
        await updateDoc(trousseauRef, {
            status: logType === 'emprunt' ? 'emprunté' : 'disponible',
            lastHolderId: logType === 'emprunt' ? selectedStaffForLog : null,
        });
        toast({ title: "Mouvement enregistré"});
        setIsLogFormOpen(false);
    } catch (e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `ecoles/${schoolId}/cles_log`, operation: 'create', requestResourceData: logData }));
    } finally {
        setIsSavingLog(false);
    }
  };
  
  const handleOpenDeleteDialog = (trousseau: KeyTrousseau & { id: string }) => {
    setTrousseauToDelete(trousseau);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteTrousseau = async () => {
    if (!schoolId || !trousseauToDelete) return;
    try {
        await deleteDoc(doc(firestore, `ecoles/${schoolId}/cles_trousseaux`, trousseauToDelete.id));
        toast({ title: 'Trousseau supprimé', description: `Le trousseau "${trousseauToDelete.name}" a été supprimé.`});
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `ecoles/${schoolId}/cles_trousseaux/${trousseauToDelete.id}`, operation: 'delete'}));
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
          <Form {...form}>
            <form id="trousseau-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>} />
              <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
              <div>
                <Label>Clés incluses</Label>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-center mt-2">
                    <FormField control={form.control} name={`keys.${index}.value`} render={({ field }) => <FormItem className="flex-1"><FormControl><Input placeholder={`ID Clé ${index + 1}`} {...field} /></FormControl></FormItem>} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                  </div>
                ))}
                <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => append({ value: "" })}><PlusCircle className="mr-2 h-4 w-4"/>Ajouter une clé</Button>
              </div>
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
            <Button type="submit" form="trousseau-form">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isLogFormOpen} onOpenChange={setIsLogFormOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Enregistrer un mouvement de clé</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Type de Mouvement</Label>
                    <Select value={logType} onValueChange={(v: any) => setLogType(v)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="emprunt">Emprunt</SelectItem><SelectItem value="retour">Retour</SelectItem></SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Trousseau</Label>
                    <Select value={selectedTrousseauForLog} onValueChange={setSelectedTrousseauForLog}>
                        <SelectTrigger><SelectValue placeholder="Choisir un trousseau..."/></SelectTrigger>
                        <SelectContent>
                            {trousseaux
                                .filter(t => logType === 'emprunt' ? t.status === 'disponible' : t.status === 'emprunté')
                                .map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
                            }
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label>Membre du personnel</Label>
                    <Select value={selectedStaffForLog} onValueChange={setSelectedStaffForLog}>
                        <SelectTrigger><SelectValue placeholder="Choisir un membre..."/></SelectTrigger>
                        <SelectContent>
                            {staffMembers.map(s => <SelectItem key={s.id} value={s.id}>{s.displayName}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsLogFormOpen(false)}>Annuler</Button>
                <Button onClick={handleLogSubmit} disabled={isSavingLog}>
                  {isSavingLog ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
            </DialogFooter>
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
