

'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/firebase";
import { useSchoolData } from "@/hooks/use-school-data";
import { Skeleton } from "@/components/ui/skeleton";
import type { class_type as Class, staff as Staff, timetableEntry, subject as Subject } from '@/lib/data-types';
import { cn } from "@/lib/utils";
import { useTimetable } from "@/hooks/use-timetable"; // Hook
import { useStaff } from "@/hooks/use-staff"; // Hook
import { useClasses } from "@/hooks/use-classes"; // Hook
import { useSubjects } from "@/hooks/use-subjects"; // Hook
import { TimetableService } from "@/services/timetable-service"; // Service
import { TimetableForm } from "@/components/timetable/timetable-form"; // New Component

const daysOfWeek: timetableEntry['day'][] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];



export default function TimetablePage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();
  const { user } = useUser();
  const canManageClasses = !!user?.profile?.permissions?.manageClasses;

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [editingEntry, setEditingEntry] = useState<timetableEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<timetableEntry | null>(null);
  const [newEntryDefaults, setNewEntryDefaults] = useState<Partial<timetableEntry>>({});

  // --- Hooks ---
  const { timetable, loading: timetableLoading } = useTimetable(schoolId, selectedClassId);
  // For teachers, we want only staff with role 'enseignant'. 
  // The useStaff hook returns all staff. We'll filter here.
  const { staff, loading: staffLoading } = useStaff(schoolId);
  const teachers = useMemo(() => staff.filter(s => s.role === 'enseignant'), [staff]);

  const { classes, loading: classesLoading } = useClasses(schoolId);
  // useSubjects returns { subjects, loading, error }
  const { subjects, loading: subjectsLoading } = useSubjects(schoolId);

  const isLoading = schoolLoading || timetableLoading || staffLoading || classesLoading || subjectsLoading;

  /* Grid calculation handled in useMemo below */
  const { timetableGrid, allTimeSlots } = useMemo(() => {
    const grid: { [time: string]: { [day: string]: timetableEntry[] } } = {};
    // useTimetable handles filtering by classId if we pass filtering params to it! 
    // BUT checking the hook: it does receive classId.
    // However, the previous logic did manual filtering here.
    // The hook returns ALREADY filtered data if selectedClassId != 'all'.
    // So we just iterate over `timetable`.

    // BUT we need to support the case where we view ALL classes too.
    const filteredEntries = timetable; // Already filtered by hook if selectedClassId is set

    const uniqueTimes = new Set<string>();
    filteredEntries.forEach(entry => {
      uniqueTimes.add(entry.startTime);
    });
    // Ensure all base time slots are present
    timeSlots.forEach(slot => uniqueTimes.add(slot));

    const sortedTimes = Array.from(uniqueTimes).sort();

    sortedTimes.forEach(time => {
      grid[time] = {};
      daysOfWeek.forEach(day => {
        grid[time][day] = [];
      });
    });

    filteredEntries.forEach(entry => {
      if (grid[entry.startTime] && grid[entry.startTime][entry.day]) {
        grid[entry.startTime][entry.day].push(entry);
      }
    });

    return { timetableGrid: grid, allTimeSlots: sortedTimes };
  }, [timetable]);


  const handleOpenFormDialog = (entry: timetableEntry | null, day?: timetableEntry['day'], time?: string) => {
    if (entry) {
      setEditingEntry(entry);
      setNewEntryDefaults({});
    } else if (day && time) {
      setEditingEntry(null);
      const timeIndex = timeSlots.indexOf(time);
      const endTime = timeIndex !== -1 && timeIndex < timeSlots.length - 1 ? timeSlots[timeIndex + 1] : time;
      setNewEntryDefaults({
        day,
        startTime: time,
        endTime,
        classId: selectedClassId !== 'all' ? selectedClassId : ''
      });
    } else {
      setEditingEntry(null);
      setNewEntryDefaults({
        classId: selectedClassId !== 'all' ? selectedClassId : ''
      });
    }
    setIsFormOpen(true);
  };

  const handleOpenDeleteDialog = (entry: timetableEntry) => {
    setEntryToDelete(entry);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteEntry = async () => {
    if (!schoolId || !entryToDelete) return;

    try {
      await TimetableService.deleteEntry(schoolId, entryToDelete.id!);
      toast({ title: "Entrée supprimée", description: "L'entrée a été supprimée de l'emploi du temps." });
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer l'entrée." });
    } finally {
      setIsDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Emploi du Temps</h1>
            <p className="text-muted-foreground">Vue hebdomadaire des cours par classe.</p>
          </div>
          <div className="flex w-full sm:w-auto gap-2">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrer par classe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {canManageClasses && (
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenFormDialog(null)}>
                    <span className="flex items-center gap-2">
                      <PlusCircle className="mr-2 h-4 w-4" /> Ajouter
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingEntry ? "Modifier" : "Ajouter à"} l&apos;Emploi du Temps</DialogTitle>
                  </DialogHeader>
                  <TimetableForm
                    schoolId={schoolId!}
                    entry={editingEntry}
                    classes={classes}
                    teachers={teachers}
                    subjects={subjects}
                    onSave={() => setIsFormOpen(false)}
                    onCancel={() => setIsFormOpen(false)}
                    defaultValues={newEntryDefaults}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-full border-collapse">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24 border text-center font-semibold">Heure</TableHead>
                    {daysOfWeek.map(day => (
                      <TableHead key={day} className="border text-center font-semibold">{day}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="border p-2 text-center"><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                      {daysOfWeek.map(day => (
                        <TableCell key={day} className="border p-2"><Skeleton className="h-16 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  )) : allTimeSlots.map(time => (
                    <TableRow key={time}>
                      <TableCell className="border p-2 text-center align-middle font-mono text-sm">{time}</TableCell>
                      {daysOfWeek.map(day => (
                        <TableCell key={day} className="border p-1 align-top h-24 w-40 relative group">
                          {timetableGrid[time]?.[day]?.map(entry => {
                            const teacher = teachers.find(t => t.id === entry.teacherId);
                            const classInfo = classes.find(c => c.id === entry.classId);
                            const subjectInfo = subjects.find(s => s.name === entry.subject);
                            const color = entry.color || subjectInfo?.color || '#3b82f6';
                            return (
                              <div key={entry.id} className="p-2 rounded-lg text-xs mb-1 relative" style={{ backgroundColor: `${color}1A`, borderColor: color, borderLeftWidth: '3px' }}>
                                <p className="font-bold" style={{ color: color }}>{entry.subject}</p>
                                <p className="text-muted-foreground">{teacher ? `${teacher.firstName[0]}. ${teacher.lastName}` : 'N/A'}</p>
                                {selectedClassId === 'all' && <p className="font-semibold" style={{ color: color }}>{classInfo?.name}</p>}
                                {canManageClasses && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100")}>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem onClick={() => handleOpenFormDialog(entry)}>Modifier</DropdownMenuItem>
                                      <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(entry)}>Supprimer</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            );
                          })}
                          {canManageClasses && (
                            <Button variant="ghost" size="icon" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100" onClick={() => handleOpenFormDialog(null, day, time)}>
                              <PlusCircle className="h-5 w-5 text-muted-foreground" />
                            </Button>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!isLoading && allTimeSlots.length === 0 && (
                <div className="text-center text-muted-foreground py-10">
                  {selectedClassId !== 'all' ? 'Aucun cours programmé pour cette classe.' : 'Aucun cours programmé. Commencez par ajouter une entrée.'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. L&apos;entrée sera définitivement supprimée de l&apos;emploi du temps.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}






