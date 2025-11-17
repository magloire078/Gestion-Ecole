
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
import { PlusCircle, MoreHorizontal, Mail, BookUser, Phone } from "lucide-react";
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
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";

// Define TypeScript interface based on backend.json
interface Teacher {
  id: string;
  name: string;
  subject: string;
  email: string;
  phone?: string;
  class?: string;
}

export default function TeachersPage() {
  const firestore = useFirestore();
  const schoolId = 'test-school'; // Hardcoded for now

  // --- Firestore Data Hooks ---
  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/teachers`) : null, [firestore, schoolId]);
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);
  const teachers: Teacher[] = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Teacher)) || [], [teachersData]);

  const [isAddTeacherDialogOpen, setIsAddTeacherDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const { toast } = useToast();

  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPhone, setNewTeacherPhone] = useState('');
  const [newTeacherClass, setNewTeacherClass] = useState('');
  
  useEffect(() => {
    if (editingTeacher) {
      setNewTeacherName(editingTeacher.name);
      setNewTeacherSubject(editingTeacher.subject);
      setNewTeacherEmail(editingTeacher.email);
      setNewTeacherPhone(editingTeacher.phone || '');
      setNewTeacherClass(editingTeacher.class || '');
    }
  }, [editingTeacher]);

  const resetAddForm = () => {
    setNewTeacherName('');
    setNewTeacherSubject('');
    setNewTeacherEmail('');
    setNewTeacherPhone('');
    setNewTeacherClass('');
  };
  
  const getTeacherDocRef = (teacherId: string) => doc(firestore, `schools/${schoolId}/teachers/${teacherId}`);

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

    const newTeacherData = {
      name: newTeacherName,
      subject: newTeacherSubject,
      email: newTeacherEmail,
      phone: newTeacherPhone || '',
      class: newTeacherClass || '',
    };
    
    const teachersCollectionRef = collection(firestore, `schools/${schoolId}/teachers`);
    addDoc(teachersCollectionRef, newTeacherData)
      .then(() => {
        toast({
          title: "Enseignant ajouté",
          description: `${newTeacherName} a été ajouté(e) avec succès.`,
        });
        resetAddForm();
        setIsAddTeacherDialogOpen(false);
      }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: teachersCollectionRef.path, operation: 'create', requestResourceData: newTeacherData });
        errorEmitter.emit('permission-error', permissionError);
      });
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

    const teacherDocRef = getTeacherDocRef(editingTeacher.id);
    const updatedData = {
      name: newTeacherName,
      subject: newTeacherSubject,
      email: newTeacherEmail,
      phone: newTeacherPhone || '',
      class: newTeacherClass || '',
    };
    
    setDoc(teacherDocRef, updatedData, { merge: true })
      .then(() => {
        toast({
          title: "Enseignant modifié",
          description: `Les informations de ${newTeacherName} ont été mises à jour.`,
        });
        setIsEditDialogOpen(false);
        setEditingTeacher(null);
      }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: teacherDocRef.path, operation: 'update', requestResourceData: updatedData });
        errorEmitter.emit('permission-error', permissionError);
      });
  };
  
  const handleDeleteTeacher = () => {
    if (!teacherToDelete) return;
    
    const teacherDocRef = getTeacherDocRef(teacherToDelete.id);
    deleteDoc(teacherDocRef)
      .then(() => {
        toast({
          title: "Enseignant supprimé",
          description: `${teacherToDelete.name} a été retiré(e) de la liste.`,
        });
        setIsDeleteDialogOpen(false);
        setTeacherToDelete(null);
      }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: teacherDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
      });
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
                  <Label htmlFor="add-teacher-phone" className="text-right">
                    Téléphone
                  </Label>
                  <Input id="add-teacher-phone" type="tel" value={newTeacherPhone} onChange={(e) => setNewTeacherPhone(e.target.value)} className="col-span-3" placeholder="Ex: +221 77... (optionnel)"/>
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
        
        {teachersLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
          </div>
        ) : (
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
                      {teacher.phone && (
                          <div className="flex items-center">
                              <Phone className="mr-2 h-4 w-4" />
                              <a href={`tel:${teacher.phone}`} className="truncate hover:underline">{teacher.phone}</a>
                          </div>
                      )}
                     <div className="flex items-center">
                          <BookUser className="mr-2 h-4 w-4" />
                          <span>Classe principale: <strong>{teacher.class || 'N/A'}</strong></span>
                     </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
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
                <Label htmlFor="edit-teacher-phone" className="text-right">
                Téléphone
                </Label>
                <Input id="edit-teacher-phone" type="tel" value={newTeacherPhone} onChange={(e) => setNewTeacherPhone(e.target.value)} className="col-span-3" />
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

    