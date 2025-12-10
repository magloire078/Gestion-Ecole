
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PlusCircle, Bot, Smile, Meh, Frown, MoreHorizontal, Eye, MessageSquare, Search, Printer, Upload, Download } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TuitionStatusBadge } from "@/components/tuition-status-badge";
import Link from "next/link";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { useSchoolData } from "@/hooks/use-school-data";
import { differenceInYears, differenceInMonths, addYears } from "date-fns";
import { useHydrationFix } from "@/hooks/use-hydration-fix";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { analyzeAndSummarizeFeedback, AnalyzeAndSummarizeFeedbackOutput } from '@/ai/flows/analyze-and-summarize-feedback';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { student as Student, class_type as Class } from "@/lib/data-types";

const studentSchema = z.object({
    firstName: z.string().min(1, { message: "Le prénom est requis." }),
    lastName: z.string().min(1, { message: "Le nom est requis." }),
    classId: z.string().min(1, { message: "La classe est requise." }),
    dateOfBirth: z.string().min(1, { message: "La date de naissance est requise." }),
    amountDue: z.coerce.number().min(0, "Le montant dû ne peut pas être négatif."),
    tuitionStatus: z.enum(['Soldé', 'En retard', 'Partiel']),
    status: z.enum(['Actif', 'En attente', 'Radié']),
    feedback: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

const getStatusBadgeVariant = (status: Student['status']) => {
    switch (status) {
        case 'Actif':
            return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
        case 'Radié':
            return 'bg-destructive/80 text-destructive-foreground';
        case 'En attente':
            return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
        default:
            return 'bg-secondary text-secondary-foreground';
    }
};

export default function StudentsPage() {
  const isMounted = useHydrationFix();
  const router = useRouter();
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();

  const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/eleves`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);

  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  
  const allStudents: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const [searchTerm, setSearchTerm] = useState("");
  const students = useMemo(() => {
    return allStudents.filter(student =>
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allStudents, searchTerm]);


  // Edit Student State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Delete Student State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  
    // AI Analysis State
  const [analysisResult, setAnalysisResult] = useState<AnalyzeAndSummarizeFeedbackOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
        firstName: '',
        lastName: '',
        classId: '',
        dateOfBirth: '',
        amountDue: 0,
        tuitionStatus: 'Partiel',
        status: 'Actif',
        feedback: '',
    }
  });

  useEffect(() => {
    if(isEditDialogOpen && editingStudent) {
      form.reset({
        firstName: editingStudent.firstName,
        lastName: editingStudent.lastName,
        classId: editingStudent.classId,
        feedback: editingStudent.feedback || '',
        amountDue: editingStudent.amountDue || 0,
        tuitionStatus: editingStudent.tuitionStatus || 'Partiel',
        status: editingStudent.status || 'Actif',
        dateOfBirth: editingStudent.dateOfBirth,
      });
    } else {
        form.reset();
    }
    setAnalysisResult(null); // Clear analysis when dialog opens/closes
  }, [editingStudent, isEditDialogOpen, form]);
  
  const handleOpenEditDialog = (student: Student) => {
    setEditingStudent(student);
    setIsEditDialogOpen(true);
  };

  const handleEditStudent = (values: StudentFormValues) => {
    if (!schoolId || !editingStudent) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de modifier l'élève." });
      return;
    }
    
    const studentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${editingStudent.id}`);
    const selectedClassInfo = classes.find(c => c.id === values.classId);
    
    const updatedData = {
      firstName: values.firstName,
      lastName: values.lastName,
      classId: values.classId,
      class: selectedClassInfo?.name || 'N/A',
      cycle: selectedClassInfo?.cycle || editingStudent.cycle,
      feedback: values.feedback || '',
      amountDue: values.amountDue,
      tuitionStatus: values.tuitionStatus,
      status: values.status,
      dateOfBirth: values.dateOfBirth,
    };
    
    setDoc(studentDocRef, updatedData, { merge: true })
    .then(() => {
        toast({ title: "Élève modifié", description: `Les informations de ${values.firstName} ${values.lastName} ont été mises à jour.` });
        setIsEditDialogOpen(false);
        setEditingStudent(null);
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: studentDocRef.path, operation: 'update', requestResourceData: updatedData });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleOpenDeleteDialog = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteStudent = () => {
    if (!schoolId || !studentToDelete) return;

    const studentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${studentToDelete.id}`);
    deleteDoc(studentDocRef)
    .then(() => {
        toast({ title: "Élève supprimé", description: `L'élève ${studentToDelete.firstName} ${studentToDelete.lastName} a été supprimé(e).` });
        setIsDeleteDialogOpen(false);
        setStudentToDelete(null);
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: studentDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
    });
  }
  
  const handleAnalyzeFeedback = async () => {
    const feedbackText = form.getValues('feedback');
    if (!feedbackText) {
        toast({ variant: 'destructive', title: "Aucun texte", description: "Le champ d'appréciation est vide."});
        return;
    }
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
        const result = await analyzeAndSummarizeFeedback({ feedbackText });
        setAnalysisResult(result);
    } catch (error) {
        console.error("AI analysis failed:", error);
        toast({ variant: 'destructive', title: "Erreur d'analyse", description: "L'analyse par IA a échoué."});
    } finally {
        setIsAnalyzing(false);
    }
  };
  
  const getAge = (dateOfBirth: string | undefined) => {
    if (!dateOfBirth) return 'N/A';
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      const years = differenceInYears(today, birthDate);
      const monthDate = addYears(birthDate, years);
      const months = differenceInMonths(today, monthDate);
      
      let ageString = `${years} an${years > 1 ? 's' : ''}`;
      if (months > 0) {
        ageString += ` ${months} mois`;
      }
      return ageString;
    } catch {
      return 'N/A';
    }
  }

  const formatCurrency = (value: number) => `${value.toLocaleString('fr-FR')} CFA`;

  const isLoading = schoolLoading || studentsLoading || classesLoading;
  
  const renderSentiment = (sentiment: string) => {
    const sentimentLower = sentiment.toLowerCase();
    if (sentimentLower === 'positif') {
        return <span className="flex items-center gap-1 text-emerald-600"><Smile className="h-4 w-4" /> Positif</span>
    }
    if (sentimentLower === 'négatif') {
        return <span className="flex items-center gap-1 text-red-600"><Frown className="h-4 w-4" /> Négatif</span>
    }
    return <span className="flex items-center gap-1 text-gray-600"><Meh className="h-4 w-4" /> Neutre</span>
  };
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="space-y-6 print:space-y-0" id="students-page">
        <div className="flex justify-between items-center gap-4 print:hidden">
            <div>
              <h1 className="text-lg font-semibold md:text-2xl">Liste des Élèves ({students.length})</h1>
              <p className="text-muted-foreground">Consultez et gérez les élèves inscrits.</p>
            </div>
            <Button onClick={() => router.push('/dashboard/inscription')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Inscription
            </Button>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 print:hidden">
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Chercher par nom ou matricule..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => toast({title: "Bientôt disponible", description: "L'importation de données sera bientôt disponible."})}>
                    <Upload className="mr-2 h-4 w-4" /> Importer
                </Button>
                <Button variant="outline" onClick={() => toast({title: "Bientôt disponible", description: "L'exportation de données sera bientôt disponible."})}>
                    <Download className="mr-2 h-4 w-4" /> Exporter
                </Button>
                 <Button variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimer
                </Button>
            </div>
        </div>
          <Card>
              <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">N°</TableHead>
                        <TableHead>Élève</TableHead>
                        <TableHead>Classe</TableHead>
                        <TableHead>Âge</TableHead>
                        <TableHead>Sexe</TableHead>
                        <TableHead className="text-center">Statut</TableHead>
                        <TableHead className="text-center">Paiement</TableHead>
                        <TableHead className="text-right print:hidden">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        [...Array(5)].map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-8"/></TableCell>
                            <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-32"/><Skeleton className="h-3 w-24"/></div></div></TableCell>
                            <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto"/></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto"/></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto"/></TableCell>
                          </TableRow>
                        ))
                      ) : students.length > 0 ? (
                        students.map((student, index) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 print:hidden">
                                    <AvatarImage src={student.photoUrl || `https://picsum.photos/seed/${student.id}/100`} alt={`${student.firstName} ${student.lastName}`} data-ai-hint="person face" />
                                    <AvatarFallback>{`${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <Link href={`/dashboard/dossiers-eleves/${student.id}`} className="hover:underline">
                                        <p className="font-medium">{student.firstName} ${student.lastName}</p>
                                    </Link>
                                    <div className="text-xs text-muted-foreground font-mono">{student.matricule || student.id.substring(0,8)}</div>
                                </div>
                            </div>
                          </TableCell>
                          <TableCell>{student.class}</TableCell>
                          <TableCell>{isMounted ? getAge(student.dateOfBirth) : <Skeleton className="h-5 w-16"/>}</TableCell>
                          <TableCell>{student.gender?.charAt(0)}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn("border-transparent", getStatusBadgeVariant(student.status || 'Actif'))}>{student.status || 'Actif'}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                              <TuitionStatusBadge status={student.tuitionStatus || 'Partiel'} />
                          </TableCell>
                          <TableCell className="text-right print:hidden">
                            <div className="flex justify-end gap-2">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-9 w-9">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                   <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}`)}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Voir le dossier
                                    </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenEditDialog(student)}>Modifier</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleOpenDeleteDialog(student)}
                                  >
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center">Aucun élève trouvé.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
              </CardContent>
          </Card>
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
          setIsEditDialogOpen(isOpen);
          if (!isOpen) setEditingStudent(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l'Élève</DialogTitle>
            <DialogDescription>
                Mettez à jour les informations de <strong>{editingStudent?.firstName} {editingStudent?.lastName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form id="edit-student-form" onSubmit={form.handleSubmit(handleEditStudent)} className="grid gap-4 py-4">
               <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                        <Input {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Prénom</FormLabel>
                        <FormControl>
                        <Input {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de naissance</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classe</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut Élève</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                       <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Actif">Actif</SelectItem>
                        <SelectItem value="En attente">En attente</SelectItem>
                        <SelectItem value="Radié">Radié</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amountDue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Solde (CFA)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tuitionStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut Paiement</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                       <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Soldé">Soldé</SelectItem>
                        <SelectItem value="En retard">En retard</SelectItem>
                        <SelectItem value="Partiel">Partiel</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appréciation</FormLabel>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <FormControl>
                                <Textarea {...field} />
                            </FormControl>
                            <Button type="button" variant="outline" size="icon" onClick={handleAnalyzeFeedback} disabled={isAnalyzing}>
                                <Bot className="h-4 w-4" />
                            </Button>
                        </div>
                        {isAnalyzing && <p className="text-xs text-muted-foreground">Analyse en cours...</p>}
                        {analysisResult && (
                             <Card className="bg-muted/50 text-xs">
                                <CardHeader className="p-3">
                                    <CardTitle className="text-sm flex justify-between items-center">
                                        <span>Analyse IA</span>
                                        {renderSentiment(analysisResult.sentiment)}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-0">
                                    <p><strong>Résumé:</strong> {analysisResult.summary}</p>
                                    <p className="mt-2"><strong>Points d'amélioration:</strong> {analysisResult.keyImprovementAreas}</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
            <Button type="submit" form="edit-student-form" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'élève <strong>{studentToDelete?.firstName} {studentToDelete?.lastName}</strong> sera définitivement supprimé(e).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStudent} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
