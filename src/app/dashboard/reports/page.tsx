
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
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
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, writeBatch } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { allSubjects } from '@/lib/data';
import { Bot, FilePenLine } from 'lucide-react';
import { generateReportCardComment } from '@/ai/flows/generate-report-card-comment';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useAuthProtection } from '@/hooks/use-auth-protection';

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
  const { isLoading: isAuthLoading, AuthProtectionLoader } = useAuthProtection();
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // --- Data Fetching ---
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const studentsQuery = useMemoFirebase(() =>
    schoolId && selectedClassId ? query(collection(firestore, `ecoles/${schoolId}/eleves`), where('classId', '==', selectedClassId)) : null
    , [firestore, schoolId, selectedClassId]);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const studentsInClass: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);
  
  // --- UI State ---
  const [gradesForSubject, setGradesForSubject] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerateCommentDialogOpen, setIsGenerateCommentDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [generatedComment, setGeneratedComment] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Effects ---
  useEffect(() => {
    // Reset subject and grades when class changes
    setSelectedSubject(null);
    setGradesForSubject({});
  }, [selectedClassId]);

  useEffect(() => {
    // Populate grades for the selected subject
    if (selectedSubject) {
      const initialGrades: Record<string, string> = {};
      studentsInClass.forEach(student => {
        const grade = student.grades?.[selectedSubject];
        if (grade !== undefined) {
          initialGrades[student.id] = String(grade);
        } else {
          initialGrades[student.id] = '';
        }
      });
      setGradesForSubject(initialGrades);
    } else {
      setGradesForSubject({});
    }
  }, [selectedSubject, studentsInClass]);
  

  const handleGradeChange = (studentId: string, value: string) => {
    setGradesForSubject(prev => ({...prev, [studentId]: value}));
  };

  const saveGradesForSubject = async () => {
    if (!schoolId || !selectedSubject) return;

    setIsSaving(true);
    const batch = writeBatch(firestore);

    let hasErrors = false;
    for (const studentId in gradesForSubject) {
        const gradeValue = gradesForSubject[studentId];
        const grade = parseFloat(gradeValue);
        
        if (gradeValue === '' || isNaN(grade)) {
             continue; // Skip empty or invalid grades
        }
        
        if (grade < 0 || grade > 20) {
            toast({
                variant: 'destructive',
                title: 'Note invalide',
                description: `La note pour un élève doit être entre 0 et 20.`,
            });
            hasErrors = true;
            break;
        }

        const studentRef = doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`);
        batch.update(studentRef, {
            [`grades.${selectedSubject}`]: grade
        });
    }
    
    if (hasErrors) {
        setIsSaving(false);
        return;
    }

    try {
        await batch.commit();
        toast({
            title: 'Notes enregistrées',
            description: `Les notes de ${selectedSubject} pour la classe ont été mises à jour.`,
        });
    } catch (error: any) {
        console.error("Error saving grades:", error);
         const permissionError = new FirestorePermissionError({ path: `ecoles/${schoolId}/eleves`, operation: 'update' });
         errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsSaving(false);
    }
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

  if (isAuthLoading) {
    return <AuthProtectionLoader />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Bulletins et Notes</h1>
            <p className="text-muted-foreground">
              Saisissez les notes des élèves par classe et par matière.
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Select onValueChange={setSelectedClassId} disabled={isLoading}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={isLoading ? "Chargement..." : "Sélectionner une classe"} />
              </SelectTrigger>
              <SelectContent>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={setSelectedSubject} value={selectedSubject || ''} disabled={!selectedClassId}>
               <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Sélectionner une matière" />
              </SelectTrigger>
              <SelectContent>
                {allSubjects.map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedClassId && selectedSubject ? (
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                  <CardTitle>
                    Saisie des notes pour : {classes.find(c => c.id === selectedClassId)?.name}
                  </CardTitle>
                  <CardDescription>
                    Matière : <span className="font-semibold text-primary">{selectedSubject}</span>
                  </CardDescription>
                </div>
                <Button onClick={saveGradesForSubject} disabled={isSaving}>
                  {isSaving ? 'Enregistrement...' : 'Enregistrer les notes'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom de l'Élève</TableHead>
                    <TableHead className="w-[150px]">Note /20</TableHead>
                    <TableHead className="text-right">Appréciation IA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsLoading ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-9 w-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-9 w-32 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : studentsInClass.length > 0 ? (
                    studentsInClass.map(student => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>
                           <Input
                            type="text" // Use text to allow empty string
                            value={gradesForSubject[student.id] || ''}
                            onChange={e => handleGradeChange(student.id, e.target.value)}
                            className="text-center font-mono"
                            placeholder="-"
                           />
                        </TableCell>
                        <TableCell className="text-right">
                           <Button variant="outline" size="sm" onClick={() => openGenerateCommentDialog(student)}>
                             <Bot className="mr-2 h-4 w-4" /> Générer
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
                <p className="text-muted-foreground">Veuillez sélectionner une classe et une matière pour commencer.</p>
            </Card>
        )}
      </div>
      
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
