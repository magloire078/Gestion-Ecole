'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { addDays, format, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReservationForm } from './reservation-form';
import type { salle as Salle, reservation_salle as Reservation, staff as Staff } from '@/lib/data-types';
import { Skeleton } from '../ui/skeleton';

const timeSlots = Array.from({ length: 11 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);

export function ReservationsCalendar({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const canManageContent = !!user?.profile?.permissions?.manageContent;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<(Reservation & { id: string }) | null>(null);
  const [preselectedSlot, setPreselectedSlot] = useState<{ time: string, date: Date, salleId: string } | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const sallesQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/salles`)), [firestore, schoolId]);
  const reservationsQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/reservations_salles`)), [firestore, schoolId]);
  const staffQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/personnel`)), [firestore, schoolId]);

  const { data: sallesData, loading: sallesLoading } = useCollection(sallesQuery);
  const { data: reservationsData, loading: reservationsLoading } = useCollection(reservationsQuery);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);

  const salles = useMemo(() => sallesData?.map(doc => ({ id: doc.id, ...doc.data() } as Salle & { id: string })) || [], [sallesData]);
  const reservations = useMemo(() => reservationsData?.map(doc => ({ id: doc.id, ...doc.data() } as Reservation & { id: string })) || [], [reservationsData]);
  const staffMap = useMemo(() => {
    const map = new Map<string, string>();
    staffData?.forEach(doc => {
      const staff = doc.data() as Staff;
      map.set(doc.id, `${staff.firstName} ${staff.lastName}`);
    });
    return map;
  }, [staffData]);

  const weekDates = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const handleOpenForm = (reservation: Reservation | null = null, slotInfo: { time: string, date: Date, salleId: string } | null = null) => {
    setEditingReservation(reservation as (Reservation & { id: string }) | null);
    setPreselectedSlot(slotInfo);
    setIsFormOpen(true);
  };
  
  const isLoading = sallesLoading || reservationsLoading || staffLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Calendrier des Salles</CardTitle>
              <CardDescription>
                Semaine du {format(weekStart, 'd MMMM', { locale: fr })} au {format(weekEnd, 'd MMMM yyyy', { locale: fr })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -7))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Aujourd'hui</Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}><ChevronRight className="h-4 w-4" /></Button>
              {canManageContent && (
                <Button onClick={() => handleOpenForm()}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Réserver
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-muted">
                <tr>
                  <th className="sticky left-0 bg-muted p-2 border w-28"></th>
                  {weekDates.map(date => (
                    <th key={date.toISOString()} className="p-2 border text-center font-semibold">
                      <div className="capitalize">{format(date, 'EEEE', { locale: fr })}</div>
                      <div className="text-sm text-muted-foreground">{format(date, 'd/MM')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salles.map(salle => (
                  <tr key={salle.id}>
                    <td className="sticky left-0 bg-muted p-2 border text-center font-semibold">
                        <div className="text-sm">{salle.name}</div>
                        <div className="text-xs text-muted-foreground">{salle.capacity} places</div>
                    </td>
                    {weekDates.map(date => {
                        const dateString = format(date, 'yyyy-MM-dd');
                        const dayReservations = reservations.filter(r => r.salleId === salle.id && r.startTime.startsWith(dateString));
                        return (
                             <td key={date.toISOString()} className="p-1 border align-top relative group">
                                <div className="space-y-1">
                                    {dayReservations.map(res => (
                                        <div key={res.id} className="p-2 bg-primary/10 rounded-md text-xs cursor-pointer hover:bg-primary/20" onClick={() => handleOpenForm(res)}>
                                            <div className="font-bold text-primary">{res.eventName}</div>
                                            <div className="text-muted-foreground">{format(new Date(res.startTime), 'HH:mm')} - {format(new Date(res.endTime), 'HH:mm')}</div>
                                            <div className="text-muted-foreground text-xs">Par: {staffMap.get(res.reservedBy) || 'Inconnu'}</div>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="ghost" size="icon" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100" onClick={() => handleOpenForm(null, { date, time: '08:00', salleId: salle.id })}>
                                    <PlusCircle className="h-5 w-5 text-muted-foreground" />
                                </Button>
                             </td>
                        )
                    })}
                  </tr>
                ))}
                {isLoading && (
                    <TableRow>
                        <TableCell colSpan={7} className="h-48"><Skeleton className="w-full h-full" /></TableCell>
                    </TableRow>
                )}
                 {!isLoading && salles.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">Aucune salle n'a été créée. <Link href="/dashboard/immobilier/reservations" className="text-primary underline">Ajoutez-en une</Link> pour commencer.</TableCell>
                    </TableRow>
                 )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingReservation ? 'Modifier la' : 'Nouvelle'} Réservation</DialogTitle>
                <DialogDescription>Réservez une salle pour un événement ou un cours.</DialogDescription>
            </DialogHeader>
            <ReservationForm
                schoolId={schoolId}
                salles={salles}
                staff={staffData?.docs.map(doc => ({id: doc.id, ...doc.data()} as Staff)) || []}
                reservation={editingReservation}
                preselectedSlot={preselectedSlot}
                onSave={() => { setIsFormOpen(false); setEditingReservation(null); setPreselectedSlot(null); }}
            />
        </DialogContent>
      </Dialog>
    </>
  );
}
