
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DEMO_STUDENTS } from '@/lib/demo-data';

const DEMO_CLASSES = [
    { id: 'cm2a', name: 'CM2-A' },
    { id: '6b', name: '6ème-B' },
    { id: 'terminale-d', name: 'Terminale D' },
];

const DEMO_SUBJECTS = ["Mathématiques", "Français", "Histoire-Géographie"];

const DEMO_GRADES = [
    { id: 'g1', studentId: 'std_001', subject: 'Mathématiques', date: '2024-05-10', type: 'Devoir', grade: 15, coefficient: 2 },
    { id: 'g2', studentId: 'std_001', subject: 'Français', date: '2024-05-12', type: 'Interrogation', grade: 17, coefficient: 1 },
    { id: 'g3', studentId: 'std_004', subject: 'Mathématiques', date: '2024-05-11', type: 'Devoir', grade: 18, coefficient: 2 },
];


export default function DemoGradesPage() {
  const router = useRouter();
  const [selectedClassId, setSelectedClassId] = useState('cm2a');
  const [selectedSubject, setSelectedSubject] = useState('Mathématiques');

  const studentsInClass = useMemo(() => {
    const className = DEMO_CLASSES.find(c => c.id === selectedClassId)?.name;
    return DEMO_STUDENTS.filter(s => s.class === className);
  }, [selectedClassId]);
  
  const gradesForSubject = useMemo(() => {
    return DEMO_GRADES.filter(g => g.subject === selectedSubject && studentsInClass.some(s => s.id === g.studentId))
      .map(g => {
          const student = studentsInClass.find(s => s.id === g.studentId);
          return { ...g, studentName: `${student?.firstName} ${student?.lastName}` };
      });
  }, [selectedSubject, studentsInClass]);

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-muted/40 p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold md:text-2xl">Démo: Saisie des Notes</h1>
              <p className="text-muted-foreground">Voici une simulation de l'interface de saisie des notes.</p>
            </div>
            <Button variant="outline" onClick={() => router.back()}>Retour au tableau de bord</Button>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex gap-2 w-full md:w-auto">
                <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Sélectionner une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMO_CLASSES.map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select onValueChange={setSelectedSubject} value={selectedSubject}>
                   <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Sélectionner une matière" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMO_SUBJECTS.map(subject => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
        </div>

        <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                  <CardTitle>Notes de {DEMO_CLASSES.find(c => c.id === selectedClassId)?.name} en {selectedSubject}</CardTitle>
                  <CardDescription>Liste des notes enregistrées pour cette matière.</CardDescription>
                </div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button disabled>
                          <span className="flex items-center gap-2">
                            <PlusCircle className="h-4 w-4" /> Ajouter une note
                          </span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Fonctionnalité désactivée en mode démo</p></TooltipContent>
                </Tooltip>
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
                  {gradesForSubject.length > 0 ? (
                    gradesForSubject.map(grade => (
                      <TableRow key={grade.id}>
                        <TableCell className="font-medium">{grade.studentName}</TableCell>
                        <TableCell>{grade.date}</TableCell>
                        <TableCell>{grade.type}</TableCell>
                        <TableCell className="font-mono">{grade.grade}</TableCell>
                        <TableCell className="font-mono">{grade.coefficient}</TableCell>
                        <TableCell className="text-right space-x-2">
                           <Tooltip>
                               <TooltipTrigger asChild>
                                 <Button variant="outline" size="icon" className="h-8 w-8" disabled>
                                   <Pencil className="h-4 w-4" />
                                 </Button>
                               </TooltipTrigger>
                               <TooltipContent><p>Désactivé en mode démo</p></TooltipContent>
                           </Tooltip>
                           <Tooltip>
                               <TooltipTrigger asChild>
                                  <Button variant="destructive" size="icon" className="h-8 w-8" disabled>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                               </TooltipTrigger>
                               <TooltipContent><p>Désactivé en mode démo</p></TooltipContent>
                           </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        Aucune note n'a été saisie pour cette sélection.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

      </div>
    </div>
    </TooltipProvider>
  );
}
