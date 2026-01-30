'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { doc, addDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import type { staff as Staff, cycle as Cycle, niveau as Niveau, class_type as ClassType } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Loader2 } from 'lucide-react';

const classSchema = z.object({
  cycleId: z.string().min(1, 'Le cycle est requis.'),
  niveauId: z.string().min(1, 'Le niveau est requis.'),
  section: z.string().min(1, 'La section/lettre est requise (ex: A, B, C...).').max(5, 'La section est trop longue.'),
  academicYear: z.string().min(1, 'L\'année académique est requise.'),
  mainTeacherId: z.string().optional(),
  maxStudents: z.coerce.number().min(1, 'La capacité doit être d\'au moins 1.'),
  classroom: z.string().optional(),
});

type ClassFormValues = z.infer<typeof classSchema>;

interface ClassFormProps {
    schoolId: string;
    cycles: (Cycle & {id: string})[];
    niveaux: (Niveau & {id: string})[];
    teachers: (Staff & {id: string})[];
    classe: (ClassType & { id: string }) | null;
    onSave: () => void;
}

export function ClassForm({ schoolId, cycles, niveaux, teachers, classe, onSave }: ClassFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentYear = new Date().getFullYear();
  const academicYear = `${currentYear}-${currentYear + 1}`;

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      academicYear: academicYear,
      maxStudents: 30,
    },
  });
  const { reset, setValue } = form;

  useEffect(() => {
    reset(classe || {
      academicYear: academicYear,
      maxStudents: 30,
      cycleId: '',
      niveauId: '',
      section: '',
      mainTeacherId: '',
      classroom: '',
    });
  }, [classe, academicYear, reset]);

  const watchedCycleId = useWatch({ control: form.control, name: 'cycleId' });
  const filteredNiveaux = useMemo(() => niveaux.filter(n => n.cycleId === watchedCycleId), [niveaux, watchedCycleId]);

  useEffect(() => {
    if (classe?.cycleId !== watchedCycleId) {
      setValue('niveauId', '');
    }
  }, [watchedCycleId, setValue, classe]);

  const onSubmit = async (values: ClassFormValues) => {
    if (!schoolId || !user?.uid) return;
    setIsSubmitting(true);
    
    const selectedNiveau = niveaux.find(n => n.id === values.niveauId);
    const selectedTeacher = teachers.find(t => t.id === values.mainTeacherId);
    const className = `${selectedNiveau?.name}-${values.section.toUpperCase()}`;
    const classCode = `${selectedNiveau?.code}${values.section.toUpperCase()}`;

    const newClassData = {
      ...values,
      schoolId,
      name: className,
      code: classCode,
      grade: selectedNiveau?.name || 'N/A',
      mainTeacherName: selectedTeacher ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}` : '',
      studentCount: classe?.studentCount || 0,
      status: classe?.status || 'active',
      isFull: classe?.isFull || false,
      createdBy: classe?.createdBy || user.uid,
      createdAt: classe?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const promise = classe
      ? setDoc(doc(firestore, `ecoles/${schoolId}/classes/${classe.id}`), newClassData, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/classes`), newClassData);

    try {
      await promise;
      toast({ title: `Classe ${classe ? 'modifiée' : 'créée'}`, description: `La classe ${className} a été enregistrée.` });
      onSave();
    } catch (e) {
      const path = `ecoles/${schoolId}/classes/${classe?.id || ''}`;
      const operation = classe ? 'update' : 'create';
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path, operation, requestResourceData: newClassData }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="max-h-[60vh] overflow-y-auto p-1 pr-4 space-y-4">
          <FormField control={form.control} name="cycleId" render={({ field }) => (
              <FormItem><FormLabel>Cycle *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir un cycle..." /></SelectTrigger></FormControl><SelectContent>{cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="niveauId" render={({ field }) => (
              <FormItem><FormLabel>Niveau *</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!watchedCycleId}><FormControl><SelectTrigger><SelectValue placeholder={watchedCycleId ? "Choisir un niveau..." : "Sélectionnez d'abord un cycle"} /></SelectTrigger></FormControl><SelectContent>{filteredNiveaux.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="section" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Section *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Ex: A" /></SelectTrigger></FormControl>
                          <SelectContent>{['A', 'B', 'C', 'D', 'E', 'F'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
              )} />
              <FormField control={form.control} name="academicYear" render={({ field }) => (<FormItem><FormLabel>Année Scolaire *</FormLabel><FormControl><Input {...field} readOnly className="bg-muted"/></FormControl><FormMessage /></FormItem>)} />
          </div>
          <FormField control={form.control} name="mainTeacherId" render={({ field }) => (
              <FormItem><FormLabel>Enseignant Principal</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="(Optionnel)" /></SelectTrigger></FormControl><SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}</SelectContent></Select></FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="maxStudents" render={({ field }) => (<FormItem><FormLabel>Capacité Max. *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="classroom" render={({ field }) => (<FormItem><FormLabel>Salle de classe</FormLabel><FormControl><Input placeholder="Ex: Salle 101" {...field} /></FormControl></FormItem>)} />
          </div>
        </div>
        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={onSave}>Annuler</Button>
          <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer la classe'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
