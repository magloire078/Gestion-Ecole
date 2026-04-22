

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
import { PlusCircle, MoreHorizontal, LayoutGrid, List, AlertTriangle } from "lucide-react";
import React, { useState, useMemo, useEffect, useRef } from "react";
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
import { useTimetable } from "@/hooks/use-timetable";
import { useStaff } from "@/hooks/use-staff";
import { useClasses } from "@/hooks/use-classes";
import { useSubjects } from "@/hooks/use-subjects";
import { TimetableService } from "@/services/timetable-service";
import { TimetableForm } from "@/components/timetable/timetable-form";
import { 
  DndContext, 
  DragOverlay, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { DraggableTimetableEntry } from "@/components/timetable/draggable-entry";
import { DroppableCell } from "@/components/timetable/droppable-cell";
import { validateMove, timeToMinutes } from "@/lib/timetable-utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const daysOfWeek: timetableEntry['day'][] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

interface ColoredProps {
  color: string;
  children?: React.ReactNode;
  className?: string;
}

const SubjectColorIndicator = ({ color, className }: ColoredProps) => {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      ref.current.style.backgroundColor = color;
    }
  }, [color]);

  return (
    <div 
      ref={ref}
      className={cn("w-1 h-10 rounded-full", className)} 
    />
  );
};

const SubjectColorText = ({ color, children, className }: ColoredProps) => {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.color = color;
    }
  }, [color]);

  return (
    <p 
      ref={ref}
      className={cn("font-bold text-base", className)} 
    >
      {children}
    </p>
  );
};

const ActiveEntryOverlay = ({ entry }: { entry: timetableEntry }) => {
  const color = entry.color || '#3b82f6';
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.backgroundColor = `${color}1A`;
      ref.current.style.borderColor = color;
      ref.current.style.color = color;
    }
  }, [color]);
  
  return (
    <div 
      ref={ref}
      className="p-2 rounded-lg text-xs border-l-[3px] shadow-2xl opacity-90 scale-105 w-[160px]" 
    >
      <p className="font-bold truncate">{entry.subject}</p>
      <p className="text-muted-foreground truncate">{entry.startTime}</p>
    </div>
  );
};

export default function TimetablePage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();
  const { user } = useUser();
  const canManageClasses = !!user?.profile?.permissions?.manageClasses;

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [editingEntry, setEditingEntry] = useState<timetableEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<timetableEntry | null>(null);
  const [newEntryDefaults, setNewEntryDefaults] = useState<Partial<timetableEntry>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  // --- Hooks ---
  // We fetch ALL timetable entries if user can manage, to check for global conflicts
  const { timetable, loading: timetableLoading } = useTimetable(schoolId, canManageClasses ? 'all' : selectedClassId);
  const { staff, loading: staffLoading } = useStaff(schoolId);
  const teachers = useMemo(() => staff.filter(s => s.role === 'enseignant'), [staff]);
  const { classes, loading: classesLoading } = useClasses(schoolId);
  const { subjects, loading: subjectsLoading } = useSubjects(schoolId);

  const isLoading = schoolLoading || timetableLoading || staffLoading || classesLoading || subjectsLoading;

  // Sensors for DND
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const filteredTimetable = useMemo(() => {
    if (selectedClassId === 'all') return timetable;
    return timetable.filter(entry => entry.classId === selectedClassId);
  }, [timetable, selectedClassId]);

  const { timetableGrid, allTimeSlots } = useMemo(() => {
    const grid: { [time: string]: { [day: string]: timetableEntry[] } } = {};
    const uniqueTimes = new Set<string>();
    
    filteredTimetable.forEach(entry => uniqueTimes.add(entry.startTime));
    timeSlots.forEach(slot => uniqueTimes.add(slot));

    const sortedTimes = Array.from(uniqueTimes).sort();

    sortedTimes.forEach(time => {
      grid[time] = {};
      daysOfWeek.forEach(day => {
        grid[time][day] = [];
      });
    });

    filteredTimetable.forEach(entry => {
      if (grid[entry.startTime] && grid[entry.startTime][entry.day]) {
        grid[entry.startTime][entry.day].push(entry);
      }
    });

    return { timetableGrid: grid, allTimeSlots: sortedTimes };
  }, [filteredTimetable]);

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !schoolId) return;

    const entryId = active.id as string;
    const entry = timetable.find((e) => e.id === entryId);
    if (!entry) return;

    const [newDay, newStartTime] = (over.id as string).split('-') as [timetableEntry['day'], string];
    
    // Check if anything actually changed
    if (entry.day === newDay && entry.startTime === newStartTime) return;

    // Validate the move (check conflicts)
    const conflicts = validateMove(entry, newDay, newStartTime, timetable);

    if (conflicts.length > 0) {
      toast({
        variant: "destructive",
        title: "Conflit détecté",
        description: conflicts.join(' '),
      });
      return;
    }

    try {
      // Calculate new end time
      const duration = timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime);
      const newStartMins = timeToMinutes(newStartTime);
      const newEndMins = newStartMins + duration;
      const endH = Math.floor(newEndMins / 60);
      const endM = newEndMins % 60;
      const newEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      await TimetableService.updateEntry(schoolId, entryId, {
        day: newDay,
        startTime: newStartTime,
        endTime: newEndTime
      });
      toast({ title: "Emploi du temps mis à jour" });
    } catch (error) {
      console.error("Error moving entry:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de déplacer le cours." });
    }
  };

  const handleDeleteEntry = async () => {
    if (!schoolId || !entryToDelete) return;

    try {
      await TimetableService.deleteEntry(schoolId, entryToDelete.id!);
      toast({ title: "Entrée supprimée" });
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer l'entrée." });
    } finally {
      setIsDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  const activeEntry = useMemo(() => 
    activeId ? timetable.find(e => e.id === activeId) : null,
  [activeId, timetable]);

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8 max-w-[1600px] mx-auto p-4 md:p-8"
      >
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-600 bg-clip-text text-transparent">Emploi du Temps</h1>
            <p className="text-slate-500 max-w-2xl text-sm font-medium">Planification et organisation pédagogique de l&apos;établissement.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-1 bg-white/40 backdrop-blur-md p-1 rounded-2xl border border-white/60 shadow-sm">
               <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="sm" 
                className={cn("h-10 px-4 rounded-xl font-bold transition-all", viewMode === 'grid' && "bg-white shadow-sm")}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4 mr-2" /> <span>Grille</span>
              </Button>
              <Button 
                variant={viewMode === 'agenda' ? 'secondary' : 'ghost'} 
                size="sm" 
                className={cn("h-10 px-4 rounded-xl font-bold transition-all", viewMode === 'agenda' && "bg-white shadow-sm")}
                onClick={() => setViewMode('agenda')}
              >
                <List className="h-4 w-4 mr-2" /> <span>Agenda</span>
              </Button>
            </div>

            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-full sm:w-[220px] bg-white/50 border-white/60 rounded-2xl h-12 font-bold text-slate-700 backdrop-blur-md">
                <SelectValue placeholder="Filtrer par classe" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-white/40">
                <SelectItem value="all" className="font-medium">Toutes les classes</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id} className="font-medium">{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {canManageClasses && (
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 font-black transition-all hover:scale-105 active:scale-95" onClick={() => handleOpenFormDialog(null)}>
                    <PlusCircle className="mr-2 h-5 w-5" /> Ajouter un cours
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem]">
                   <div className="bg-indigo-600 p-8 text-white">
                    <DialogTitle className="text-3xl font-black tracking-tight">Planifier un cours</DialogTitle>
                    <DialogDescription className="text-indigo-100 font-medium mt-2">Configurez les détails du cours et gérez l&apos;allocation horaire.</DialogDescription>
                  </div>
                  <div className="p-8 bg-white">
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
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Legend / Feedback */}
        {selectedClassId === 'all' && canManageClasses && (
          <div className="flex items-center gap-3 text-sm text-amber-700 bg-amber-50/50 backdrop-blur-sm p-4 rounded-[1.5rem] border border-amber-200/50 shadow-sm animate-in fade-in slide-in-from-top-2 duration-700">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span className="font-medium">Vous visualisez l&apos;emploi du temps global. Utilisez le **glisser-déposer** pour réorganiser les cours instantanément.</span>
          </div>
        )}

        {/* Content Section */}
        <Card className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden border-t-white/80">
          <CardContent className="p-0">
            {viewMode === 'grid' ? (
              <div className="overflow-x-auto custom-scrollbar">
                <Table className="min-w-[1000px] border-collapse">
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50/50">
                      <TableHead className="w-28 border-r border-slate-100 text-center font-black text-slate-500 uppercase text-[10px] tracking-widest h-16">Heure</TableHead>
                      {daysOfWeek.map(day => (
                        <TableHead key={day} className="border-r border-slate-100 last:border-r-0 text-center font-black text-slate-800 uppercase text-xs tracking-tight h-16">{day}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? [...Array(6)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="border-r border-slate-50 p-6 text-center"><Skeleton className="h-10 w-20 mx-auto rounded-xl" /></TableCell>
                        {daysOfWeek.map(day => (
                          <TableCell key={day} className="border-r border-slate-50 last:border-r-0 p-3"><Skeleton className="h-28 w-full rounded-2xl" /></TableCell>
                        ))}
                      </TableRow>
                    )) : allTimeSlots.map(time => (
                      <TableRow key={time} className="hover:bg-white/30 transition-colors border-b border-slate-50">
                        <TableCell className="border-r border-slate-50 p-6 text-center align-middle font-black text-sm text-slate-400 bg-slate-50/30">{time}</TableCell>
                        {daysOfWeek.map(day => (
                          <DroppableCell key={`${day}-${time}`} day={day} time={time}>
                            {timetableGrid[time]?.[day]?.map(entry => {
                              const teacher = teachers.find(t => t.id === entry.teacherId);
                              const subjectInfo = subjects.find(s => s.name === entry.subject);
                              const classInfo = classes.find(c => c.id === entry.classId);
                              return (
                                <DraggableTimetableEntry
                                  key={entry.id}
                                  entry={entry}
                                  teacher={teacher}
                                  canManage={canManageClasses}
                                  color={entry.color || subjectInfo?.color}
                                  onEdit={handleOpenFormDialog}
                                  onDelete={(e) => {
                                    setEntryToDelete(e);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  showClass={selectedClassId === 'all'}
                                  classInfo={classInfo}
                                />
                              );
                            })}
                            {!isLoading && timetableGrid[time]?.[day]?.length === 0 && canManageClasses && (
                              <button 
                                className="absolute inset-0 w-full h-full opacity-0 hover:opacity-100 flex items-center justify-center bg-indigo-600/5 transition-all duration-300" 
                                onClick={() => handleOpenFormDialog(null, day, time)}
                                title="Ajouter un cours"
                                aria-label="Ajouter un cours"
                              >
                                <PlusCircle className="h-8 w-8 text-indigo-600/20" />
                              </button>
                            )}
                          </DroppableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-6 space-y-8">
                {daysOfWeek.map(day => {
                  const dayEntries = filteredTimetable.filter(e => e.day === day).sort((a,b) => a.startTime.localeCompare(b.startTime));
                  if (dayEntries.length === 0) return null;
                  return (
                    <div key={day} className="space-y-6">
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <span className="w-2 h-8 bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.3)]" />
                        {day}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {dayEntries.map(entry => {
                          const teacher = teachers.find(t => t.id === entry.teacherId);
                          const subjectInfo = subjects.find(s => s.name === entry.subject);
                          const classInfo = classes.find(c => c.id === entry.classId);
                          const color = entry.color || subjectInfo?.color || '#3b82f6';
                          return (
                            <div key={entry.id} className="group relative bg-white/50 backdrop-blur-sm p-6 rounded-3xl border border-white/60 hover:border-indigo-600/30 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-100 hover:-translate-y-1">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                  <SubjectColorIndicator color={color} className="h-12 w-1.5" />
                                  <div>
                                    <SubjectColorText color={color} className="text-xl font-black tracking-tight">{entry.subject}</SubjectColorText>
                                    <p className="text-sm font-black text-slate-400 font-mono tracking-tighter">{entry.startTime} — {entry.endTime}</p>
                                  </div>
                                </div>
                                {canManageClasses && (
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white" onClick={() => handleOpenFormDialog(entry)}>
                                      <PlusCircle className="h-5 w-5" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-3 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enseignant</p>
                                    <p className="text-sm font-bold text-slate-700">{teacher ? `${teacher.firstName} ${teacher.lastName}` : 'N/A'}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</p>
                                    <p className="text-sm font-black text-indigo-600">{classInfo?.name || 'N/A'}</p>
                                </div>
                                {entry.classroom && (
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salle</p>
                                        <p className="text-sm font-bold text-slate-500 italic">{entry.classroom}</p>
                                    </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!isLoading && filteredTimetable.length === 0 && (
              <div className="text-center py-24 flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center">
                  <LayoutGrid className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-semibold text-muted-foreground">Aucun cours trouvé</p>
                  <p className="text-sm text-muted-foreground/60 max-w-[300px] mx-auto">
                    {selectedClassId !== 'all' ? `Aucun cours n'est programmé pour la classe sélectionnée.` : `L'emploi du temps est vide pour le moment.`}
                  </p>
                </div>
                {canManageClasses && (
                  <Button variant="outline" onClick={() => handleOpenFormDialog(null)} className="mt-2">
                    Ajouter le premier cours
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drag Overlay for a smooth preview */}
        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.5',
              },
            },
          }),
        }}>
          {activeId && activeEntry ? <ActiveEntryOverlay entry={activeEntry} /> : null}
        </DragOverlay>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
            <div className="bg-rose-600 p-8 text-white">
                <AlertDialogTitle className="text-3xl font-black tracking-tight">Supprimer ce cours ?</AlertDialogTitle>
                <AlertDialogDescription className="text-rose-100 font-medium mt-2">
                    Cette action est irréversible. Le cours de <span className="font-black text-white">{entryToDelete?.subject}</span> sera définitivement retiré de l&apos;emploi du temps.
                </AlertDialogDescription>
            </div>
            <div className="p-8 bg-white flex justify-end gap-3">
              <AlertDialogCancel className="rounded-2xl border-slate-200 font-bold h-12 px-6">Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteEntry} className="bg-rose-600 hover:bg-rose-700 text-white rounded-2xl h-12 px-8 font-black shadow-lg shadow-rose-100">Supprimer</AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </DndContext>
  );
}







