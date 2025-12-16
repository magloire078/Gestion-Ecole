
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
import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { TuitionStatusBadge } from "@/components/tuition-status-badge";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";

export default function PaymentsPage() {
  const firestore = useFirestore();
  const { schoolId, loading: schoolDataLoading } = useSchoolData();
  
  const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/eleves`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
  
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  
  const students: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const classMatch = selectedClass === 'all' || student.classId === selectedClass;
      const statusMatch = selectedStatus === 'all' || student.tuitionStatus === selectedStatus;
      return classMatch && statusMatch;
    });
  }, [students, selectedClass, selectedStatus]);

  const totalDue = useMemo(() => {
    return filteredStudents.reduce((acc, student) => acc + (student.amountDue || 0), 0);
  }, [filteredStudents]);

  const isLoading = schoolDataLoading || studentsLoading || classesLoading;

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9]/g, '')) : value;
    if (isNaN(num)) return value.toString();
    return `${num.toLocaleString('fr-FR')} CFA`;
  };

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
            <div>
                <h2 className="text-xl font-semibold">Liste des Élèves</h2>
                <p className="text-muted-foreground">
                    Filtrez par classe ou par statut pour affiner les résultats.
                </p>
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
                            <TableCell className="text-right font-mono">
                                {formatCurrency(student.amountDue || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                               <div className="flex justify-end gap-2">
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
                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
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
    </>
  );
}
