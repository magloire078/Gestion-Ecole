
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { format, addDays } from 'date-fns';
import type { libraryBook as LibraryBook, student as Student } from '@/lib/data-types';
import { LibraryService } from '@/services/library-service';

const loanSchema = z.object({
  studentId: z.string().min(1, 'Veuillez sélectionner un élève.'),
  dueDate: z.string().min(1, 'La date de retour est requise.'),
});

type LoanFormValues = z.infer<typeof loanSchema>;

interface LoanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  book: (LibraryBook & { id: string }) | null;
  students: (Student & { id: string })[];
  schoolId: string;
}

export function LoanDialog({ isOpen, onClose, book, students, schoolId }: LoanDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      studentId: '',
      dueDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
    },
  });

  const handleSubmit = async (values: LoanFormValues) => {
    if (!book) return;

    setIsSubmitting(true);
    const loanData = {
      schoolId,
      bookId: book.id,
      studentId: values.studentId,
      borrowedDate: new Date().toISOString(),
      dueDate: new Date(values.dueDate).toISOString(),
      status: 'borrowed' as const,
    };

    try {
      await LibraryService.createLoan(schoolId, loanData);
      toast({ title: 'Prêt enregistré', description: `Le livre "${book.title}" a été emprunté.` });
      onClose();
    } catch (e) {
      console.error("Error saving loan:", e);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer le prêt." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer un nouveau prêt</DialogTitle>
          <DialogDescription>
            Livre : <span className="font-semibold">{book?.title}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="loan-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Élève</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de retour prévue</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="loan-form" disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer le prêt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
