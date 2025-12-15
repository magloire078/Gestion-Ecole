'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
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
import type { bus as Bus, staff as Staff } from '@/lib/data-types';

const busSchema = z.object({
  registrationNumber: z.string().min(1, "L'immatriculation est requise."),
  capacity: z.coerce.number().min(1, "La capacité est requise."),
  type: z.enum(['standard', 'minibus', 'adapted']),
  driverId: z.string().optional(),
  status: z.enum(['active', 'maintenance', 'inactive']),
});

type BusFormValues = z.infer<typeof busSchema>;

export default function BusManagementPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageContent = !!user?.profile?.permissions?.manageContent;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<(Bus & { id: string }) | null>(null);

  const busesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/transport_bus`)) : null, [firestore, schoolId]);
  const { data: busesData, loading: busesLoading } = useCollection(busesQuery);
  const buses: (Bus & { id: string })[] = useMemo(() => busesData?.map(d => ({ id: d.id, ...d.data() } as Bus & { id: string })) || [], [busesData]);

  const driversQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`), where('role', '==', 'chauffeur')) : null, [firestore, schoolId]);
  const { data: driversData, loading: driversLoading } = useCollection(driversQuery);
  const drivers: (Staff & { id: string })[] = useMemo(() => driversData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [driversData]);

  const driverMap = useMemo(() => new Map(drivers.map(d => [d.id, `${d.firstName} ${d.lastName}`])), [drivers]);
  
  const form = useForm<BusFormValues>({
    resolver: zodResolver(busSchema),
    defaultValues: { type: 'standard', status: 'active', capacity: 50 },
  });

  useEffect(() => {
    form.reset(editingBus ? { ...editingBus, driverId: editingBus.driverId || '' } : { type: 'standard', status: 'active', capacity: 50 });
  }, [isFormOpen, editingBus, form]);

  const handleFormSubmit = async (values: BusFormValues) => {
    if (!schoolId) return;

    const dataToSave = { ...values, schoolId };

    const promise = editingBus
      ? setDoc(doc(firestore, `ecoles/${schoolId}/transport_bus/${editingBus.id}`), dataToSave, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/transport_bus`), dataToSave);

    try {
      await promise;
      toast({ title: `Bus ${editingBus ? 'modifié' : 'ajouté'}`, description: `Le bus ${values.registrationNumber} a été enregistré.` });
      setIsFormOpen(false);
    } catch (error) {
      const path = `ecoles/${schoolId}/transport_bus/${editingBus?.id || '(new)'}`;
      const operation = editingBus ? 'update' : 'create';
      const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: dataToSave });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch(status) {
        case 'active': return 'secondary';
        case 'maintenance': return 'outline';
        case 'inactive': return 'destructive';
        default: return 'default';
    }
  };
  
  const isLoading = schoolLoading || busesLoading || driversLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gestion de la Flotte de Bus</CardTitle>
              <CardDescription>Gérez les véhicules de transport scolaire.</CardDescription>
            </div>
            {canManageContent && (
              <Button onClick={() => { setEditingBus(null); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter un bus
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Immatriculation</TableHead><TableHead>Type</TableHead><TableHead>Capacité</TableHead><TableHead>Chauffeur</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
              ) : buses.length > 0 ? (
                buses.map(bus => (
                  <TableRow key={bus.id}>
                    <TableCell className="font-mono">{bus.registrationNumber}</TableCell>
                    <TableCell className="capitalize">{bus.type}</TableCell>
                    <TableCell>{bus.capacity}</TableCell>
                    <TableCell>{bus.driverId ? driverMap.get(bus.driverId) || 'N/A' : 'Non assigné'}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(bus.status)}>{bus.status}</Badge></TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingBus(bus); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Aucun bus enregistré.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBus ? 'Modifier le bus' : 'Ajouter un nouveau bus'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form id="bus-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="registrationNumber" render={({ field }) => <FormItem><FormLabel>Immatriculation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="capacity" render={({ field }) => <FormItem><FormLabel>Capacité</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="type" render={({ field }) => <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="standard">Standard</SelectItem><SelectItem value="minibus">Minibus</SelectItem><SelectItem value="adapted">Adapté</SelectItem></SelectContent></Select></FormItem>} />
              </div>
              <FormField control={form.control} name="driverId" render={({ field }) => <FormItem><FormLabel>Chauffeur</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Assigner un chauffeur"/></SelectTrigger></FormControl><SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.firstName} {d.lastName}</SelectItem>)}</SelectContent></Select></FormItem>} />
              <FormField control={form.control} name="status" render={({ field }) => <FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Actif</SelectItem><SelectItem value="maintenance">En maintenance</SelectItem><SelectItem value="inactive">Inactif</SelectItem></SelectContent></Select></FormItem>} />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
            <Button type="submit" form="bus-form" disabled={form.formState.isSubmitting}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
