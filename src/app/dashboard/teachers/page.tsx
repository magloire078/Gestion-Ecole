
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
import { useSchoolData } from "@/hooks/use-school-data";
import { useAuthProtection } from '@/hooks/use-auth-protection.tsx';

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
  const { isLoading: isAuthLoading, AuthProtectionLoader } = useAuthProtection();
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();

  // --- Firestore Data Hooks ---
  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/enseignants`) : null, [firestore, schoolId]);
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);
  const teachers: Teacher[] = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Teacher)) || [], [teachersData]);

  // --- UI State ---
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  
  const [formState, setFormState] = useState<Partial<Teacher>>({
    name: '', subject: '', email: '', phone: '', class: ''
  });

  // --- Form Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormState({ name: '', subject: '', email: '', phone: '', class: '' });
  };
  
  // --- Firestore Actions ---
  const getTeacherDocRef = (teacherId: string) => doc(firestore, `ecoles/${schoolId}/enseignants/${teacherId}`);

  const handleAddTeacher = () => {
    if (!schoolId || !formState.name || !formState.subject || !formState.email) {
      toast({ variant: "destructive", title: "Erreur", description: "Le nom, la matière et l'email sont requis." });
      return;
    }

    const newTeacherData = {
      name: formState.name,
      subject: formState.subject,
      email: formState.email,
      phone: formState.phone || '',
      class: formState.class || '',
    };
    
    const teachersCollectionRef = collection(firestore, `ecoles/${schoolId}/enseignants`);
    addDoc(teachersCollectionRef, newTeacherData)
      .then(() => {
        toast({ title: "Enseignant ajouté", description: `${formState.name} a été ajouté(e).` });
        resetForm();
        setIsAddDialogOpen(false);
      }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: teachersCollectionRef.path, operation: 'create', requestResourceData: newTeacherData });
        errorEmitter.emit('permission-error', permissionError);
      });
  };
  
  const handleEditTeacher = () => {
    if (!schoolId || !editingTeacher || !formState.name || !formState.subject || !formState.email) {
      toast({ variant: "destructive", title: "Erreur", description: "Le nom, la matière et l'email sont requis." });
      return;
    }

    const teacherDocRef = getTeacherDocRef(editingTeacher.id);
    const updatedData = {
      name: formState.name,
      subject: formState.subject,
      email: formState.email,
      phone: formState.phone || '',
      class: formState.class || '',
    };
    
    setDoc(teacherDocRef, updatedData, { merge: true })
      .then(() => {
        toast({ title: "Enseignant modifié", description: `Les informations de ${formState.name} ont été mises à jour.` });
        setIsEditDialogOpen(false);
      }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: teacherDocRef.path, operation: 'update', requestResourceData: updatedData });
        errorEmitter.emit('permission-error', permissionError);
      });
  };
  
  const handleDeleteTeacher = () => {
    if (!schoolId || !teacherToDelete) return;
    
    const teacherDocRef = getTeacherDocRef(teacherToDelete.id);
    deleteDoc(teacherDocRef)
      .then(() => {
        toast({ title: "Enseignant supprimé", description: `${teacherToDelete.name} a été retiré(e).` });
        setIsDeleteDialogOpen(false);
        setTeacherToDelete(null);
      }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: teacherDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  // --- Dialog Triggers ---
  const handleOpenEditDialog = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormState(teacher);
    setIsEditDialogOpen(true);
  };
  
  const handleOpenDeleteDialog = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setIsDeleteDialogOpen(true);
  };

  const isLoading = schoolLoading || teachersLoading;

  if (isAuthLoading) {
    return <AuthProtectionLoader />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
              <h1 className="text-lg font-semibold md:text-2xl">Liste des Enseignants</h1>
              <p className="text-muted-foreground">Gérez les enseignants de votre école.</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => { setIsAddDialogOpen(isOpen); if (!isOpen) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Enseignant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Ajouter un Nouvel Enseignant</DialogTitle>
                <DialogDescription>Renseignez les informations du nouvel enseignant.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Nom</Label>
                  <Input id="name" name="name" value={formState.name} onChange={handleInputChange} className="col-span-3" placeholder="Ex: Marie Curie" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="subject" className="text-right">Matière</Label>
                   <Input id="subject" name="subject" value={formState.subject} onChange={handleInputChange} className="col-span-3" placeholder="Ex: Physique"/>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <Input id="email" name="email" type="email" value={formState.email} onChange={handleInputChange} className="col-span-3" placeholder="Ex: m.curie@ecole.com"/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">Téléphone</Label>
                  <Input id="phone" name="phone" type="tel" value={formState.phone} onChange={handleInputChange} className="col-span-3" placeholder="Ex: +221 77... (optionnel)"/>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="class" className="text-right">Classe princ.</Label>
                  <Input id="class" name="class" value={formState.class} onChange={handleInputChange} className="col-span-3" placeholder="Ex: Terminale A (optionnel)"/>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleAddTeacher}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {isLoading ? (
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
                          <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(teacher)}>Supprimer</DropdownMenuItem>
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
      
       <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { setIsEditDialogOpen(isOpen); if (!isOpen) setEditingTeacher(null); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier l'Enseignant</DialogTitle>
            <DialogDescription>Mettez à jour les informations de <strong>{editingTeacher?.name}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">Nom</Label>
              <Input id="edit-name" name="name" value={formState.name} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-subject" className="text-right">Matière</Label>
              <Input id="edit-subject" name="subject" value={formState.subject} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">Email</Label>
              <Input id="edit-email" name="email" type="email" value={formState.email} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-phone" className="text-right">Téléphone</Label>
                <Input id="edit-phone" name="phone" type="tel" value={formState.phone} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-class" className="text-right">Classe princ.</Label>
              <Input id="edit-class" name="class" value={formState.class} onChange={handleInputChange} className="col-span-3" />
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
