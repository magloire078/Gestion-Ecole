
'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { allSubjects } from '@/lib/data';
import { Bot, FilePenLine } from 'lucide-react';
import { generateReportCardComment } from '@/ai/flows/generate-report-card-comment';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

interface Student {
  id: string;
  name: string;
  classId: string;
  grades?: Record<string, number>;
}
interface Class {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  
  // --- Data Fetching ---
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/classes`) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const studentsQuery = useMemoFirebase(() => 
    schoolId && selectedClassId ? query(collection(firestore, `schools/${schoolId}/students`), where('classId', '==', selectedClassId)) : null
  , [firestore, schoolId, selectedClassId]);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const studentsInClass: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);

  // --- UI State ---
  const [isManageGradesDialogOpen, setIsManageGradesDialogOpen] = useState(false);
  const [isGenerateCommentDialogOpen, setIsGenerateCommentDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentGrades, setCurrentGrades] = useState<Record<string, number>>({});
  const [generatedComment, setGeneratedComment] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const getStudentAverage = (student?: Student) => {
    if (!student?.grades || Object.keys(student.grades).length === 0) return 'N/A';
    const grades = Object.values(student.grades);
    const total = grades.reduce((acc, g) => acc + g, 0);
    const average = total / grades.length;
    return average.toFixed(2);
  };
  
  const openManageGradesDialog = (student: Student) => {
    setSelectedStudent(student);
    setCurrentGrades(student.grades || {});
    setIsManageGradesDialogOpen(true);
  };

  const handleGradeChange = (subject: string, score: string) => {
    const newScore = parseFloat(score);
    if (!isNaN(newScore) && newScore >= 0 && newScore <= 20) {
        setCurrentGrades(prev => ({...prev, [subject]: newScore}));
    } else {
        const newGrades = {...currentGrades};
        delete newGrades[subject];
        setCurrentGrades(newGrades);
    }
  };

  const saveGrades = () => {
    if (!schoolId || !selectedStudent) return;
    
    const studentRef = doc(firestore, `schools/${schoolId}/students/${selectedStudent.id}`);
    const updatedData = { grades: currentGrades };
    
    setDoc(studentRef, updatedData, { merge: true })
    .then(() => {
        toast({
          title: 'Notes enregistrées',
          description: `Les notes pour ${selectedStudent.name} ont été mises à jour.`,
        });
        setIsManageGradesDialogOpen(false);
        setSelectedStudent(null);
    })
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: studentRef.path, operation: 'update', requestResourceData: updatedData });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const openGenerateCommentDialog = (student: Student) => {
    setSelectedStudent(student);
    setGeneratedComment('');
    setIsGenerateCommentDialogOpen(true);
  };

  const handleGenerateComment = async () => {
    if (!selectedStudent) return;
    setIsGenerating(true);

    try {
      const studentGradesText = selectedStudent.grades 
        ? Object.entries(selectedStudent.grades)
            .map(([subject, score]) => `${subject}: ${score}/20`)
            .join(', ')
        : "Aucune note enregistrée.";
        
      const result = await generateReportCardComment({
        studentName: selectedStudent.name,
        grades: studentGradesText,
        teacherName: "Le Conseil de Classe" // Placeholder
      });
      setGeneratedComment(result.comment);
      toast({
        title: 'Appréciation générée',
        description: `L'appréciation pour ${selectedStudent.name} a été créée.`,
      })
    } catch (error) {
      console.error("Failed to generate comment:", error);
      toast({
        variant: 'destructive',
        title: 'Erreur de génération',
        description: 'Impossible de générer l\'appréciation.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isLoading = schoolLoading || classesLoading;

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Bulletins et Notes</h1>
            <p className="text-muted-foreground">
              Consultez et gérez les notes des élèves par classe.
            </p>
          </div>
          <div className="w-[250px]">
            <Select onValueChange={setSelectedClassId} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Chargement..." : "Sélectionner une classe"} />
              </SelectTrigger>
              <SelectContent>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedClassId ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {classes.find(c => c.id === selectedClassId)?.name}
              </CardTitle>
              <CardDescription>
                Liste des élèves et leurs moyennes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom de l'Élève</TableHead>
                    <TableHead className="text-center">Moyenne Générale</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsLoading ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-9 w-64 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : studentsInClass.length > 0 ? (
                    studentsInClass.map(student => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="text-center font-mono">
                          {getStudentAverage(student)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="mr-2" onClick={() => openManageGradesDialog(student)}>
                             <FilePenLine className="mr-2 h-4 w-4" /> Gérer les Notes
                          </Button>
                           <Button variant="outline" size="sm" className="bg-accent hover:bg-accent/90" onClick={() => openGenerateCommentDialog(student)}>
                             <Bot className="mr-2 h-4 w-4" /> Appréciation IA
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                        Aucun élève dans cette classe.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
            <Card className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Veuillez sélectionner une classe pour commencer.</p>
            </Card>
        )}
      </div>

      {/* Manage Grades Dialog */}
      <Dialog open={isManageGradesDialogOpen} onOpenChange={setIsManageGradesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gérer les notes de {selectedStudent?.name}</DialogTitle>
            <DialogDescription>
              Entrez ou modifiez les notes sur 20 pour chaque matière.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
            {allSubjects.map(subject => {
              const grade = currentGrades[subject];
              return (
                <div key={subject} className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor={`grade-${subject}`} className="text-left col-span-1">
                    {subject}
                  </Label>
                  <Input
                    id={`grade-${subject}`}
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    defaultValue={grade}
                    onChange={e => handleGradeChange(subject, e.target.value)}
                    className="col-span-2"
                    placeholder="Note /20"
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageGradesDialogOpen(false)}>Annuler</Button>
            <Button onClick={saveGrades}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Generate Comment Dialog */}
      <Dialog open={isGenerateCommentDialogOpen} onOpenChange={setIsGenerateCommentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Générer une Appréciation pour {selectedStudent?.name}</DialogTitle>
            <DialogDescription>
              Utilisez l'IA pour rédiger une appréciation générale basée sur les notes de l'élève.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button onClick={handleGenerateComment} disabled={isGenerating} className="w-full bg-accent hover:bg-accent/90">
              <Bot className="mr-2 h-4 w-4" />
              {isGenerating ? 'Génération en cours...' : 'Générer avec l\'IA'}
            </Button>
            {generatedComment && (
                <div className="space-y-2 rounded-lg border bg-muted p-4 max-h-[300px] overflow-y-auto">
                    <h4 className="font-semibold text-primary">Appréciation Générale</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{generatedComment}</p>
                </div>
            )}
          </div>
           <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateCommentDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
