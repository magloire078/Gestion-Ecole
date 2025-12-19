

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, PlusCircle, Trash2, Edit, User, Building2 } from 'lucide-react';
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
import type { building as Building, staff as Staff } from '@/lib/data-types';

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

  const buildingsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/internat_batiments`)) : null, [firestore, schoolId]);
  const { data: buildingsData, loading: buildingsLoading } = useCollection(buildingsQuery);
  const buildings: (Building & { id: string })[] = useMemo(() => buildingsData?.map(d => ({ id: d.id, ...d.data() } as Building & { id: string })) || [], [buildingsData]);
  
  const staffQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);
  const staffMembers = useMemo(() => staffData?.map(d => ({ id: d.id, ...d.data() } as Staff & {id: string})) || [], [staffData]);
  const staffMap = useMemo(() => new Map(staffMembers.map(s => [s.id, `${s.firstName} ${s.lastName}`])), [staffMembers]);


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
  
  const isLoading = schoolLoading || buildingsLoading || staffLoading;

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active': return 'secondary';
      case 'maintenance': return 'outline';
      case 'full': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Gestion des Bâtiments</h2>
          <p className="text-muted-foreground">Gérez les bâtiments de votre établissement (dortoirs, blocs administratifs, etc.).</p>
        </div>
        {canManageContent && (
          <Button onClick={() => { setEditingBuilding(null); setIsFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter un bâtiment
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)
        ) : buildings.length > 0 ? (
          buildings.map(building => (
            <Card key={building.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                    <Building2 className="h-8 w-8 text-primary" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingBuilding(building); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <CardTitle>{building.name}</CardTitle>
                <CardDescription className="capitalize">{building.type}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> <span>Capacité: {building.capacity} personnes</span></div>
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
            <Button type="submit" form="building-form">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
