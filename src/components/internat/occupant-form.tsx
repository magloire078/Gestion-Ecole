
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { doc, collection, runTransaction } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import type { occupant as Occupant, student as Student, room as Room } from '@/lib/data-types';
import { format, addMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import { DialogFooter } from '../ui/dialog';
import { resolveAcademicYearForWrite } from '@/lib/academic-year-utils';

const occupantFormSchema = z.object({
  studentId: z.string().min(1, 'Veuillez sélectionner un élève.'),
  roomId: z.string().min(1, 'Veuillez sélectionner une chambre.'),
  startDate: z.string().min(1, 'La date d\'entrée est requise.'),
  endDate: z.string().optional(),
  status: z.enum(['active', 'pending', 'terminated', 'suspended']),
  nextPaymentDue: z.string().optional(),
});

type OccupantFormValues = z.infer<typeof occupantFormSchema>;

interface OccupantFormProps {
  schoolId: string;
  students: (Student & { id: string })[];
  rooms: (Room & { id: string })[];
  occupant: (Occupant & { id: string }) | null;
  onSave: () => void;
}

export function OccupantForm({ schoolId, students, rooms, occupant, onSave }: OccupantFormProps) {
  const firestore = useFirestore();
  const { schoolData } = useSchoolData();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const nextMonth = format(addMonths(new Date(), 1), 'yyyy-MM-dd');

  const form = useForm<OccupantFormValues>({
    resolver: zodResolver(occupantFormSchema),
    defaultValues: occupant ? {
      ...occupant,
      startDate: format(new Date(occupant.startDate), 'yyyy-MM-dd'),
      endDate: occupant.endDate ? format(new Date(occupant.endDate), 'yyyy-MM-dd') : '',
      nextPaymentDue: occupant.nextPaymentDue ? format(new Date(occupant.nextPaymentDue), 'yyyy-MM-dd') : '',
    } : {
      studentId: '',
      roomId: '',
      startDate: today,
      endDate: '',
      status: 'active',
      nextPaymentDue: nextMonth,
    },
  });
  const { reset } = form;

  const availableRooms = useMemo(() => rooms.filter(room => room.status === 'available' || room.id === occupant?.roomId), [rooms, occupant]);

  useEffect(() => {
    reset(occupant ? {
      ...occupant,
      startDate: format(new Date(occupant.startDate), 'yyyy-MM-dd'),
      endDate: occupant.endDate ? format(new Date(occupant.endDate), 'yyyy-MM-dd') : '',
      nextPaymentDue: occupant.nextPaymentDue ? format(new Date(occupant.nextPaymentDue), 'yyyy-MM-dd') : '',
    } : {
      studentId: '',
      roomId: '',
      startDate: today,
      endDate: '',
      status: 'active',
      nextPaymentDue: nextMonth,
    });
  }, [occupant, today, nextMonth, reset]);

  const handleSubmit = async (values: OccupantFormValues) => {
    setIsSubmitting(true);

    const wasActive = occupant?.status === 'active';
    const willBeActive = values.status === 'active';
    const previousRoomId = occupant?.roomId;
    const roomChanged = wasActive && previousRoomId && previousRoomId !== values.roomId;
    const dataToSave: Record<string, unknown> = { ...values };
    if (!occupant) {
      dataToSave.academicYear = resolveAcademicYearForWrite({
        schoolCurrentYear: (schoolData as any)?.currentAcademicYear,
        docDate: values.startDate,
      });
    }

    try {
      const occupantId = occupant?.id;
      const occupantRef = occupantId
        ? doc(firestore, `ecoles/${schoolId}/internat_occupants/${occupantId}`)
        : doc(collection(firestore, `ecoles/${schoolId}/internat_occupants`));
      const newRoomRef = doc(firestore, `ecoles/${schoolId}/internat_chambres/${values.roomId}`);
      const oldRoomRef = roomChanged ? doc(firestore, `ecoles/${schoolId}/internat_chambres/${previousRoomId}`) : null;

      // Capacité et occupation vérifiées et mises à jour dans une même
      // transaction : deux admissions concurrentes ne peuvent plus faire
      // dépasser la capacité d'une chambre (contrairement à un compte
      // recalculé après-coup, sujet à une condition de course).
      await runTransaction(firestore, async (transaction) => {
        const newRoomSnap = await transaction.get(newRoomRef);
        const oldRoomSnap = oldRoomRef ? await transaction.get(oldRoomRef) : null;

        if (!newRoomSnap.exists()) {
          throw new Error("La chambre sélectionnée n'existe plus.");
        }
        const newRoomData = newRoomSnap.data() as Room;
        const newRoomCurrentOccupancy = newRoomData.currentOccupancy || 0;

        // Le passage à "actif" dans cette chambre nécessite une place libre
        // (sauf si l'élève y était déjà actif et ne fait que changer d'autres champs).
        const entersNewRoomAsActive = willBeActive && (!wasActive || roomChanged);
        if (entersNewRoomAsActive && newRoomCurrentOccupancy >= newRoomData.capacity) {
          throw new Error(`La chambre ${newRoomData.number} est complète (${newRoomData.capacity} places).`);
        }

        transaction.set(occupantRef, dataToSave, { merge: true });

        if (roomChanged && oldRoomSnap?.exists()) {
          const oldRoomData = oldRoomSnap.data() as Room;
          const oldOccupancy = Math.max(0, (oldRoomData.currentOccupancy || 0) - 1);
          transaction.update(oldRoomRef!, {
            currentOccupancy: oldOccupancy,
            status: oldOccupancy >= oldRoomData.capacity ? 'occupied' : 'available',
          });
        }

        let newOccupancy = newRoomCurrentOccupancy;
        if (entersNewRoomAsActive) {
          newOccupancy = newRoomCurrentOccupancy + 1;
        } else if (wasActive && !willBeActive && !roomChanged) {
          newOccupancy = Math.max(0, newRoomCurrentOccupancy - 1);
        }
        if (newOccupancy !== newRoomCurrentOccupancy || newRoomData.status !== (newOccupancy >= newRoomData.capacity ? 'occupied' : 'available')) {
          transaction.update(newRoomRef, {
            currentOccupancy: newOccupancy,
            status: newOccupancy >= newRoomData.capacity ? 'occupied' : 'available',
          });
        }
      });

      toast({ title: 'Occupation enregistrée', description: "L'assignation de la chambre a été enregistrée." });
      onSave();
    } catch (e: any) {
      console.error("Error saving occupant:", e);
      toast({ variant: 'destructive', title: 'Erreur', description: e?.message || 'Impossible d\'enregistrer l\'occupation.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-4">
          <FormField control={form.control} name="studentId" render={({ field }) => (
            <FormItem><FormLabel>Élève</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!!occupant}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger></FormControl><SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id!}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="roomId" render={({ field }) => (
            <FormItem><FormLabel>Chambre</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une chambre disponible" /></SelectTrigger></FormControl><SelectContent>{availableRooms.map(r => <SelectItem key={r.id} value={r.id}>{r.number}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem><FormLabel>Date d&apos;entrée</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="endDate" render={({ field }) => (<FormItem><FormLabel>Date de sortie (optionnel)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
          </div>
          <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Actif</SelectItem><SelectItem value="pending">En attente</SelectItem><SelectItem value="suspended">Suspendu</SelectItem><SelectItem value="terminated">Terminé</SelectItem></SelectContent></Select></FormItem>)} />
          <FormField control={form.control} name="nextPaymentDue" render={({ field }) => (<FormItem><FormLabel>Prochain paiement dû</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
