
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
import { mockTimetableData, mockTeacherData, mockClassData } from "@/lib/data";
import type { TimetableEntry, Teacher, Class } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function TimetablePage() {
  const [timetable, setTimetable] = useState<TimetableEntry[]>(mockTimetableData);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [newClassId, setNewClassId] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newSubject, setNewSubject] = useState("");
  
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<TimetableEntry | null>(null);

  const { toast } = useToast();

  const getTimetableDetails = (entries: TimetableEntry[]) => {
    return entries.map(entry => {
      const classInfo = mockClassData.find(c => c.id === entry.classId);
      const teacherInfo = mockTeacherData.find(t => t.id === entry.teacherId);
      return {
        ...entry,
        className: classInfo?.name || 'N/A',
        teacherName: teacherInfo?.name || 'N/A',
      };
    });
  };
  
  const timetableDetails = getTimetableDetails(timetable);

  const resetForm = () => {
    setNewClassId("");
    setNewTeacherId("");
    setNewSubject("");
  };

  const handleAddEntry = () => {
    if (!newClassId || !newTeacherId || !newSubject) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Tous les champs sont requis.",
      });
      return;
    }

    const newEntry: TimetableEntry = {
      id: `TT${timetable.length + 1}`,
      classId: newClassId,
      teacherId: newTeacherId,
      subject: newSubject,
    };

    setTimetable([...timetable, newEntry]);
    toast({
      title: "Entrée ajoutée",
      description: "La nouvelle entrée a été ajoutée à l'emploi du temps.",
    });

    resetForm();
    setIsAddDialogOpen(false);
  };
  
  const handleOpenEditDialog = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setNewClassId(entry.classId);
    setNewTeacherId(entry.teacherId);
    setNewSubject(entry.subject);
    setIsEditDialogOpen(true);
  };

  const handleEditEntry = () => {
    if (!editingEntry || !newClassId || !newTeacherId || !newSubject) {
       toast({
        variant: "destructive",
        title: "Erreur",
        description: "Tous les champs sont requis.",
      });
      return;
    }

    setTimetable(timetable.map(t => t.id === editingEntry.id ? {
      ...t,
      classId: newClassId,
      teacherId: newTeacherId,
      subject: newSubject,
    } : t));

    toast({
      title: "Entrée modifiée",
      description: "L'entrée de l'emploi du temps a été mise à jour.",
    });

    setIsEditDialogOpen(false);
    setEditingEntry(null);
    resetForm();
  };

  const handleOpenDeleteDialog = (entry: TimetableEntry) => {
    setEntryToDelete(entry);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteEntry = () => {
    if (!entryToDelete) return;
    
    setTimetable(timetable.filter(t => t.id !== entryToDelete.id));

    toast({
      title: "Entrée supprimée",
      description: "L'entrée a été supprimée de l'emploi du temps.",
    });

    setIsDeleteDialogOpen(false);
    setEntryToDelete(null);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Emploi du Temps</h1>
            <p className="text-muted-foreground">Consultez et gérez les attributions des enseignants par classe et par matière.</p>
          </div>
           <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
               if(!isOpen) resetForm();
               setIsAddDialogOpen(isOpen);
           }}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une Entrée
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Ajouter à l'Emploi du Temps</DialogTitle>
                <DialogDescription>
                  Sélectionnez une classe, un enseignant et une matière.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="class" className="text-right">
                    Classe
                  </Label>
                   <Select onValueChange={setNewClassId} value={newClassId}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Sélectionner une classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockClassData.map((cls: Class) => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="teacher" className="text-right">
                    Enseignant
                  </Label>
                   <Select onValueChange={setNewTeacherId} value={newTeacherId}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Sélectionner un enseignant" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockTeacherData.map((teacher: Teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="subject" className="text-right">
                    Matière
                  </Label>
                  <Input id="subject" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="col-span-3" placeholder="Ex: Mathématiques" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleAddEntry}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Card>
          <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Classe</TableHead>
                    <TableHead>Matière</TableHead>
                    <TableHead>Enseignant</TableHead>
                    <TableHead className="w-[50px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timetableDetails.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.className}</TableCell>
                      <TableCell>{entry.subject}</TableCell>
                      <TableCell>{entry.teacherName}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditDialog(entry)}>Modifier</DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleOpenDeleteDialog(entry)}
                            >
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>

       {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier l'Entrée</DialogTitle>
             <DialogDescription>
                  Mettez à jour la classe, l'enseignant ou la matière.
             </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-class" className="text-right">
                    Classe
                  </Label>
                   <Select onValueChange={setNewClassId} value={newClassId}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Sélectionner une classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockClassData.map((cls: Class) => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-teacher" className="text-right">
                    Enseignant
                  </Label>
                   <Select onValueChange={setNewTeacherId} value={newTeacherId}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Sélectionner un enseignant" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockTeacherData.map((teacher: Teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-subject" className="text-right">
                    Matière
                  </Label>
                  <Input id="edit-subject" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="col-span-3" />
                </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleEditEntry}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'entrée sera définitivement supprimée de l'emploi du temps.
            </AlertDialogDescription>
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
