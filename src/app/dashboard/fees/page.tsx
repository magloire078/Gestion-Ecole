
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
import { Badge } from "@/components/ui/badge";
import { mockStudentData, mockClassData } from "@/lib/data";
import type { Student } from "@/lib/data";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Pencil } from "lucide-react";

type TuitionStatus = 'Soldé' | 'En retard' | 'Partiel';

const TuitionStatusBadge = ({ status }: { status: TuitionStatus }) => {
  switch (status) {
    case 'Soldé':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Soldé</Badge>;
    case 'En retard':
      return <Badge variant="destructive">En retard</Badge>;
    case 'Partiel':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Partiel</Badge>;
    default:
      return null;
  }
};

export default function FeesPage() {
  const [students, setStudents] = useState<Student[]>(mockStudentData);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isClient, setIsClient] = useState(false);
  const [isManageFeeDialogOpen, setIsManageFeeDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentAmountDue, setCurrentAmountDue] = useState('');
  const [currentTuitionStatus, setCurrentTuitionStatus] = useState<TuitionStatus>('Soldé');
  const { toast } = useToast();
  

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if (selectedStudent) {
        setCurrentAmountDue(String(selectedStudent.amountDue));
        setCurrentTuitionStatus(selectedStudent.tuitionStatus);
    }
  }, [selectedStudent]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const classMatch = selectedClass === 'all' || student.class === selectedClass;
      const statusMatch = selectedStatus === 'all' || student.tuitionStatus === selectedStatus;
      return classMatch && statusMatch;
    });
  }, [students, selectedClass, selectedStatus]);

  const totalDue = useMemo(() => {
    return filteredStudents.reduce((acc, student) => acc + student.amountDue, 0);
  }, [filteredStudents]);
  
  const handleOpenManageDialog = (student: Student) => {
    setSelectedStudent(student);
    setIsManageFeeDialogOpen(true);
  };
  
  const handleSaveChanges = () => {
    if (!selectedStudent) return;
    
    setStudents(students.map(s => 
        s.id === selectedStudent.id 
        ? { ...s, amountDue: parseFloat(currentAmountDue) || 0, tuitionStatus: currentTuitionStatus }
        : s
    ));
    
    toast({
        title: "Scolarité mise à jour",
        description: `Les informations de paiement pour ${selectedStudent.name} ont été enregistrées.`
    });
    
    setIsManageFeeDialogOpen(false);
    setSelectedStudent(null);
  }

  return (
    <>
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Suivi de la Scolarité</h1>
        <p className="text-muted-foreground">Consultez et gérez le statut des paiements de scolarité pour tous les élèves.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <div>
                <CardTitle>Liste des paiements</CardTitle>
                <CardDescription>
                    Filtrez par classe ou par statut pour affiner les résultats.
                </CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Toutes les classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les classes</SelectItem>
                  {mockClassData.map(cls => (
                    <SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom de l'élève</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead className="text-center">Statut du paiement</TableHead>
                <TableHead className="text-right">Solde dû</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
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
                        <Button variant="outline" size="sm" onClick={() => handleOpenManageDialog(student)}>
                           <Pencil className="mr-2 h-3 w-3" /> Gérer
                        </Button>
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
               <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={4} className="text-right">Total dû (filtré)</TableCell>
                    <TableCell className="text-right font-mono text-lg text-primary">
                        {isClient ? totalDue.toLocaleString('fr-FR') : totalDue} CFA
                    </TableCell>
                </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    
     <Dialog open={isManageFeeDialogOpen} onOpenChange={setIsManageFeeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gérer la scolarité de {selectedStudent?.name}</DialogTitle>
            <DialogDescription>
              Mettez à jour le statut et le solde dû pour cet élève.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tuition-status" className="text-right">
                Statut
              </Label>
              <Select onValueChange={(value) => setCurrentTuitionStatus(value as any)} value={currentTuitionStatus}>
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount-due" className="text-right">
                Solde dû (CFA)
              </Label>
              <Input
                id="amount-due"
                type="number"
                value={currentAmountDue}
                onChange={(e) => setCurrentAmountDue(e.target.value)}
                className="col-span-3"
                placeholder="Ex: 50000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageFeeDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveChanges}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
