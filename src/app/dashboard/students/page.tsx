
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
import { PlusCircle, Bot, Smile, Meh, Frown, MoreHorizontal } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { analyzeAndSummarizeFeedback } from "@/ai/flows/analyze-and-summarize-feedback";
import { useToast } from "@/hooks/use-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TuitionStatusBadge } from "@/components/tuition-status-badge";
import Link from "next/link";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { useAuthProtection } from '@/hooks/use-auth-protection';
import { useSchoolData } from "@/hooks/use-school-data";

interface Student {
  id: string;
  name: string;
  class: string;
  classId: string;
  cycle: string;
  feedback: string;
  tuitionStatus: TuitionStatus;
  amountDue: number;
}

interface Class {
    id: string;
    name: string;
    cycle: string;
}

type AnalysisResult = {
    sentiment: Sentiment;
    summary: string;
    keyImprovementAreas: string;
};

type TuitionStatus = 'Soldé' | 'En retard' | 'Partiel';
type Sentiment = 'Positif' | 'Neutre' | 'Négatif';

const SentimentDisplay = ({ sentiment }: { sentiment: Sentiment }) => {
    const sentimentConfig = {
      Positif: { icon: Smile, color: 'text-emerald-500', label: 'Positif' },
      Neutre: { icon: Meh, color: 'text-amber-500', label: 'Neutre' },
      Négatif: { icon: Frown, color: 'text-red-500', label: 'Négatif' },
    };

    const { icon: Icon, color, label } = sentimentConfig[sentiment] || sentimentConfig.Neutre;

    return (
        <div className={`flex items-center gap-2 font-semibold ${color}`}>
            <Icon className="h-5 w-5" />
            <span>{label}</span>
        </div>
    );
};


export default function StudentsPage() {
  const { isLoading: isAuthLoading, AuthProtectionLoader } = useAuthProtection();
  const router = useRouter();
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/eleves`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);

  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  
  const students: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const [feedbackText, setFeedbackText] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  // Edit Student State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formState, setFormState] = useState<Partial<Student>>({});

  // Delete Student State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if(editingStudent) {
      setFormState({
        name: editingStudent.name,
        classId: editingStudent.classId,
        feedback: editingStudent.feedback,
        amountDue: editingStudent.amountDue,
        tuitionStatus: editingStudent.tuitionStatus,
      });
    }
  }, [editingStudent]);

  const handleAnalyzeFeedback = async () => {
    if (!feedbackText.trim()) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeAndSummarizeFeedback({ feedbackText });
      setAnalysisResult({
          sentiment: result.sentiment as Sentiment,
          summary: result.summary,
          keyImprovementAreas: result.keyImprovementAreas,
      });
      toast({
        title: "Analyse terminée",
        description: "Le feedback a été analysé avec succès.",
      });
    } catch (error) {
      console.error("Failed to analyze feedback:", error);
      toast({
        variant: "destructive",
        title: "Erreur d'analyse",
        description: "Impossible de générer l'analyse du feedback.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleOpenEditDialog = (student: Student) => {
    setEditingStudent(student);
    setIsEditDialogOpen(true);
  };

  const handleEditStudent = () => {
    if (!schoolId || !editingStudent || !formState.name || !formState.classId) {
      toast({ variant: "destructive", title: "Erreur", description: "Le nom et la classe de l'élève sont requis." });
      return;
    }
    
    const studentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${editingStudent.id}`);
    const selectedClassInfo = classes.find(c => c.id === formState.classId);
    
    const updatedData = {
      ...editingStudent,
      name: formState.name,
      classId: formState.classId,
      class: selectedClassInfo?.name || 'N/A',
      cycle: selectedClassInfo?.cycle || editingStudent.cycle,
      feedback: formState.feedback || '',
      amountDue: Number(formState.amountDue) || 0,
      tuitionStatus: formState.tuitionStatus || 'Partiel',
    };
    
    setDoc(studentDocRef, updatedData, { merge: true })
    .then(() => {
        toast({ title: "Élève modifié", description: `Les informations de ${formState.name} ont été mises à jour.` });
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
        toast({ title: "Élève supprimé", description: `L'élève ${studentToDelete.name} a été supprimé(e).` });
        setIsDeleteDialogOpen(false);
        setStudentToDelete(null);
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: studentDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
    });
  }
  
  const isLoading = schoolLoading || studentsLoading || classesLoading;

  if (isAuthLoading) {
    return <AuthProtectionLoader />;
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold md:text-2xl">Liste des Élèves</h1>
              <p className="text-muted-foreground">Consultez et gérez les élèves inscrits.</p>
            </div>
            <Button onClick={() => router.push('/dashboard/registration')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Élève
            </Button>
          </div>
          <Card>
              <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Classe</TableHead>
                        <TableHead className="text-center">Statut Paiement</TableHead>
                        <TableHead className="text-right">Solde Scolarité</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        [...Array(5)].map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-5 w-12 mx-auto"/></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto"/></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto"/></TableCell>
                          </TableRow>
                        ))
                      ) : students.length > 0 ? (
                        students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            <Link href={`/dashboard/students/${student.id}`} className="hover:underline text-primary">
                                {student.name}
                            </Link>
                          </TableCell>
                          <TableCell>{student.class}</TableCell>
                          <TableCell className="text-center">
                              <TuitionStatusBadge status={student.tuitionStatus} />
                          </TableCell>
                          <TableCell className="text-right font-mono">
                              {student.amountDue > 0 ? (isClient ? `${student.amountDue.toLocaleString('fr-FR')} CFA` : `${student.amountDue} CFA`) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenEditDialog(student)}>Modifier</DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleOpenDeleteDialog(student)}
                                  >
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">Aucun élève inscrit pour le moment.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
              </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analyse de Feedback</CardTitle>
              <CardDescription>
                Utilisez l'IA pour analyser le sentiment et résumer le feedback des élèves.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="feedback-text">Collez le feedback ici</Label>
                <Textarea 
                  placeholder="Entrez un ou plusieurs feedbacks d'élèves..." 
                  id="feedback-text"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={5}
                />
              </div>
              <Button onClick={handleAnalyzeFeedback} disabled={isAnalyzing || !feedbackText.trim()} className="w-full bg-accent hover:bg-accent/90">
                <Bot className="mr-2 h-4 w-4" />
                {isAnalyzing ? 'Analyse en cours...' : 'Analyser le Feedback'}
              </Button>
              {analysisResult && (
                <div className="space-y-4 rounded-lg border bg-muted p-4">
                  <div>
                    <h4 className="font-semibold text-primary">Sentiment Général</h4>
                    <SentimentDisplay sentiment={analysisResult.sentiment} />
                  </div>
                  <div className="pt-2">
                    <h4 className="font-semibold text-primary">Résumé</h4>
                    <p className="text-sm text-muted-foreground">{analysisResult.summary}</p>
                  </div>
                  <div className="pt-2">
                    <h4 className="font-semibold text-primary">Axes d'Amélioration</h4>
                    <p className="text-sm text-muted-foreground">{analysisResult.keyImprovementAreas}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
                Mettez à jour les informations de <strong>{editingStudent?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-student-name" className="text-right">
                Nom
              </Label>
              <Input id="edit-student-name" value={formState.name || ''} onChange={(e) => setFormState(s => ({...s, name: e.target.value}))} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-student-class" className="text-right">
                Classe
              </Label>
              <Select onValueChange={(v) => setFormState(s => ({...s, classId: v}))} value={formState.classId || ''}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-student-amount" className="text-right">
                Solde (CFA)
              </Label>
              <Input id="edit-student-amount" type="number" value={formState.amountDue || 0} onChange={(e) => setFormState(s => ({...s, amountDue: Number(e.target.value)}))} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-student-tuition-status" className="text-right">
                Statut
              </Label>
              <Select onValueChange={(v) => setFormState(s => ({...s, tuitionStatus: v as TuitionStatus}))} value={formState.tuitionStatus || 'Partiel'}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Statut du paiement" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Soldé">Soldé</SelectItem>
                    <SelectItem value="En retard">En retard</SelectItem>
                    <SelectItem value="Partiel">Partiel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="edit-student-feedback" className="text-right pt-2">
                Feedback
              </Label>
              <Textarea id="edit-student-feedback" value={formState.feedback || ''} onChange={(e) => setFormState(s => ({...s, feedback: e.target.value}))} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleEditStudent}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'élève <strong>{studentToDelete?.name}</strong> sera définitivement supprimé(e).
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

    
