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
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { class_type as Class, teacher as Teacher } from '@/lib/data-types';

// Define Zod schema for validation
const teacherSchema = z.object({
  firstName: z.string().min(1, { message: "Le prénom est requis." }),
  lastName: z.string().min(1, { message: "Le nom est requis." }),
  subject: z.string().min(1, { message: "La matière est requise." }),
  email: z.string().email({ message: "L\'adresse email est invalide." }),
  phone: z.string().optional(),
  classId: z.string().optional(),
});

type TeacherFormValues = z.infer<typeof teacherSchema>;

// Extend the imported Teacher type to include the ID
interface TeacherWithId extends Teacher {
  id: string;
}

export default function TeachersPage() {
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();

  // --- Firestore Data Hooks ---
  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/enseignants`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
  
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  
  const teachers: TeacherWithId[] = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as TeacherWithId)) || [], [teachersData]);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  // --- UI State ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // State for EDITING/DELETING a teacher
  const [editingTeacher, setEditingTeacher] = useState<TeacherWithId | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherWithId | null>(null);
  
  // --- React Hook Form ---
  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      subject: '',
      email: '',
      phone: '',
      classId: '',
    },
  });

  // Effect to reset form when dialog closes or editing teacher changes
  useEffect(() => {
    if (isFormOpen && editingTeacher) {
      form.reset({
          firstName: editingTeacher.firstName,
          lastName: editingTeacher.lastName,
          subject: editingTeacher.subject,
          email: editingTeacher.email,
          phone: editingTeacher.phone || '',
          classId: editingTeacher.classId || '',
      });
    } else {
      form.reset({
        firstName: '',
        lastName: '',
        subject: '',
        email: '',
        phone: '',
        classId: '',
      });
    }
  }, [isFormOpen, editingTeacher, form]);

  // --- Firestore Actions ---
  const getTeacherDocRef = (id: string) => {
    if (!schoolId) throw new Error("ID de l'école non disponible");
    return doc(firestore, `ecoles/${schoolId}/enseignants/${id}`);
  };

  const onSubmit = async (values: TeacherFormValues) => {
    if (!schoolId) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de déterminer l'école. Veuillez rafraîchir la page." });
      return;
    }

    const batch = writeBatch(firestore);
    const dataToSave = { ...values, classId: values.classId === 'none' ? '' : values.classId };
    
    try {
        if (editingTeacher) {
            // --- UPDATE ---
            const teacherDocRef = doc(firestore, `ecoles/${schoolId}/enseignants/${editingTeacher.id}`);
            batch.update(teacherDocRef, dataToSave);

            // If the classId has changed, update the old and new class documents
            if (editingTeacher.classId !== dataToSave.classId) {
                // Remove teacher from old class if it exists
                if (editingTeacher.classId) {
                    const oldClassRef = doc(firestore, `ecoles/${schoolId}/classes/${editingTeacher.classId}`);
                    batch.update(oldClassRef, { mainTeacherId: '' });
                }
                // Add teacher to new class if selected
                if (dataToSave.classId) {
                    const newClassRef = doc(firestore, `ecoles/${schoolId}/classes/${dataToSave.classId}`);
                    batch.update(newClassRef, { mainTeacherId: editingTeacher.id });
                }
            }
            await batch.commit();
            toast({ title: "Enseignant modifié", description: `Les informations de ${values.firstName} ${values.lastName} ont été mises à jour.` });
        } else {
            // --- CREATE ---
            const newTeacherRef = doc(collection(firestore, `ecoles/${schoolId}/enseignants`));
            batch.set(newTeacherRef, dataToSave);
            
            // If a class is assigned, update the class document with the new teacher's ID
            if (dataToSave.classId) {
                const classRef = doc(firestore, `ecoles/${schoolId}/classes/${dataToSave.classId}`);
                batch.update(classRef, { mainTeacherId: newTeacherRef.id });
            }
            await batch.commit();
            toast({ title: "Enseignant ajouté", description: `${values.firstName} ${values.lastName} a été ajouté(e).` });
        }
        setIsFormOpen(false);
        setEditingTeacher(null);
    } catch (error: any) {
        const operation = editingTeacher ? 'update' : 'create';
        const path = `[BATCH WRITE] /ecoles/${schoolId}/enseignants & /classes`;
        const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: values });
        errorEmitter.emit('permission-error', permissionError);
    }
  };
  
  const handleDeleteTeacher = () => {
    if (!schoolId || !teacherToDelete) return;
    
    const batch = writeBatch(firestore);
    const teacherDocRef = getTeacherDocRef(teacherToDelete.id);
    batch.delete(teacherDocRef);

    // If the teacher was a main teacher of a class, unset it
    if (teacherToDelete.classId) {
        const classRef = doc(firestore, `ecoles/${schoolId}/classes/${teacherToDelete.classId}`);
        batch.update(classRef, { mainTeacherId: '' });
    }

    batch.commit()
      .then(() => {
        toast({ title: "Enseignant supprimé", description: `${teacherToDelete.firstName} ${teacherToDelete.lastName} a été retiré(e).` });
        setIsDeleteDialogOpen(false);
        setTeacherToDelete(null);
      }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: teacherDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  // --- Dialog Triggers ---
  const handleOpenFormDialog = (teacher: TeacherWithId | null) => {
    setEditingTeacher(teacher);
    setIsFormOpen(true);
  };
  
  const handleOpenDeleteDialog = (teacher: TeacherWithId) => {
    setTeacherToDelete(teacher);
    setIsDeleteDialogOpen(true);
  };

  const isLoading = schoolLoading || teachersLoading || classesLoading;

  const getClassName = (classId?: string) => {
      if(!classId) return 'N/A';
      return classes.find(c => c.id === classId)?.name || 'N/A';
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
              <h1 className="text-lg font-semibold md:text-2xl">Liste des Enseignants</h1>
              <p className="text-muted-foreground">Gérez les enseignants de votre école.</p>
          </div>
            <Button onClick={() => handleOpenFormDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Enseignant
            </Button>
        </div>
        
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teachers.map((teacher) => {
              const fullName = `${teacher.firstName} ${teacher.lastName}`;
              const fallback = `${teacher.firstName?.[0] || ''}${teacher.lastName?.[0] || ''}`.toUpperCase();
              return (
                <Card key={teacher.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                              <AvatarImage src={`https://picsum.photos/seed/${teacher.id}/100`} alt={fullName} data-ai-hint="person face" />
                              <AvatarFallback>{fallback}</AvatarFallback>
                          </Avatar>
                          <div>
                              <Link href={`/dashboard/teachers/${teacher.id}`} className="hover:underline">
                                  <CardTitle>{fullName}</CardTitle>
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
                            <DropdownMenuItem onClick={() => handleOpenFormDialog(teacher)}>Modifier</DropdownMenuItem>
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
                          <span>Classe principale: <strong>{getClassName(teacher.classId)}</strong></span>
                     </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      
       <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingTeacher(null); }}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingTeacher ? "Modifier l'Enseignant" : "Ajouter un Nouvel Enseignant"}</DialogTitle>
              <DialogDescription>
                {editingTeacher ? `Mettez à jour les informations de ${editingTeacher.firstName} ${editingTeacher.lastName}.` : "Renseignez les informations du nouvel enseignant."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Prénom</FormLabel>
                      <FormControl className="col-span-3">
                        <Input placeholder="Ex: Marie" {...field} />
                      </FormControl>
                      <FormMessage className="col-start-2 col-span-3" />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Nom</FormLabel>
                      <FormControl className="col-span-3">
                        <Input placeholder="Ex: Curie" {...field} />
                      </FormControl>
                      <FormMessage className="col-start-2 col-span-3" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Matière</FormLabel>
                      <FormControl className="col-span-3">
                        <Input placeholder="Ex: Physique" {...field} />
                      </FormControl>
                      <FormMessage className="col-start-2 col-span-3" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Email</FormLabel>
                      <FormControl className="col-span-3">
                        <Input type="email" placeholder="Ex: m.curie@ecole.com" {...field} />
                      </FormControl>
                       <FormMessage className="col-start-2 col-span-3" />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Téléphone</FormLabel>
                      <FormControl className="col-span-3">
                        <Input type="tel" placeholder="Ex: +221 77... (optionnel)" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Classe princ.</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ''}
                      >
                        <FormControl className="col-span-3">
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une classe (optionnel)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Aucune</SelectItem>
                          {classes.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                </DialogFooter>
              </form>
            </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'enseignant <strong>{teacherToDelete?.firstName} {teacherToDelete?.lastName}</strong> sera définitivement supprimé.
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
