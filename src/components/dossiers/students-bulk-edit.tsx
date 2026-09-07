'use client';

import { useState, useMemo } from 'react';
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
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, Undo2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { doc, writeBatch } from "firebase/firestore";
import type { student as Student, class_type as Class } from "@/lib/data-types";

interface StudentsBulkEditProps {
    schoolId: string;
    students: Student[];
    classes: Class[];
    isLoading: boolean;
    onSaved?: () => void;
}

export function StudentsBulkEdit({
    schoolId,
    students,
    classes,
    isLoading,
    onSaved,
}: StudentsBulkEditProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    // Map des modifications locales : { [studentId]: Partial<Student> }
    const [edits, setEdits] = useState<Record<string, Partial<Student>>>({});

    const handleFieldChange = (studentId: string, field: keyof Student, value: any) => {
        setEdits(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value
            }
        }));
    };

    const modifiedCount = useMemo(() => Object.keys(edits).length, [edits]);

    const handleReset = () => {
        setEdits({});
        toast({
            title: "Modifications annulées",
            description: "Le tableau a été réinitialisé à son état d'origine."
        });
    };

    const handleSaveAll = async () => {
        if (modifiedCount === 0 || !schoolId) return;

        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);

            Object.entries(edits).forEach(([studentId, changes]) => {
                const studentRef = doc(firestore, `ecoles/${schoolId}/eleves`, studentId);
                // Si la classe a changé, mettre également à jour className
                if (changes.classId) {
                    const targetClass = classes.find(c => c.id === changes.classId);
                    if (targetClass) {
                        changes.className = targetClass.name;
                    }
                }
                batch.update(studentRef, {
                    ...changes,
                    updatedAt: new Date()
                });
            });

            await batch.commit();

            toast({
                title: "Enregistrement réussi !",
                description: `${modifiedCount} dossier(s) élève(s) mis à jour avec succès.`
            });

            setEdits({});
            if (onSaved) onSaved();
        } catch (error) {
            console.error("Error saving bulk edits:", error);
            toast({
                variant: "destructive",
                title: "Erreur d'enregistrement",
                description: "Impossible d'appliquer les modifications groupées."
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="border shadow-lg rounded-2xl overflow-hidden bg-white/70 backdrop-blur-xl">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b bg-muted/20 pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-xl font-black text-slate-900">
                            Mode Tableur — Édition Rapide Groupée
                        </CardTitle>
                        {modifiedCount > 0 && (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold animate-pulse">
                                {modifiedCount} modification(s) en attente
                            </Badge>
                        )}
                    </div>
                    <CardDescription className="text-xs text-slate-500 mt-1">
                        Modifiez directement les champs dans les cellules. Cliquez sur Enregistrer pour appliquer toutes les modifications d'un coup.
                    </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                    {modifiedCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReset}
                            disabled={isSaving}
                            className="rounded-xl border-slate-300"
                        >
                            <Undo2 className="mr-1.5 h-4 w-4" />
                            Annuler
                        </Button>
                    )}
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleSaveAll}
                        disabled={modifiedCount === 0 || isSaving}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                Enregistrement...
                            </>
                        ) : (
                            <>
                                <Save className="mr-1.5 h-4 w-4" />
                                Enregistrer ({modifiedCount})
                            </>
                        )}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                        <TableRow>
                            <TableHead className="w-[120px] font-black uppercase text-[11px] text-slate-500">Matricule</TableHead>
                            <TableHead className="w-[160px] font-black uppercase text-[11px] text-slate-500">Nom</TableHead>
                            <TableHead className="w-[160px] font-black uppercase text-[11px] text-slate-500">Prénoms</TableHead>
                            <TableHead className="w-[150px] font-black uppercase text-[11px] text-slate-500">Classe</TableHead>
                            <TableHead className="w-[100px] font-black uppercase text-[11px] text-slate-500">Genre</TableHead>
                            <TableHead className="w-[140px] font-black uppercase text-[11px] text-slate-500">Date de Naiss.</TableHead>
                            <TableHead className="w-[130px] font-black uppercase text-[11px] text-slate-500">Statut</TableHead>
                            <TableHead className="w-[140px] font-black uppercase text-[11px] text-slate-500">Contact Parent</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={8} className="py-3 text-center">
                                        <div className="h-6 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : students.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                                    Aucun élève à afficher avec les filtres sélectionnés.
                                </TableCell>
                            </TableRow>
                        ) : (
                            students.map((student) => {
                                if (!student.id) return null;
                                const studentEdits = edits[student.id] || {};
                                const isRowModified = Object.keys(studentEdits).length > 0;

                                const currentMatricule = studentEdits.matricule !== undefined ? studentEdits.matricule : (student.matricule || '');
                                const currentLastName = studentEdits.lastName !== undefined ? studentEdits.lastName : student.lastName;
                                const currentFirstName = studentEdits.firstName !== undefined ? studentEdits.firstName : student.firstName;
                                const currentClassId = studentEdits.classId !== undefined ? studentEdits.classId : (student.classId || '');
                                const currentGender = studentEdits.gender !== undefined ? studentEdits.gender : (student.gender || 'M');
                                const currentDateOfBirth = studentEdits.dateOfBirth !== undefined ? studentEdits.dateOfBirth : (student.dateOfBirth || '');
                                const currentStatus = studentEdits.status !== undefined ? studentEdits.status : student.status;
                                const currentParentContact = studentEdits.parent1Contact !== undefined ? studentEdits.parent1Contact : (student.parent1Contact || '');

                                return (
                                    <TableRow
                                        key={student.id}
                                        className={isRowModified ? "bg-blue-50/60 dark:bg-blue-950/20 border-l-4 border-l-blue-500" : ""}
                                    >
                                        {/* Matricule */}
                                        <TableCell className="p-1.5">
                                            <Input
                                                value={currentMatricule}
                                                onChange={(e) => handleFieldChange(student.id!, 'matricule', e.target.value)}
                                                className="h-8 text-xs font-mono bg-white/80 dark:bg-slate-900/80 rounded-lg"
                                                placeholder="Matricule..."
                                            />
                                        </TableCell>

                                        {/* Nom */}
                                        <TableCell className="p-1.5">
                                            <Input
                                                value={currentLastName}
                                                onChange={(e) => handleFieldChange(student.id!, 'lastName', e.target.value)}
                                                className="h-8 text-xs font-bold uppercase bg-white/80 dark:bg-slate-900/80 rounded-lg"
                                            />
                                        </TableCell>

                                        {/* Prénom */}
                                        <TableCell className="p-1.5">
                                            <Input
                                                value={currentFirstName}
                                                onChange={(e) => handleFieldChange(student.id!, 'firstName', e.target.value)}
                                                className="h-8 text-xs bg-white/80 dark:bg-slate-900/80 rounded-lg"
                                            />
                                        </TableCell>

                                        {/* Classe */}
                                        <TableCell className="p-1.5">
                                            <Select
                                                value={currentClassId}
                                                onValueChange={(val) => handleFieldChange(student.id!, 'classId', val)}
                                            >
                                                <SelectTrigger className="h-8 text-xs bg-white/80 dark:bg-slate-900/80 rounded-lg">
                                                    <SelectValue placeholder="Choisir classe" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {classes.map((cls) => (
                                                        <SelectItem key={cls.id} value={cls.id!} className="text-xs">
                                                            {cls.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>

                                        {/* Sexe */}
                                        <TableCell className="p-1.5">
                                            <Select
                                                value={currentGender}
                                                onValueChange={(val) => handleFieldChange(student.id!, 'gender', val)}
                                            >
                                                <SelectTrigger className="h-8 text-xs bg-white/80 dark:bg-slate-900/80 rounded-lg">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="M" className="text-xs">Masculin (M)</SelectItem>
                                                    <SelectItem value="F" className="text-xs">Féminin (F)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>

                                        {/* Date de Naissance */}
                                        <TableCell className="p-1.5">
                                            <Input
                                                type="date"
                                                value={currentDateOfBirth}
                                                onChange={(e) => handleFieldChange(student.id!, 'dateOfBirth', e.target.value)}
                                                className="h-8 text-xs bg-white/80 dark:bg-slate-900/80 rounded-lg"
                                            />
                                        </TableCell>

                                        {/* Statut */}
                                        <TableCell className="p-1.5">
                                            <Select
                                                value={currentStatus}
                                                onValueChange={(val: any) => handleFieldChange(student.id!, 'status', val)}
                                            >
                                                <SelectTrigger className="h-8 text-xs bg-white/80 dark:bg-slate-900/80 rounded-lg">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Actif" className="text-xs text-emerald-600 font-bold">Actif</SelectItem>
                                                    <SelectItem value="En attente" className="text-xs text-amber-600 font-bold">En attente</SelectItem>
                                                    <SelectItem value="Transféré" className="text-xs text-slate-600 font-bold">Transféré</SelectItem>
                                                    <SelectItem value="Diplômé" className="text-xs text-blue-600 font-bold">Diplômé</SelectItem>
                                                    <SelectItem value="Radié" className="text-xs text-rose-600 font-bold">Radié</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>

                                        {/* Contact Parent */}
                                        <TableCell className="p-1.5">
                                            <Input
                                                value={currentParentContact}
                                                onChange={(e) => handleFieldChange(student.id!, 'parent1Contact', e.target.value)}
                                                className="h-8 text-xs font-mono bg-white/80 dark:bg-slate-900/80 rounded-lg"
                                                placeholder="+225..."
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
