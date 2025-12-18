
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { canteenSubscription as CanteenSubscription, student as Student } from '@/lib/data-types';
import { SubscriptionForm } from './subscription-form';

interface SubscriptionWithStudentName extends CanteenSubscription {
    studentName?: string;
}

export function SubscriptionList({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const canManageContent = !!user?.profile?.permissions?.manageCantine;
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<(CanteenSubscription & { id: string }) | null>(null);

  const subscriptionsQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/cantine_abonnements`)), [firestore, schoolId]);
  const studentsQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/eleves`)), [firestore, schoolId]);

  const { data: subscriptionsData, loading: subscriptionsLoading } = useCollection(subscriptionsQuery);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);

  const subscriptions: SubscriptionWithStudentName[] = useMemo(() => {
    if (!subscriptionsData || !studentsData) return [];
    
    const studentsMap = new Map(studentsData.map(doc => [doc.id, doc.data() as Student]));
    
    return subscriptionsData.map(doc => {
      const sub = { id: doc.id, ...doc.data() } as CanteenSubscription & { id: string };
      const student = studentsMap.get(sub.studentId);
      return {
        ...sub,
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Élève inconnu'
      };
    });
  }, [subscriptionsData, studentsData]);

  const handleOpenForm = (subscription: (CanteenSubscription & { id: string }) | null) => {
    setEditingSubscription(subscription);
    setIsFormOpen(true);
  };
  
  const handleFormSave = () => {
      setIsFormOpen(false);
      setEditingSubscription(null);
  }

  const isLoading = subscriptionsLoading || studentsLoading;
  
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'active': return 'secondary';
        case 'inactive': return 'outline';
        case 'expired': return 'destructive';
        default: return 'default';
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Abonnements Cantine</CardTitle>
              <CardDescription>Liste des élèves abonnés au service de cantine.</CardDescription>
            </div>
            {canManageContent && (
              <Button onClick={() => handleOpenForm(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouvel Abonnement
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Élève</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Repas Restants</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : subscriptions.length > 0 ? (
                subscriptions.map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.studentName}</TableCell>
                    <TableCell className="capitalize">{sub.type}</TableCell>
                    <TableCell>
                      {format(new Date(sub.startDate), 'dd/MM/yy', { locale: fr })} - {format(new Date(sub.endDate), 'dd/MM/yy', { locale: fr })}
                    </TableCell>
                    <TableCell>{sub.remainingMeals ?? 'N/A'}</TableCell>
                    <TableCell>
                        <Badge variant={getStatusBadgeVariant(sub.status)}>{sub.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        {canManageContent && (
                            <Button variant="ghost" size="icon" onClick={() => handleOpenForm(sub)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                        )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Aucun abonnement trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>{editingSubscription ? 'Modifier' : 'Nouvel'} Abonnement</DialogTitle>
                <DialogDescription>
                    {editingSubscription ? 'Mettez à jour les détails de l\'abonnement.' : 'Inscrivez un élève au service de cantine.'}
                </DialogDescription>
            </DialogHeader>
            <SubscriptionForm 
                schoolId={schoolId}
                students={studentsData?.docs.map(d => ({id: d.id, ...d.data()} as Student)) || []}
                subscription={editingSubscription}
                onSave={handleFormSave}
            />
        </DialogContent>
      </Dialog>
    </>
  );
}
