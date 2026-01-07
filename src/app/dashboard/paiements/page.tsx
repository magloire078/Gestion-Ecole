
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { student as Student, class_type as Class } from "@/lib/data-types";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, Search, Loader2 } from "lucide-react";
import { TuitionStatusBadge } from "@/components/tuition-status-badge";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { generatePaymentReminder } from "@/ai/flows/generate-payment-reminder";

export default function PaymentsPage() {
  const firestore = useFirestore();
  const { schoolId, schoolName, loading: schoolDataLoading } = useSchoolData();
  const { toast } = useToast();
  
  const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/eleves`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
  
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  
  const students: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [isGeneratingReminder, setIsGeneratingReminder] = useState(false);
  const [reminderContent, setReminderContent] = useState('');
  const [studentForReminder, setStudentForReminder] = useState<Student | null>(null);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const classMatch = selectedClass === 'all' || student.classId === selectedClass;
      const statusMatch = selectedStatus === 'all' || student.tuitionStatus === selectedStatus;
      const searchMatch = searchTerm === '' || 
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.matricule?.toLowerCase().includes(searchTerm.toLowerCase());
      return classMatch && statusMatch && searchMatch;
    });
  }, [students, selectedClass, selectedStatus, searchTerm]);

  const totalDue = useMemo(() => {
    return filteredStudents.reduce((acc, student) => acc + (student.amountDue || 0), 0);
  }, [filteredStudents]);

  const isLoading = schoolDataLoading || studentsLoading || classesLoading;

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9]/g, '')) : value;
    if (isNaN(num)) return value.toString();
    return `${num.toLocaleString('fr-FR')} CFA`;
  };
  
  const handleRemind = async (student: Student) => {
    if (!student.amountDue || student.amountDue <= 0 || !schoolName) return;

    setStudentForReminder(student);
    setIsReminderDialogOpen(true);
    setIsGeneratingReminder(true);
    setReminderContent('');

    try {
        const result = await generatePaymentReminder({
            studentName: `${student.firstName} ${student.lastName}`,
            parentName: `${student.parent1FirstName} ${student.parent1LastName}`,
            amountDue: student.amountDue,
            schoolName: schoolName,
        });
        setReminderContent(result.reminder);
    } catch (e) {
        setReminderContent("Erreur lors de la génération du message. Veuillez réessayer.");
    } finally {
        setIsGeneratingReminder(false);
    }
  }

  return (
    <>
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Suivi des Paiements</h1>
        <p className="text-muted-foreground">Consultez et gérez le statut des paiements de scolarité des élèves.</p>
      </div>
      
      <div className="space-y-4">
        <Card>
            <CardHeader>
                <CardTitle>Total dû (filtré)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-destructive">
                    {isLoading ? <Skeleton className="h-8 w-48" /> : formatCurrency(totalDue)}
                </div>
            </CardContent>
        </Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
            <div className="flex gap-2 w-full sm:w-auto">
                <Select value={selectedClass} onValueChange={setSelectedClass} disabled={isLoading}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Toutes les classes" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id!}>{cls.name}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus} disabled={isLoading}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="Soldé">Soldé</SelectItem>
                    <SelectItem value="En retard">En retard</SelectItem>
                    <SelectItem value="Partiel">Partiel</SelectItem>
                </SelectContent>
                </Select>
            </div>
        </div>

        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nom de l'Élève</TableHead>
                        <TableHead>Classe</TableHead>
                        <TableHead className="text-center">Statut du Paiement</TableHead>
                        <TableHead className="text-right">Montant Payé</TableHead>
                        <TableHead className="text-right">Solde Dû</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        [...Array(5)].map((_, i) => (
                           <TableRow key={i}>
                               <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                               <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                               <TableCell className="text-center"><Skeleton className="h-6 w-24 mx-auto"/></TableCell>
                               <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto"/></TableCell>
                               <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto"/></TableCell>
                               <TableCell className="text-right"><Skeleton className="h-9 w-24 ml-auto"/></TableCell>
                           </TableRow>
                        ))
                    ) : filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                            <TableCell className="font-medium">
                                <Link href={`/dashboard/dossiers-eleves/${student.id}`} className="hover:underline text-primary">
                                    {student.firstName} {student.lastName}
                                </Link>
                            </TableCell>
                            <TableCell>{student.class}</TableCell>
                            <TableCell className="text-center">
                                <TuitionStatusBadge 
                                    status={student.tuitionStatus || 'Partiel'} 
                                />
                            </TableCell>
                            <TableCell className="text-right font-mono text-emerald-600">
                                {formatCurrency((student.tuitionFee || 0) - (student.amountDue || 0))}
                            </TableCell>
                            <TableCell className="text-right font-mono text-destructive">
                                {formatCurrency(student.amountDue || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                               <div className="flex justify-end gap-2">
                                {student.amountDue && student.amountDue > 0 && (
                                    <Button variant="outline" size="sm" onClick={() => handleRemind(student)}>
                                        <MessageSquare className="mr-1 h-3.5 w-3.5" /> Relancer
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" asChild>
                                  <Link href={`/dashboard/dossiers-eleves/${student.id}?tab=payments`}>
                                     Gérer
                                  </Link>
                                </Button>
                               </div>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                            Aucun élève ne correspond aux filtres sélectionnés.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>

    <AlertDialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Message de Relance pour {studentForReminder?.parent1FirstName} {studentForReminder?.parent1LastName}</AlertDialogTitle>
                <AlertDialogDescription>
                    Voici une suggestion de message générée par l'IA. Vous pouvez la copier pour l'envoyer.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="p-4 bg-muted rounded-md text-sm my-4">
                {isGeneratingReminder ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Génération du message...
                    </div>
                ) : (
                    <p>{reminderContent}</p>
                )}
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Fermer</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    navigator.clipboard.writeText(reminderContent);
                    toast({ title: "Message copié !" });
                }} disabled={isGeneratingReminder || !reminderContent}>
                    Copier le message
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

    