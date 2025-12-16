
'use client';

import { useState, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { student as Student } from '@/lib/data-types';

export function BillingAlerts({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const [studentsWithDues, setStudentsWithDues] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const studentsQuery = useMemoFirebase(() =>
    query(collection(firestore, `ecoles/${schoolId}/eleves`), where('amountDue', '>', 0))
  , [firestore, schoolId]);

  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);

  useEffect(() => {
    if (!studentsLoading) {
      const studentsList = studentsData?.map(doc => doc.data() as Student) || [];
      setStudentsWithDues(studentsList);
      setLoading(false);
    }
  }, [studentsData, studentsLoading]);

  if (loading || studentsWithDues.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="font-bold">Alerte Financière</AlertTitle>
      <AlertDescription>
        <div className="flex justify-between items-center">
            <div>
                 {studentsWithDues.length} élève(s) ont des frais de scolarité impayés.
            </div>
             <Button asChild size="sm">
                <Link href="/dashboard/paiements">
                    Voir la liste
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
