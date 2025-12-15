
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { route as Route, bus as Bus } from '@/lib/data-types';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { DialogFooter } from '../ui/dialog';
import { PlusCircle, Trash2, Clock } from 'lucide-react';
import { Separator } from '../ui/separator';

const stopSchema = z.object({
  name: z.string().min(1, 'Le nom de l\'arrêt est requis'),
  scheduledTime: z.string().min(1, 'L\'heure est requise'),
});

const routeScheduleSchema = z.object({
  startTime: z.string().optional(),
  stops: z.array(stopSchema).optional(),
});

const routeFormSchema = z.object({
  name: z.string().min(1, 'Le nom de la ligne est requis.'),
  busId: z.string().min(1, 'Un bus doit être assigné.'),
  status: z.enum(['on_time', 'delayed', 'cancelled']),
  schedule: z.object({
      morning: routeScheduleSchema,
      evening: routeScheduleSchema,
  }),
});

type RouteFormValues = z.infer<typeof routeFormSchema>;

interface RouteFormProps {
  schoolId: string;
  buses: (Bus & { id: string })[];
  route: (Route & { id: string }) | null;
  onSave: () => void;
}

export function RouteForm({ schoolId, buses, route, onSave }: RouteFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: RouteFormValues = {
      name: '',
      busId: '',
      status: 'on_time',
      schedule: {
          morning: { startTime: '07:00', stops: [] },
          evening: { startTime: '17:00', stops: [] }
      }
  };

  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: route ? {
      ...route,
      schedule: {
        morning: route.schedule?.morning || { stops: [] },
        evening: route.schedule?.evening || { stops: [] }
      }
    } as RouteFormValues : defaultValues
  });
  
  const { fields: morningStops, append: appendMorning, remove: removeMorning } = useFieldArray({
    control: form.control,
    name: "schedule.morning.stops"
  });

  const { fields: eveningStops, append: appendEvening, remove: removeEvening } = useFieldArray({
    control: form.control,
    name: "schedule.evening.stops"
  });

  const handleSubmit = async (values: RouteFormValues) => {
    setIsSubmitting(true);
    
    const dataToSave = { ...values };

    try {
        if (route && route.id) {
            const routeRef = doc(firestore, `ecoles/${schoolId}/transport_lignes/${route.id}`);
            await setDoc(routeRef, dataToSave, { merge: true });
        } else {
            const routesCollectionRef = collection(firestore, `ecoles/${schoolId}/transport_lignes`);
            await addDoc(routesCollectionRef, dataToSave);
        }
        toast({ title: 'Ligne enregistrée', description: `La ligne ${values.name} a été enregistrée.` });
        onSave();
    } catch (e) {
        const path = `ecoles/${schoolId}/transport_lignes/${route?.id || '(new)'}`;
        const operation = route ? 'update' : 'create';
        const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: dataToSave });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de la ligne</FormLabel><FormControl><Input placeholder="Ex: Ligne Bleue - Nord" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="busId" render={({ field }) => (<FormItem><FormLabel>Bus Assigné</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir un bus" /></SelectTrigger></FormControl><SelectContent>{buses.map(b => <SelectItem key={b.id} value={b.id}>{b.registrationNumber}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="on_time">À l'heure</SelectItem><SelectItem value="delayed">En retard</SelectItem><SelectItem value="cancelled">Annulé</SelectItem></SelectContent></Select></FormItem>)} />
            </div>

            <Separator className="my-4"/>

            <div className="space-y-4">
              <h3 className="font-semibold">Horaires du Matin</h3>
              <FormField control={form.control} name="schedule.morning.startTime" render={({ field }) => (<FormItem><FormLabel>Heure de départ</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>)} />
              {morningStops.map((stop, index) => (
                <div key={stop.id} className="flex items-end gap-2 p-2 border rounded-md">
                   <FormField control={form.control} name={`schedule.morning.stops.${index}.name`} render={({ field }) => (<FormItem className="flex-1"><FormLabel>Arrêt</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                   <FormField control={form.control} name={`schedule.morning.stops.${index}.scheduledTime`} render={({ field }) => (<FormItem><FormLabel>Heure</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>)} />
                   <Button type="button" variant="ghost" size="icon" onClick={() => removeMorning(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendMorning({ name: '', scheduledTime: '' })}><PlusCircle className="mr-2 h-4 w-4" />Ajouter un arrêt (matin)</Button>
            </div>
            
            <Separator className="my-4"/>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Horaires du Soir</h3>
               <FormField control={form.control} name="schedule.evening.startTime" render={({ field }) => (<FormItem><FormLabel>Heure de départ</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>)} />
              {eveningStops.map((stop, index) => (
                <div key={stop.id} className="flex items-end gap-2 p-2 border rounded-md">
                   <FormField control={form.control} name={`schedule.evening.stops.${index}.name`} render={({ field }) => (<FormItem className="flex-1"><FormLabel>Arrêt</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                   <FormField control={form.control} name={`schedule.evening.stops.${index}.scheduledTime`} render={({ field }) => (<FormItem><FormLabel>Heure</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>)} />
                   <Button type="button" variant="ghost" size="icon" onClick={() => removeEvening(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendEvening({ name: '', scheduledTime: '' })}><PlusCircle className="mr-2 h-4 w-4" />Ajouter un arrêt (soir)</Button>
            </div>
        </div>
        <DialogFooter>
            <Button type="button" variant="outline" onClick={onSave}>Annuler</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
