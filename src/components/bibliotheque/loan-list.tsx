
'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import { format, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { libraryLoan as Loan, libraryBook as Book, student as Student } from '@/lib/data-types';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface LoanWithDetails extends Loan {
  id: string;
  studentName?: string;
  bookTitle?: string;
}

export function LoanList({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const canManageLibrary = !!user?.profile?.permissions?.manageLibrary;
  const { toast } = useToast();

  const loansQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/bibliotheque_prets`), orderBy('borrowedDate', 'desc')), [firestore, schoolId]);
  const booksQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/bibliotheque`)), [firestore, schoolId]);
  const studentsQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/eleves`)), [firestore, schoolId]);

  const { data: loansData, loading: loansLoading } = useCollection(loansQuery);
  const { data: booksData, loading: booksLoading } = useCollection(booksQuery);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);

  const loans: LoanWithDetails[] = useMemo(() => {
    if (!loansData || !booksData || !studentsData) return [];
    
    const booksMap = new Map(booksData.map(doc => [doc.id, doc.data() as Book]));
    const studentsMap = new Map(studentsData.map(doc => [doc.id, doc.data() as Student]));
    
    return loansData.map(doc => {
      const loan = { id: doc.id, ...doc.data() } as LoanWithDetails;
      const book = booksMap.get(loan.bookId);
      const student = studentsMap.get(loan.studentId);
      
      return {
        ...loan,
        bookTitle: book?.title || 'Livre inconnu',
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Élève inconnu',
      };
    });
  }, [loansData, booksData, studentsData]);

  const handleReturnBook = async (loanId: string) => {
    const loanRef = doc(firestore, `ecoles/${schoolId}/bibliotheque_prets`, loanId);
    try {
      await updateDoc(loanRef, { status: 'returned', returnedDate: new Date().toISOString() });
      toast({ title: "Livre retourné", description: "Le prêt a été marqué comme retourné." });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: loanRef.path, operation: 'update' }));
    }
  };

  const getStatusBadgeVariant = (loan: LoanWithDetails) => {
    if (loan.status === 'returned') return 'secondary';
    if (isPast(new Date(loan.dueDate))) return 'destructive';
    return 'outline';
  };

  const isLoading = loansLoading || booksLoading || studentsLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des Prêts</CardTitle>
        <CardDescription>Suivi de tous les livres empruntés par les élèves.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Élève</TableHead>
              <TableHead>Livre</TableHead>
              <TableHead>Date d'emprunt</TableHead>
              <TableHead>Date de retour</TableHead>
              <TableHead>Statut</TableHead>
              {canManageLibrary && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}><TableCell colSpan={canManageLibrary ? 6 : 5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
              ))
            ) : loans.length > 0 ? (
              loans.map(loan => (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">{loan.studentName}</TableCell>
                  <TableCell>{loan.bookTitle}</TableCell>
                  <TableCell>{format(new Date(loan.borrowedDate), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                  <TableCell>{format(new Date(loan.dueDate), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(loan)}>
                      {loan.status === 'returned' ? 'Retourné' : isPast(new Date(loan.dueDate)) ? 'En retard' : 'En cours'}
                    </Badge>
                  </TableCell>
                  {canManageLibrary && (
                    <TableCell className="text-right">
                      {loan.status === 'borrowed' && (
                        <Button variant="outline" size="sm" onClick={() => handleReturnBook(loan.id)}>
                          Marquer comme retourné
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={canManageLibrary ? 6 : 5} className="h-24 text-center">Aucun prêt enregistré.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
