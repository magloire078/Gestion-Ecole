
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { addDays, format, startOfDay, endOfDay, isEqual, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, PlusCircle, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReservationForm } from './reservation-form';
import type { salle as Salle, reservation_salle as Reservation, staff as Staff } from '@/lib/data-types';
import { Skeleton } from '../ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';

const timeSlots = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);

// Mocks - à remplacer par de vraies données Leaflet si nécessaire.
// Pour le rendu côté serveur et les tests, nous n'utiliserons pas de carte réelle.
const MapContainer = ({ children }: { children: React.ReactNode }) => <div className="h-full w-full bg-muted flex items-center justify-center"><p className="text-muted-foreground">La carte est désactivée en mode prévisualisation.</p>{children}</div>;
const TileLayer = () => null;
const Marker = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
const Popup = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;


export function ReservationsCalendar({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const canManageContent = !!user?.profile?.permissions?.manageRooms;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<(Reservation & { id: string }) | null>(null);
  const [preselectedSlot, setPreselectedSlot] = useState<{ time: string, date: Date, salleId: string } | null>(null);

  const sallesQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/salles`)), [firestore, schoolId]);
  const reservationsQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/reservations_salles`)), [firestore, schoolId]);
  const staffQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/personnel`)), [firestore, schoolId]);

  const { data: sallesData, loading: sallesLoading } = useCollection(sallesQuery);
  const { data: reservationsData, loading: reservationsLoading } = useCollection(reservationsQuery);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);

  const salles = useMemo(() => sallesData.map(doc => ({ id: doc.id, ...doc.data() } as Salle & { id: string })), [sallesData]);
  const reservations = useMemo(() => reservationsData.map(doc => ({ id: doc.id, ...doc.data() } as Reservation & { id: string })), [reservationsData]);
  const staffMap = useMemo(() => {
    const map = new Map<string, string>();
    staffData.forEach(doc => {
      const staff = doc.data() as Staff;
      map.set(doc.id, `${staff.firstName} ${staff.lastName}`);
    });
    return map;
  }, [staffData]);

  const reservationsBySalleAndTime = useMemo(() => {
    const grid: Record<string, Record<string, Reservation & {id: string}>> = {};
    const startOfSelectedDay = startOfDay(currentDate);

    const dayReservations = reservations.filter(res => {
        const resDate = new Date(res.startTime);
        return isEqual(startOfDay(resDate), startOfSelectedDay);
    });

    dayReservations.forEach(res => {
        const startTime = format(new Date(res.startTime), 'HH:00');
        if (!grid[res.salleId]) {
            grid[res.salleId] = {};
        }
        grid[res.salleId][startTime] = res;
    });

    return grid;
  }, [reservations, currentDate]);


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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Calendrier des Salles</CardTitle>
              <CardDescription>
                Aperçu des réservations pour le {format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Popover>
                <PopoverTrigger asChild>
                    <Button variant={"outline"} className="w-full sm:w-auto justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(currentDate, 'PPP', { locale: fr })}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={currentDate} onSelect={(d) => d && setCurrentDate(d)} initialFocus/>
                </PopoverContent>
              </Popover>
              {canManageContent && (
                <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Réserver
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <Skeleton className="h-[500px] w-full" />
          ) : salles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[800px]">
                <thead className="bg-muted">
                  <tr>
                    <th className="sticky left-0 bg-muted p-2 border text-sm w-28">Heure</th>
                    {salles.map(salle => (
                      <th key={salle.id} className="p-2 border text-center font-semibold text-sm">
                        {salle.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map(time => (
                      <tr key={time}>
                        <td className="sticky left-0 bg-muted p-2 border text-center text-xs font-mono">{time}</td>
                        {salles.map(salle => {
                            const reservation = reservationsBySalleAndTime[salle.id]?.[time];
                            return (
                              <td key={salle.id} className="p-1 border align-top h-24 relative group" onClick={() => !reservation && canManageContent && handleOpenForm(null, { date: currentDate, time, salleId: salle.id })}>
                                 {reservation ? (
                                      <div className="p-2 bg-primary/10 rounded-md text-xs h-full flex flex-col justify-center cursor-pointer hover:bg-primary/20" onClick={() => canManageContent && handleOpenForm(reservation)}>
                                          <div className="font-bold text-primary">{reservation.eventName}</div>
                                          <div className="text-muted-foreground">{format(new Date(reservation.startTime), 'HH:mm')} - {format(new Date(reservation.endTime), 'HH:mm')}</div>
                                          <div className="text-muted-foreground text-xs truncate">Par: {staffMap.get(reservation.reservedBy) || 'Inconnu'}</div>
                                      </div>
                                 ) : (
                                      canManageContent && (
                                          <div className="h-full w-full flex items-center justify-center">
                                              <PlusCircle className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </div>
                                      )
                                 )}
                              </td>
                            );
                        })}
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg m-4">
                <Building className="mx-auto h-12 w-12" />
                <h3 className="mt-4 text-lg font-semibold">Aucune salle disponible</h3>
                <p className="mt-2 text-sm">Veuillez d'abord ajouter des salles dans la section Immobilier pour pouvoir créer des réservations.</p>
                {canManageContent && (
                    <Button asChild className="mt-4">
                    <Link href="/dashboard/immobilier/batiments">Ajouter des salles</Link>
                    </Button>
                )}
            </div>
          )}
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
                staff={staffData.map(doc => ({id: doc.id, ...doc.data()} as Staff & {id: string}))}
                reservation={editingReservation}
                preselectedSlot={preselectedSlot}
                onSave={() => { setIsFormOpen(false); setEditingReservation(null); setPreselectedSlot(null); }}
            />
        </DialogContent>
      </Dialog>
    </>
  );
}
