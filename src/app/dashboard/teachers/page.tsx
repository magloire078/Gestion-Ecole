
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockTeacherData } from "@/lib/data";
import { PlusCircle, MoreHorizontal, Mail, BookUser, Book } from "lucide-react";
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
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


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
  const [newTeacherClass, setNewTeacherClass] = useState('');
  
  useEffect(() => {
    if (editingTeacher) {
      setNewTeacherName(editingTeacher.name);
      setNewTeacherSubject(editingTeacher.subject);
      setNewTeacherEmail(editingTeacher.email);
      setNewTeacherClass(editingTeacher.class || '');
    }
  }, [editingTeacher]);

  const resetAddForm = () => {
    setNewTeacherName('');
    setNewTeacherSubject('');
    setNewTeacherEmail('');
    setNewTeacherClass('');
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
        description: "Le nom, la matière et l'email sont requis.",
      });
      return;
    }

    const newTeacher: Teacher = {
      id: `T${teachers.length + 1}`,
      name: newTeacherName,
      subject: newTeacherSubject,
      email: newTeacherEmail,
      class: newTeacherClass || undefined,
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
        description: "Le nom, la matière et l'email sont requis.",
      });
      return;
    }

    setTeachers(teachers.map(t => 
      t.id === editingTeacher.id 
        ? { ...t, name: newTeacherName, subject: newTeacherSubject, email: newTeacherEmail, class: newTeacherClass || undefined } 
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
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="add-teacher-class" className="text-right">
                    Classe princ.
                  </Label>
                  <Input id="add-teacher-class" value={newTeacherClass} onChange={(e) => setNewTeacherClass(e.target.value)} className="col-span-3" placeholder="Ex: Terminale A (optionnel)"/>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddTeacherDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleAddTeacher}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teachers.map((teacher) => {
            const fallback = teacher.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
            return (
              <Card key={teacher.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={`https://picsum.photos/seed/${teacher.id}/100`} alt={teacher.name} data-ai-hint="person face" />
                            <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        <div>
                            <Link href={`/dashboard/teachers/${teacher.id}`} className="hover:underline">
                                <CardTitle>{teacher.name}</CardTitle>
                            </Link>
                            <CardDescription>{teacher.subject}</CardDescription>
                        </div>
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
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
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground">
                   <div className="flex items-center">
                        <Mail className="mr-2 h-4 w-4" />
                        <a href={`mailto:${teacher.email}`} className="truncate hover:underline">{teacher.email}</a>
                   </div>
                   <div className="flex items-center">
                        <BookUser className="mr-2 h-4 w-4" />
                        <span>Classe principale: <strong>{teacher.class || 'N/A'}</strong></span>
                   </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-teacher-class" className="text-right">
                Classe princ.
              </Label>
              <Input id="edit-teacher-class" value={newTeacherClass} onChange={(e) => setNewTeacherClass(e.target.value)} className="col-span-3" />
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

    