
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockClassData, mockTeacherData } from "@/lib/data";
import { PlusCircle, Users, User, Building, MoreHorizontal } from "lucide-react";
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
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Teacher, Class } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const cycles = ['Lycée', 'Collège'];

export default function ClassesPage() {
  const [classes, setClasses] = useState(mockClassData);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [newClassName, setNewClassName] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newStudentCount, setNewStudentCount] = useState("");
  const [newBuilding, setNewBuilding] = useState("");
  const [newCycle, setNewCycle] = useState("");

  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [classToDelete, setClassToDelete] = useState<Class | null>(null);

  const { toast } = useToast();

  const getMainTeacher = (teacherId?: string) => {
    if (!teacherId) return null;
    return mockTeacherData.find(t => t.id === teacherId);
  };

  const resetAddDialog = () => {
    setNewClassName("");
    setNewTeacherId("");
    setNewStudentCount("");
    setNewBuilding("");
    setNewCycle("");
  }

  const handleAddClass = () => {
    if (!newClassName || !newTeacherId || !newStudentCount || !newBuilding || !newCycle) {
        toast({
            variant: "destructive",
            title: "Erreur",
            description: "Tous les champs sont requis."
        });
        return;
    }

    const newClass: Class = {
        id: `C${classes.length + 1}`,
        name: newClassName,
        mainTeacherId: newTeacherId,
        studentCount: parseInt(newStudentCount, 10),
        building: newBuilding,
        cycle: newCycle,
    };

    setClasses([...classes, newClass]);
    toast({
        title: "Classe ajoutée",
        description: `La classe ${newClassName} a été créée avec succès.`,
    });

    resetAddDialog();
    setIsAddDialogOpen(false);
  };
  
  const handleOpenEditDialog = (cls: Class) => {
    setEditingClass(cls);
    setNewClassName(cls.name);
    setNewTeacherId(cls.mainTeacherId);
    setNewStudentCount(String(cls.studentCount));
    setNewBuilding(cls.building);
    setNewCycle(cls.cycle);
    setIsEditDialogOpen(true);
  };

  const handleEditClass = () => {
    if (!editingClass || !newClassName || !newTeacherId || !newStudentCount || !newBuilding || !newCycle) {
       toast({
            variant: "destructive",
            title: "Erreur",
            description: "Tous les champs sont requis."
        });
      return;
    }
    
    setClasses(classes.map(c => c.id === editingClass.id ? {
      ...c,
      name: newClassName,
      mainTeacherId: newTeacherId,
      studentCount: parseInt(newStudentCount, 10),
      building: newBuilding,
      cycle: newCycle,
    } : c));

    toast({
      title: "Classe modifiée",
      description: `Les informations de la classe ${newClassName} ont été mises à jour.`,
    });
    
    setIsEditDialogOpen(false);
    setEditingClass(null);
  }

  const handleOpenDeleteDialog = (cls: Class) => {
    setClassToDelete(cls);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteClass = () => {
    if (!classToDelete) return;

    setClasses(classes.filter(c => c.id !== classToDelete.id));

    toast({
      title: "Classe supprimée",
      description: `La classe ${classToDelete.name} a été supprimée.`,
    });

    setIsDeleteDialogOpen(false);
    setClassToDelete(null);
  }


  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Gestion des Classes</h1>
            <p className="text-muted-foreground">Créez, visualisez et modifiez les classes de votre école par cycle.</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
            if(!isOpen) resetAddDialog();
            setIsAddDialogOpen(isOpen);
          }}>
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
                  <Label htmlFor="building" className="text-right">
                    Bâtiment
                  </Label>
                  <Input id="building" value={newBuilding} onChange={(e) => setNewBuilding(e.target.value)} className="col-span-3" placeholder="Ex: Bâtiment A" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cycle" className="text-right">
                    Cycle
                  </Label>
                   <Select onValueChange={setNewCycle} value={newCycle}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Sélectionner un cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      {cycles.map((cycle) => (
                        <SelectItem key={cycle} value={cycle}>{cycle}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleAddClass}>Ajouter la classe</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue={cycles[0]} className="space-y-4">
            <TabsList>
                {cycles.map((cycle) => (
                    <TabsTrigger key={cycle} value={cycle}>{cycle}</TabsTrigger>
                ))}
            </TabsList>
            {cycles.map((cycle) => (
                <TabsContent key={cycle} value={cycle}>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {classes.filter(c => c.cycle === cycle).map((cls) => {
                            const mainTeacher = getMainTeacher(cls.mainTeacherId);
                            return (
                            <Card key={cls.id} id={cls.id} className="flex flex-col">
                                <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>{cls.name}</CardTitle>
                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleOpenEditDialog(cls)}>Modifier</DropdownMenuItem>
                                        <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={() => handleOpenDeleteDialog(cls)}
                                        >
                                        Supprimer
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <CardDescription>ID de la classe: {cls.id}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 flex-1">
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Building className="mr-2 h-4 w-4 flex-shrink-0" />
                                    <span>Bâtiment: {cls.building}</span>
                                </div>
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
                 </TabsContent>
            ))}
        </Tabs>
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier la classe</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations de la classe <strong>{editingClass?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Nom
              </Label>
              <Input id="edit-name" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-building" className="text-right">
                Bâtiment
              </Label>
              <Input id="edit-building" value={newBuilding} onChange={(e) => setNewBuilding(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-cycle" className="text-right">
                Cycle
              </Label>
               <Select onValueChange={setNewCycle} value={newCycle}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Sélectionner un cycle" />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map((cycle) => (
                    <SelectItem key={cycle} value={cycle}>{cycle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-teacher" className="text-right">
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
              <Label htmlFor="edit-students" className="text-right">
                Nb. Élèves
              </Label>
              <Input id="edit-students" type="number" value={newStudentCount} onChange={(e) => setNewStudentCount(e.target.value)} className="col-span-3"/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleEditClass}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La classe <strong>{classToDelete?.name}</strong> sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClass} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
