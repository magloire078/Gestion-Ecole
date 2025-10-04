
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
import { mockStudentData, mockClassData, mockFeeData } from "@/lib/data";
import type { Student, Fee } from "@/lib/data";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Pencil, GraduationCap, FileText, PlusCircle, MoreHorizontal } from "lucide-react";
import { TuitionStatusBadge } from "@/components/tuition-status-badge";
import Image from "next/image";

type TuitionStatus = 'Soldé' | 'En retard' | 'Partiel';

export default function FeesPage() {
  // Student payment tracking state
  const [students, setStudents] = useState<Student[]>(mockStudentData);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isClient, setIsClient] = useState(false);
  const [isManageFeeDialogOpen, setIsManageFeeDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentAmountDue, setCurrentAmountDue] = useState('');
  const [currentTuitionStatus, setCurrentTuitionStatus] = useState<TuitionStatus>('Soldé');
  
  // Fee grid management state
  const [fees, setFees] = useState<Fee[]>(mockFeeData);
  const [isAddFeeGridDialogOpen, setIsAddFeeGridDialogOpen] = useState(false);
  const [isEditFeeGridDialogOpen, setIsEditFeeGridDialogOpen] = useState(false);
  const [isDeleteFeeGridDialogOpen, setIsDeleteFeeGridDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [feeToDelete, setFeeToDelete] = useState<Fee | null>(null);
  const [newFeeGrade, setNewFeeGrade] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeeDetails, setNewFeeDetails] = useState('');

  const { toast } = useToast();
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Effect for student fee management dialog
  useEffect(() => {
    if (selectedStudent) {
        setCurrentAmountDue(String(selectedStudent.amountDue));
        setCurrentTuitionStatus(selectedStudent.tuitionStatus);
    }
  }, [selectedStudent]);
  
  // Effect for fee grid management dialog
  useEffect(() => {
    if (editingFee) {
        setNewFeeGrade(editingFee.grade);
        setNewFeeAmount(editingFee.amount);
        setNewFeeDetails(editingFee.details);
    }
  }, [editingFee]);

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
  
  // Student payment functions
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
  };

  // Fee grid functions
  const resetFeeForm = () => {
    setNewFeeGrade('');
    setNewFeeAmount('');
    setNewFeeDetails('');
  };

  const handleAddFeeGrid = () => {
    if (!newFeeGrade || !newFeeAmount || !newFeeDetails) {
        toast({ variant: "destructive", title: "Erreur", description: "Tous les champs sont requis." });
        return;
    }
    const newFee: Fee = {
        id: `F${fees.length + 1}`,
        grade: newFeeGrade,
        amount: newFeeAmount,
        details: newFeeDetails,
    };
    setFees([...fees, newFee]);
    toast({ title: "Grille tarifaire ajoutée", description: `La grille pour ${newFeeGrade} a été créée.` });
    resetFeeForm();
    setIsAddFeeGridDialogOpen(false);
  };

  const handleOpenEditFeeGridDialog = (fee: Fee) => {
    setEditingFee(fee);
    setIsEditFeeGridDialogOpen(true);
  };

  const handleEditFeeGrid = () => {
    if (!editingFee || !newFeeGrade || !newFeeAmount || !newFeeDetails) {
        toast({ variant: "destructive", title: "Erreur", description: "Tous les champs sont requis." });
        return;
    }
    setFees(fees.map(f => f.id === editingFee.id ? { ...f, grade: newFeeGrade, amount: newFeeAmount, details: newFeeDetails } : f));
    toast({ title: "Grille tarifaire modifiée", description: `La grille pour ${newFeeGrade} a été mise à jour.` });
    setIsEditFeeGridDialogOpen(false);
    setEditingFee(null);
    resetFeeForm();
  };

  const handleOpenDeleteFeeGridDialog = (fee: Fee) => {
    setFeeToDelete(fee);
    setIsDeleteFeeGridDialogOpen(true);
  };

  const handleDeleteFeeGrid = () => {
    if (!feeToDelete) return;
    setFees(fees.filter(f => f.id !== feeToDelete.id));
    toast({ title: "Grille tarifaire supprimée", description: `La grille pour ${feeToDelete.grade} a été supprimée.` });
    setIsDeleteFeeGridDialogOpen(false);
    setFeeToDelete(null);
  };

  return (
    <>
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Scolarité</h1>
        <p className="text-muted-foreground">Consultez les grilles tarifaires et gérez le statut des paiements des élèves.</p>
      </div>

       <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Grille Tarifaire</h2>
            <Dialog open={isAddFeeGridDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) resetFeeForm(); setIsAddFeeGridDialogOpen(isOpen); }}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Ajouter une grille</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouvelle grille tarifaire</DialogTitle>
                        <DialogDescription>Entrez les détails de la nouvelle grille.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="grade" className="text-right">Niveau</Label>
                            <Input id="grade" value={newFeeGrade} onChange={(e) => setNewFeeGrade(e.target.value)} className="col-span-3" placeholder="Ex: Maternelle" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">Montant</Label>
                            <Input id="amount" value={newFeeAmount} onChange={(e) => setNewFeeAmount(e.target.value)} className="col-span-3" placeholder="Ex: 98 000 CFA / mois" />
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="details" className="text-right pt-2">Détails</Label>
                            <Textarea id="details" value={newFeeDetails} onChange={(e) => setNewFeeDetails(e.target.value)} className="col-span-3" placeholder="Détails supplémentaires..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddFeeGridDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleAddFeeGrid}>Ajouter</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {fees.map((fee: Fee) => (
                <Card key={fee.id} className="flex flex-col">
                    <CardHeader className="p-0 relative">
                         <div className="relative h-40 w-full">
                            <Image 
                                src={`https://picsum.photos/seed/${fee.id}/400/200`} 
                                alt={fee.grade}
                                layout="fill"
                                objectFit="cover"
                                className="rounded-t-lg"
                                data-ai-hint="school students"
                            />
                        </div>
                         <div className="absolute top-2 right-2">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleOpenEditFeeGridDialog(fee)}>Modifier</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteFeeGridDialog(fee)}>Supprimer</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                         </div>
                    </CardHeader>
                     <CardContent className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                             <CardTitle className="flex items-center gap-2 text-xl">
                                <GraduationCap className="h-5 w-5" />
                                {fee.grade}
                            </CardTitle>
                            <p className="text-3xl font-bold text-primary mt-2">{fee.amount}</p>
                            <CardDescription className="flex items-start gap-2 mt-3 text-xs">
                                <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>{fee.details}</span>
                            </CardDescription>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h2 className="text-xl font-semibold">Suivi des paiements des élèves</h2>
                <p className="text-muted-foreground">
                    Filtrez par classe ou par statut pour affiner les résultats.
                </p>
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

        <Card>
            <CardContent className="p-0">
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
                            <TableCell colSpan={3} className="text-right">Total dû (filtré)</TableCell>
                            <TableCell className="text-right font-mono text-lg text-primary">
                                {isClient ? totalDue.toLocaleString('fr-FR') : totalDue} CFA
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
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
      
      {/* Edit Fee Grid Dialog */}
      <Dialog open={isEditFeeGridDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) { setEditingFee(null); resetFeeForm(); } setIsEditFeeGridDialogOpen(isOpen); }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Modifier la grille tarifaire</DialogTitle>
                <DialogDescription>Mettez à jour les détails de la grille.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-grade" className="text-right">Niveau</Label>
                    <Input id="edit-grade" value={newFeeGrade} onChange={(e) => setNewFeeGrade(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-amount" className="text-right">Montant</Label>
                    <Input id="edit-amount" value={newFeeAmount} onChange={(e) => setNewFeeAmount(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="edit-details" className="text-right pt-2">Détails</Label>
                    <Textarea id="edit-details" value={newFeeDetails} onChange={(e) => setNewFeeDetails(e.target.value)} className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditFeeGridDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleEditFeeGrid}>Enregistrer</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Fee Grid Confirmation Dialog */}
       <AlertDialog open={isDeleteFeeGridDialogOpen} onOpenChange={setIsDeleteFeeGridDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La grille tarifaire pour <strong>{feeToDelete?.grade}</strong> sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFeeGrid} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    