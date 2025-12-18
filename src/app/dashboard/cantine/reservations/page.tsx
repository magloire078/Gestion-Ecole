
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Search, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { canteenReservation as CanteenReservation, student as Student } from '@/lib/data-types';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ReservationForm } from '@/components/cantine/reservation-form';

interface ReservationWithStudentName extends CanteenReservation {
    studentName?: string;
    id: string;
}

export default function ReservationsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const canManageContent = !!user?.profile?.permissions?.manageCantine;

  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<ReservationWithStudentName | null>(null);

  const reservationsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cantine_reservations`)) : null, [firestore, schoolId]);
  const studentsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [firestore, schoolId]);

  const { data: reservationsData, loading: reservationsLoading } = useCollection(reservationsQuery);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);

  const reservations: ReservationWithStudentName[] = useMemo(() => {
    if (!reservationsData || !studentsData) return [];
    
    const studentsMap = new Map(studentsData.map(doc => [doc.id, doc.data() as Student]));
    
    return reservationsData.map(doc => {
      const res = { id: doc.id, ...doc.data() } as CanteenReservation & { id: string };
      const student = studentsMap.get(res.studentId);
      return {
        ...res,
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Élève inconnu'
      };
    });
  }, [reservationsData, studentsData]);
  
  const filteredReservations = useMemo(() => {
    return reservations.filter(res => 
      res.studentName?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reservations, searchQuery]);

  const isLoading = reservationsLoading || studentsLoading || schoolLoading;
  
  const handleOpenForm = (reservation: ReservationWithStudentName | null) => {
    setEditingReservation(reservation);
    setIsFormOpen(true);
  };
  
  const handleFormSave = () => {
    setIsFormOpen(false);
    setEditingReservation(null);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'confirmed': return 'secondary';
        case 'attended': return 'default';
        case 'cancelled': return 'destructive';
        default: return 'outline';
    }
  };

  const getPaymentBadgeVariant = (status: string) => {
     switch (status) {
        case 'paid': return 'secondary';
        case 'partially_paid': return 'outline';
        case 'unpaid': return 'destructive';
        default: return 'default';
    }
  };

  return (
    <>
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Réservations de la Cantine</CardTitle>
              <CardDescription>Liste de toutes les réservations de repas.</CardDescription>
            </div>
            {canManageContent && (
              <Button onClick={() => handleOpenForm(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouvelle Réservation
              </Button>
            )}
          </div>
           <div className="relative pt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Rechercher par nom d'élève..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Élève</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredReservations.length > 0 ? (
                filteredReservations.map(res => (
                  <TableRow key={res.id}>
                    <TableCell>{format(new Date(res.date), 'd MMM yyyy', { locale: fr })}</TableCell>
                    <TableCell className="font-medium">{res.studentName}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(res.status)}>{res.status}</Badge></TableCell>
                    <TableCell><Badge variant={getPaymentBadgeVariant(res.paymentStatus)}>{res.paymentStatus}</Badge></TableCell>
                    <TableCell className="text-right">
                        {canManageContent && (
                            <Button variant="ghost" size="icon" onClick={() => handleOpenForm(res)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                        )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Aucune réservation trouvée.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingReservation ? 'Modifier' : 'Nouvelle'} Réservation</DialogTitle>
                <DialogDescription>
                    {editingReservation ? 'Mettez à jour les détails de la réservation.' : 'Enregistrez un nouveau repas pour un élève.'}
                </DialogDescription>
            </DialogHeader>
             <ReservationForm 
                schoolId={schoolId!}
                students={studentsData?.docs.map(d => ({id: d.id, ...d.data()} as Student)) || []}
                reservation={editingReservation}
                onSave={handleFormSave}
            />
        </DialogContent>
    </Dialog>
    </>
  );
}
