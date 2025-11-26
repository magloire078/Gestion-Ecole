
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, addDoc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { allSubjects } from '@/lib/data';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useAuthProtection } from '@/hooks/use-auth-protection';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// --- Interfaces ---
interface Student {
  id: string;
  name: string;
  classId: string;
}
interface Class {
  id: string;
  name: string;
}
interface GradeEntry {
  id: string;
  studentId: string;
  studentName?: string;
  subject: string;
  type: 'Interrogation' | 'Devoir';
  date: string;
  grade: number;
  coefficient: number;
}

export default function GradeEntryPage() {
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
  const [allGradesForSubject, setAllGradesForSubject] = useState<GradeEntry[]>([]);
  const [isGradesLoading, setIsGradesLoading] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeEntry | null>(null);
  const [gradeToDelete, setGradeToDelete] = useState<GradeEntry | null>(null);

  const [gradeForm, setGradeForm] = useState({ 
    studentId: '', 
    type: 'Devoir' as 'Interrogation' | 'Devoir', 
    grade: '', 
    coefficient: '1', 
    date: format(new Date(), 'yyyy-MM-dd') 
  });
  
  const [isSaving, setIsSaving] = useState(false);

  // --- Effects ---
  useEffect(() => {
    setSelectedSubject(null);
    setAllGradesForSubject([]);
  }, [selectedClassId]);

  useEffect(() => {
    const fetchGrades = async () => {
      if (!selectedSubject || studentsInClass.length === 0 || !schoolId) {
        setAllGradesForSubject([]);
        return;
      }
      setIsGradesLoading(true);
      
      const allGrades: GradeEntry[] = [];
      for (const student of studentsInClass) {
        const gradesCollectionRef = collection(firestore, `ecoles/${schoolId}/eleves/${student.id}/notes`);
        const q = query(gradesCollectionRef, where('subject', '==', selectedSubject));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
          allGrades.push({ 
            id: doc.id,
            studentId: student.id,
            studentName: student.name,
            ...doc.data() 
          } as GradeEntry);
        });
      }
      
      allGrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAllGradesForSubject(allGrades);
      setIsGradesLoading(false);
    };

    fetchGrades();
  }, [selectedSubject, studentsInClass, schoolId, firestore]);
  
  useEffect(() => {
    if (isFormOpen && editingGrade) {
        setGradeForm({
            studentId: editingGrade.studentId,
            type: editingGrade.type,
            grade: String(editingGrade.grade),
            coefficient: String(editingGrade.coefficient),
            date: editingGrade.date,
        });
    } else {
        setGradeForm({
            studentId: '',
            type: 'Devoir',
            grade: '',
            coefficient: '1',
            date: format(new Date(), 'yyyy-MM-dd'),
        });
    }
  }, [isFormOpen, editingGrade]);


  const handleOpenFormDialog = (grade: GradeEntry | null) => {
    setEditingGrade(grade);
    setIsFormOpen(true);
  };
  
  const handleSubmitGrade = async () => {
    if (!schoolId || !selectedSubject || !gradeForm.studentId || !gradeForm.grade || !gradeForm.coefficient) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }
    const gradeValue = parseFloat(gradeForm.grade);
    const coeffValue = parseFloat(gradeForm.coefficient);

    if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 20) {
      toast({ variant: 'destructive', title: 'Note invalide', description: 'La note doit être un nombre entre 0 et 20.' });
      return;
    }
    if (isNaN(coeffValue) || coeffValue <= 0) {
      toast({ variant: 'destructive', title: 'Coefficient invalide', description: 'Le coefficient doit être un nombre positif.' });
      return;
    }
    
    setIsSaving(true);
    const gradeData = {
      subject: selectedSubject,
      type: gradeForm.type,
      date: gradeForm.date,
      grade: gradeValue,
      coefficient: coeffValue,
    };
    
    try {
        if (editingGrade) {
            // Update
            const gradeRef = doc(firestore, `ecoles/${schoolId}/eleves/${editingGrade.studentId}/notes/${editingGrade.id}`);
            await setDoc(gradeRef, gradeData);
            toast({ title: 'Note modifiée', description: `La note a été mise à jour.` });
            setAllGradesForSubject(prev => prev.map(g => g.id === editingGrade.id ? { ...g, ...gradeData } : g));
        } else {
            // Create
            const gradesCollectionRef = collection(firestore, `ecoles/${schoolId}/eleves/${gradeForm.studentId}/notes`);
            const newDocRef = await addDoc(gradesCollectionRef, gradeData);
            toast({ title: 'Note ajoutée', description: `La note a été enregistrée.` });
            const student = studentsInClass.find(s => s.id === gradeForm.studentId);
            setAllGradesForSubject(prev => [{ ...gradeData, id: newDocRef.id, studentId: gradeForm.studentId, studentName: student?.name || '' }, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
      setIsFormOpen(false);
    } catch(error) {
      const operation = editingGrade ? 'update' : 'create';
      const studentIdForPath = editingGrade ? editingGrade.studentId : gradeForm.studentId;
      const path = editingGrade 
        ? `ecoles/${schoolId}/eleves/${studentIdForPath}/notes/${editingGrade.id}`
        : `ecoles/${schoolId}/eleves/${studentIdForPath}/notes`;

      const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: gradeData });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsSaving(false);
    }
  }

  const handleOpenDeleteDialog = (grade: GradeEntry) => {
    setGradeToDelete(grade);
    setIsDeleting(true);
  };
  
  const handleDeleteGrade = async () => {
    if (!schoolId || !gradeToDelete) return;
    try {
        const gradeRef = doc(firestore, `ecoles/${schoolId}/eleves/${gradeToDelete.studentId}/notes/${gradeToDelete.id}`);
        await deleteDoc(gradeRef);
        toast({ title: 'Note supprimée', description: 'La note a été supprimée.' });
        setAllGradesForSubject(prev => prev.filter(g => g.id !== gradeToDelete.id));
        setIsDeleting(false);
        setGradeToDelete(null);
    } catch(error) {
         const permissionError = new FirestorePermissionError({ 
             path: `ecoles/${schoolId}/eleves/${gradeToDelete.studentId}/notes/${gradeToDelete.id}`, 
             operation: 'delete' 
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };


  const isLoading = schoolLoading || classesLoading;
  const isDataLoading = studentsLoading || isGradesLoading;

  if (isAuthLoading) {
    return <AuthProtectionLoader />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Saisie des Notes</h1>
            <p className="text-muted-foreground">
              Saisissez et gérez les notes des élèves par classe et par matière.
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
                    Notes de {classes.find(c => c.id === selectedClassId)?.name} en {selectedSubject}
                  </CardTitle>
                  <CardDescription>
                    Liste de toutes les notes enregistrées pour cette matière.
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenFormDialog(null)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une note
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Note /20</TableHead>
                    <TableHead>Coeff.</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isDataLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-9 w-20 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : allGradesForSubject.length > 0 ? (
                    allGradesForSubject.map(grade => (
                      <TableRow key={grade.id}>
                        <TableCell className="font-medium">{grade.studentName}</TableCell>
                        <TableCell>{format(new Date(grade.date), 'd MMM yyyy', { locale: fr })}</TableCell>
                        <TableCell>{grade.type}</TableCell>
                        <TableCell className="font-mono">{grade.grade}</TableCell>
                        <TableCell className="font-mono">{grade.coefficient}</TableCell>
                        <TableCell className="text-right space-x-2">
                           <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenFormDialog(grade)}>
                             <Pencil className="h-4 w-4" />
                          </Button>
                           <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleOpenDeleteDialog(grade)}>
                             <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        Aucune note n'a été saisie pour cette matière.
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingGrade ? 'Modifier' : 'Ajouter'} une note</DialogTitle>
                <DialogDescription>Matière: {selectedSubject}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="grade-student" className="text-right">Élève</Label>
                    <Select onValueChange={(v) => setGradeForm(f => ({...f, studentId: v}))} value={gradeForm.studentId} disabled={!!editingGrade}>
                        <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger>
                        <SelectContent>
                            {studentsInClass.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="grade-type" className="text-right">Type</Label>
                    <Select onValueChange={(v) => setGradeForm(f => ({...f, type: v as any}))} value={gradeForm.type}>
                        <SelectTrigger className="col-span-3"><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Devoir">Devoir</SelectItem>
                            <SelectItem value="Interrogation">Interrogation</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="grade-date" className="text-right">Date</Label>
                    <Input id="grade-date" type="date" value={gradeForm.date} onChange={(e) => setGradeForm(f => ({...f, date: e.target.value}))} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="grade-value" className="text-right">Note /20</Label>
                    <Input id="grade-value" type="number" value={gradeForm.grade} onChange={(e) => setGradeForm(f => ({...f, grade: e.target.value}))} className="col-span-3" placeholder="Ex: 15.5" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="grade-coeff" className="text-right">Coefficient</Label>
                    <Input id="grade-coeff" type="number" value={gradeForm.coefficient} onChange={(e) => setGradeForm(f => ({...f, coefficient: e.target.value}))} className="col-span-3" placeholder="Ex: 2" />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                <Button onClick={handleSubmitGrade} disabled={isSaving}>
                    {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La note sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGrade} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    