
'use client';

import { useState } from 'react';
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
import { mockClassData, mockStudentData, mockGradeData, allSubjects, type Student, type Grade } from '@/lib/data';
import { Bot, FilePenLine } from 'lucide-react';
import { generateReportCardComment } from '@/ai/flows/generate-report-card-comment';

export default function ReportsPage() {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [studentsInClass, setStudentsInClass] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>(mockGradeData);
  const [isManageGradesDialogOpen, setIsManageGradesDialogOpen] = useState(false);
  const [isGenerateCommentDialogOpen, setIsGenerateCommentDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentGrades, setCurrentGrades] = useState<Partial<Grade[]>>([]);
  const [generatedComment, setGeneratedComment] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { toast } = useToast();

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    const selectedClassName = mockClassData.find(c => c.id === classId)?.name;
    if (selectedClassName) {
      setStudentsInClass(mockStudentData.filter(s => s.class === selectedClassName));
    } else {
      setStudentsInClass([]);
    }
  };

  const getStudentAverage = (studentId: string) => {
    const studentGrades = grades.filter(g => g.studentId === studentId);
    if (studentGrades.length === 0) return 'N/A';
    const total = studentGrades.reduce((acc, g) => acc + g.score, 0);
    const average = total / studentGrades.length;
    return average.toFixed(2);
  };

  const openManageGradesDialog = (student: Student) => {
    setSelectedStudent(student);
    const studentGrades = grades.filter(g => g.studentId === student.id);
    setCurrentGrades(studentGrades);
    setIsManageGradesDialogOpen(true);
  };

  const handleGradeChange = (subject: string, score: string) => {
    if (!selectedStudent) return;

    const newScore = parseInt(score, 10);
    const existingGradeIndex = currentGrades.findIndex(g => g?.subject === subject);

    let updatedGrades = [...currentGrades];

    if (existingGradeIndex > -1) {
      if (!isNaN(newScore)) {
        updatedGrades[existingGradeIndex] = { studentId: selectedStudent.id, subject, score: newScore };
      } else {
        // Remove grade if input is empty/invalid
        updatedGrades.splice(existingGradeIndex, 1);
      }
    } else if (!isNaN(newScore)) {
      // Add new grade
      updatedGrades.push({ studentId: selectedStudent.id, subject, score: newScore });
    }
    
    setCurrentGrades(updatedGrades);
  };

  const saveGrades = () => {
    if (!selectedStudent) return;
    
    // Filter out old grades for the student and add the new ones
    const otherStudentsGrades = grades.filter(g => g.studentId !== selectedStudent.id);
    setGrades([...otherStudentsGrades, ...currentGrades.filter(g => g && g.score !== undefined) as Grade[]]);
    
    toast({
      title: 'Notes enregistrées',
      description: `Les notes pour ${selectedStudent.name} ont été mises à jour.`,
    });
    
    setIsManageGradesDialogOpen(false);
    setSelectedStudent(null);
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
      const studentGrades = grades
        .filter(g => g.studentId === selectedStudent.id)
        .map(g => `${g.subject}: ${g.score}/20`)
        .join(', ');
        
      const result = await generateReportCardComment({
        studentName: selectedStudent.name,
        grades: studentGrades || "Aucune note enregistrée.",
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
            <Select onValueChange={handleClassChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une classe" />
              </SelectTrigger>
              <SelectContent>
                {mockClassData.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedClassId && (
          <Card>
            <CardHeader>
              <CardTitle>
                {mockClassData.find(c => c.id === selectedClassId)?.name}
              </CardTitle>
              <CardDescription>
                Liste des élèves et leurs moyennes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom de l'élève</TableHead>
                    <TableHead className="text-center">Moyenne Générale</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsInClass.length > 0 ? (
                    studentsInClass.map(student => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="text-center font-mono">
                          {getStudentAverage(student.id)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="mr-2" onClick={() => openManageGradesDialog(student)}>
                             <FilePenLine className="mr-2 h-4 w-4" /> Gérer les notes
                          </Button>
                           <Button variant="outline" size="sm" className="bg-accent hover:bg-accent/90" onClick={() => openGenerateCommentDialog(student)}>
                             <Bot className="mr-2 h-4 w-4" /> Appréciation IA
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Aucun élève dans cette classe.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
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
              const grade = currentGrades.find(g => g?.subject === subject);
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
                    defaultValue={grade?.score}
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
            <DialogTitle>Générer une appréciation pour {selectedStudent?.name}</DialogTitle>
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
                    <h4 className="font-semibold text-primary">Appréciation générale</h4>
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
