
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { mockTeacherData } from "@/lib/data";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
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
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Teacher } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>(mockTeacherData);
  const [isAddTeacherDialogOpen, setIsAddTeacherDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const { toast } = useToast();

  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  
  useEffect(() => {
    if (editingTeacher) {
      setNewTeacherName(editingTeacher.name);
      setNewTeacherSubject(editingTeacher.subject);
      setNewTeacherEmail(editingTeacher.email);
    }
  }, [editingTeacher]);

  const resetAddForm = () => {
    setNewTeacherName('');
    setNewTeacherSubject('');
    setNewTeacherEmail('');
  };
  
  const handleOpenDeleteDialog = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setIsDeleteDialogOpen(true);
  };
  
  const handleOpenEditDialog = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setIsEditDialogOpen(true);
  };

  const handleAddTeacher = () => {
    if (!newTeacherName || !newTeacherSubject || !newTeacherEmail) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Tous les champs sont requis.",
      });
      return;
    }

    const newTeacher: Teacher = {
      id: `T${teachers.length + 1}`,
      name: newTeacherName,
      subject: newTeacherSubject,
      email: newTeacherEmail,
    };

    setTeachers([...teachers, newTeacher]);

    toast({
      title: "Enseignant ajouté",
      description: `${newTeacherName} a été ajouté(e) avec succès.`,
    });

    resetAddForm();
    setIsAddTeacherDialogOpen(false);
  };
  
  const handleEditTeacher = () => {
    if (!editingTeacher || !newTeacherName || !newTeacherSubject || !newTeacherEmail) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Tous les champs sont requis.",
      });
      return;
    }

    setTeachers(teachers.map(t => 
      t.id === editingTeacher.id 
        ? { ...t, name: newTeacherName, subject: newTeacherSubject, email: newTeacherEmail } 
        : t
    ));

    toast({
      title: "Enseignant modifié",
      description: `Les informations de ${newTeacherName} ont été mises à jour.`,
    });
    
    setIsEditDialogOpen(false);
    setEditingTeacher(null);
  };
  
  const handleDeleteTeacher = () => {
    if (!teacherToDelete) return;
    
    setTeachers(teachers.filter(t => t.id !== teacherToDelete.id));

    toast({
      title: "Enseignant supprimé",
      description: `${teacherToDelete.name} a été retiré(e) de la liste.`,
    });

    setIsDeleteDialogOpen(false);
    setTeacherToDelete(null);
  };


  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
              <h1 className="text-lg font-semibold md:text-2xl">Liste des Enseignants</h1>
              <p className="text-muted-foreground">Gérez les enseignants de votre école.</p>
          </div>
          <Dialog open={isAddTeacherDialogOpen} onOpenChange={(isOpen) => {
            setIsAddTeacherDialogOpen(isOpen);
            if (!isOpen) {
              resetAddForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un enseignant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Ajouter un nouvel enseignant</DialogTitle>
                <DialogDescription>
                  Renseignez les informations du nouvel enseignant.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="add-teacher-name" className="text-right">
                    Nom
                  </Label>
                  <Input id="add-teacher-name" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} className="col-span-3" placeholder="Ex: Marie Curie" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="add-teacher-subject" className="text-right">
                    Matière
                  </Label>
                   <Input id="add-teacher-subject" value={newTeacherSubject} onChange={(e) => setNewTeacherSubject(e.target.value)} className="col-span-3" placeholder="Ex: Physique"/>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="add-teacher-email" className="text-right">
                    Email
                  </Label>
                  <Input id="add-teacher-email" type="email" value={newTeacherEmail} onChange={(e) => setNewTeacherEmail(e.target.value)} className="col-span-3" placeholder="Ex: m.curie@ecole.com"/>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddTeacherDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleAddTeacher}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead className="hidden md:table-cell">Classe Principale</TableHead>
                    <TableHead className="hidden lg:table-cell">Matière</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/teachers/${teacher.id}`} className="hover:underline text-primary">
                          {teacher.name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{teacher.class || 'N/A'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{teacher.subject}</TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditDialog(teacher)}>Modifier</DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleOpenDeleteDialog(teacher)}
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
      
       <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
          setIsEditDialogOpen(isOpen);
          if (!isOpen) {
            setEditingTeacher(null);
          }
        }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier l'enseignant</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations de <strong>{editingTeacher?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-teacher-name" className="text-right">
                Nom
              </Label>
              <Input id="edit-teacher-name" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-teacher-subject" className="text-right">
                Matière
              </Label>
              <Input id="edit-teacher-subject" value={newTeacherSubject} onChange={(e) => setNewTeacherSubject(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-teacher-email" className="text-right">
                Email
              </Label>
              <Input id="edit-teacher-email" type="email" value={newTeacherEmail} onChange={(e) => setNewTeacherEmail(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleEditTeacher}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'enseignant <strong>{teacherToDelete?.name}</strong> sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeacher} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
