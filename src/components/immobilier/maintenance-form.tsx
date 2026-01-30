
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { tache_maintenance as TacheMaintenance, staff as Staff } from '@/lib/data-types';
import { format } from 'date-fns';
import { Combobox } from '../ui/combobox';
import { Loader2 } from 'lucide-react';

const tacheSchema = z.object({
  title: z.string().min(1, "Le titre est requis."),
  priority: z.enum(['basse', 'moyenne', 'haute']),
  status: z.enum(['à_faire', 'en_cours', 'terminée']),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
});

type TacheFormValues = z.infer<typeof tacheSchema>;

interface MaintenanceFormProps {
    schoolId: string;
    tache: (TacheMaintenance & { id: string }) | null;
    staffMembers: (Staff & { id: string })[];
    locationOptions: { value: string, label: string }[];
    onSave: () => void;
}

export function MaintenanceForm({ schoolId, tache, staffMembers, locationOptions, onSave }: MaintenanceFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TacheFormValues>({
    resolver: zodResolver(tacheSchema),
  });
  const { reset } = form;

  useEffect(() => {
    reset(
      tache 
        ? { ...tache, dueDate: tache.dueDate ? format(new Date(tache.dueDate), 'yyyy-MM-dd') : '' }
        : { priority: 'moyenne', status: 'à_faire', title: '', description: '', location: '', assignedTo: '', dueDate: '' }
    );
  }, [tache, reset]);

  const handleFormSubmit = async (values: TacheFormValues) => {
    if (!schoolId) return;
    setIsSubmitting(true);

    const dataToSave: any = { ...values, schoolId };
    if (!tache) {
        dataToSave.createdAt = new Date().toISOString();
    }
    
    const promise = tache
      ? setDoc(doc(firestore, `ecoles/${schoolId}/maintenance/${tache.id}`), dataToSave, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/maintenance`), dataToSave);

    try {
      await promise;
      toast({ title: `Tâche ${tache ? 'modifiée' : 'créée'}`, description: `La tâche "${values.title}" a été enregistrée.` });
      onSave();
    } catch (error) {
      console.error("Error saving maintenance task:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer la tâche de maintenance." });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
         <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel>Titre de la tâche</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>} />
            <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="priority" render={({ field }) => <FormItem><FormLabel>Priorité</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="basse">Basse</SelectItem><SelectItem value="moyenne">Moyenne</SelectItem><SelectItem value="haute">Haute</SelectItem></SelectContent></Select></FormItem>} />
            <FormField control={form.control} name="status" render={({ field }) => <FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="à_faire">À faire</SelectItem><SelectItem value="en_cours">En cours</SelectItem><SelectItem value="terminée">Terminée</SelectItem></SelectContent></Select></FormItem>} />
            </div>
            <FormField control={form.control} name="assignedTo" render={({ field }) => <FormItem><FormLabel>Assigner à</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir un membre..."/></SelectTrigger></FormControl><SelectContent>{staffMembers.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent></Select></FormItem>} />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Emplacement</FormLabel>
                        <FormControl>
                            <Combobox
                                placeholder="Sélectionner ou créer un lieu"
                                searchPlaceholder="Chercher un lieu..."
                                options={locationOptions}
                                value={field.value || ''}
                                onValueChange={field.onChange}
                                onCreate={(value) => {
                                    field.onChange(value);
                                    return Promise.resolve({ value, label: value });
                                }}
                            />
                        </FormControl>
                    </FormItem>
                )}
            />
                <FormField control={form.control} name="dueDate" render={({ field }) => <FormItem><FormLabel>Échéance</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>} />
            </div>
        </div>
        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={onSave}>Annuler</Button>
          <Button type="submit" disabled={isSubmitting}>
             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
