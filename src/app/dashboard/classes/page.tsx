'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockClassData, mockTeacherData } from "@/lib/data";
import { PlusCircle, Users, User } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Teacher } from "@/lib/data";


export default function ClassesPage() {
  const [classes, setClasses] = useState(mockClassData);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newStudentCount, setNewStudentCount] = useState("");

  const getClassWithMainTeacher = (classId: string, teacherId?: string) => {
    const classInfo = classes.find(c => c.id === classId);
    if (!classInfo && !teacherId) return { classInfo: null, mainTeacher: null };
    const mainTeacher = mockTeacherData.find(t => t.id === (classInfo?.mainTeacherId || teacherId));
    return { classInfo, mainTeacher };
  };

  const handleAddClass = () => {
    if (!newClassName || !newTeacherId || !newStudentCount) {
        // Here you might want to show a toast or an error message.
        return;
    }

    const newClass = {
        id: `C${classes.length + 1}`,
        name: newClassName,
        mainTeacherId: newTeacherId,
        studentCount: parseInt(newStudentCount, 10),
        teacher: mockTeacherData.find(t => t.id === newTeacherId)?.name || 'N/A', //This is legacy
    };

    setClasses([...classes, newClass]);

    // Reset form and close dialog
    setNewClassName("");
    setNewTeacherId("");
    setNewStudentCount("");
    setIsDialogOpen(false);
  };


  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Gestion des Classes</h1>
            <p className="text-muted-foreground">Créez, visualisez et modifiez les classes de votre école.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
               <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une classe
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Ajouter une nouvelle classe</DialogTitle>
                <DialogDescription>
                  Renseignez les informations de la nouvelle classe.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nom
                  </Label>
                  <Input id="name" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="col-span-3" placeholder="Ex: Sixième A" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="teacher" className="text-right">
                    Prof. Principal
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
                  <Label htmlFor="students" className="text-right">
                    Nb. Élèves
                  </Label>
                  <Input id="students" type="number" value={newStudentCount} onChange={(e) => setNewStudentCount(e.target.value)} className="col-span-3" placeholder="Ex: 25"/>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleAddClass}>Ajouter la classe</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {classes.map((cls) => {
            const { mainTeacher } = getClassWithMainTeacher(cls.id);
            return (
              <Card key={cls.id} id={cls.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{cls.name}</CardTitle>
                  <CardDescription>ID de la classe: {cls.id}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 flex-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Prof. principal: {mainTeacher?.name || 'Non assigné'}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{cls.studentCount} élèves</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
