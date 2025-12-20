
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, PlusCircle, Trash2, Edit, User, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, addDoc, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { building as Building, staff as Staff, room as Room } from '@/lib/data-types';
import { Building2 } from 'lucide-react';

const buildingSchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  type: z.enum(['garcons', 'filles', 'mixte']),
  capacity: z.coerce.number().min(1, "La capacité est requise."),
  responsableId: z.string().min(1, "Le responsable est requis."),
  status: z.enum(['active', 'maintenance', 'full']),
});

type BuildingFormValues = z.infer<typeof buildingSchema>;

export default function BatimentsPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageContent = !!user?.profile?.permissions?.manageInternat;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<(Building & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [buildingToDelete, setBuildingToDelete] = useState<(Building & { id: string }) | null>(null);

  const buildingsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/internat_batiments`)) : null, [firestore, schoolId]);
  const { data: buildingsData, loading: buildingsLoading } = useCollection(buildingsQuery);
  const buildings: (Building & { id: string })[] = useMemo(() => buildingsData?.map(d => ({ id: d.id, ...d.data() } as Building & { id: string })) || [], [buildingsData]);
  
  const staffQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);
  const staffMembers = useMemo(() => staffData?.map(d => ({ id: d.id, ...d.data() } as Staff & {id: string})) || [], [staffData]);
  const staffMap = useMemo(() => new Map(staffMembers.map(s => [s.id, `${s.firstName} ${s.lastName}`])), [staffMembers]);
  
  const roomsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/internat_chambres`)) : null, [firestore, schoolId]);
  const { data: roomsData, loading: roomsLoading } = useCollection(roomsQuery);
  const rooms: (Room & { id: string })[] = useMemo(() => roomsData?.map(d => ({ id: d.id, ...d.data() } as Room & { id: string })) || [], [roomsData]);

  const roomsByBuilding = useMemo(() => {
    return rooms.reduce((acc, room) => {
      if (room.buildingId) {
        if (!acc[room.buildingId]) {
          acc[room.buildingId] = [];
        }
        acc[room.buildingId].push(room);
      }
      return acc;
    }, {} as Record<string, (Room & { id: string })[]>);
  }, [rooms]);


  const form = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingSchema),
    defaultValues: { type: "mixte", status: 'active' },
  });

  useEffect(() => {
    form.reset(editingBuilding ? editingBuilding : { type: "mixte", status: 'active', name: '', capacity: 0, responsableId: '' });
  }, [isFormOpen, editingBuilding, form]);

  const handleFormSubmit = async (values: BuildingFormValues) => {
    if (!schoolId) return;

    const dataToSave = { ...values, schoolId };

    const promise = editingBuilding
      ? setDoc(doc(firestore, `ecoles/${schoolId}/internat_batiments`, editingBuilding.id), dataToSave, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/internat_batiments`), dataToSave);
    try {
      await promise;
      toast({ title: `Bâtiment ${editingBuilding ? 'modifié' : 'ajouté'}`, description: `Le bâtiment ${values.name} a été enregistré.` });
      setIsFormOpen(false);
    } catch (e) {
      const path = `ecoles/${schoolId}/internat_batiments/${editingBuilding?.id || '(new)'}`;
      const operation = editingBuilding ? 'update' : 'create';
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path, operation, requestResourceData: dataToSave }));
    }
  };
  
  const handleOpenDeleteDialog = (building: Building & { id: string }) => {
    setBuildingToDelete(building);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteBuilding = async () => {
    if (!schoolId || !buildingToDelete) return;

    if (roomsByBuilding[buildingToDelete.id]?.length > 0) {
      toast({
        variant: "destructive",
        title: "Action impossible",
        description: "Vous ne pouvez pas supprimer un bâtiment qui contient encore des chambres."
      });
      setIsDeleteDialogOpen(false);
      return;
    }
    
    try {
        await deleteDoc(doc(firestore, `ecoles/${schoolId}/internat_batiments`, buildingToDelete.id));
        toast({ title: "Bâtiment supprimé" });
    } catch (e) {
        const path = `ecoles/${schoolId}/internat_batiments/${buildingToDelete.id}`;
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path, operation: 'delete' }));
    } finally {
        setIsDeleteDialogOpen(false);
        setBuildingToDelete(null);
    }
  }
  
  const isLoading = schoolLoading || buildingsLoading || staffLoading || roomsLoading;

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active': return 'secondary';
      case 'maintenance': return 'outline';
      case 'full': return 'destructive';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Gestion des Bâtiments de l'Internat</h2>
          <p className="text-muted-foreground">Gérez les bâtiments et dortoirs de l'internat.</p>
        </div>
        {canManageContent && (
          <Button onClick={() => { setEditingBuilding(null); setIsFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter un bâtiment
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {buildings.length > 0 ? (
          buildings.map(building => (
            <Card key={building.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                    <Building2 className="h-8 w-8 text-primary" />
                    {canManageContent && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingBuilding(building); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(building)}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                </div>
                <CardTitle>{building.name}</CardTitle>
                <CardDescription className="capitalize">{building.type}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> <span>Capacité: {building.capacity} internes</span></div>
                <div className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> <span>Responsable: {staffMap.get(building.responsableId) || 'N/A'}</span></div>
              </CardContent>
              <CardFooter>
                 <Badge variant={getStatusBadgeVariant(building.status)}>{building.status}</Badge>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card className="flex items-center justify-center h-48">
              <p className="text-muted-foreground">Aucun bâtiment créé.</p>
            </Card>
          </div>
        )}
      </div>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingBuilding ? 'Modifier le' : 'Nouveau'} Bâtiment</DialogTitle></DialogHeader>
          <Form {...form}>
            <form id="building-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nom du Bâtiment</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="type" render={({ field }) => <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="garcons">Garçons</SelectItem><SelectItem value="filles">Filles</SelectItem><SelectItem value="mixte">Mixte</SelectItem></SelectContent></Select></FormItem>} />
              <FormField control={form.control} name="capacity" render={({ field }) => <FormItem><FormLabel>Capacité</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="responsableId" render={({ field }) => <FormItem><FormLabel>Responsable</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir..."/></SelectTrigger></FormControl><SelectContent>{staffMembers.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>} />
              <FormField control={form.control} name="status" render={({ field }) => <FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Actif</SelectItem><SelectItem value="maintenance">En maintenance</SelectItem><SelectItem value="full">Plein</SelectItem></SelectContent></Select></FormItem>} />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
            <Button type="submit" form="building-form" disabled={form.formState.isSubmitting}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>
                   Cette action est irréversible. Le bâtiment <strong>"{buildingToDelete?.name}"</strong> sera supprimé.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteBuilding} className="bg-destructive hover:bg-destructive/90">
                    Supprimer
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
