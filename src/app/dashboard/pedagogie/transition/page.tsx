'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore } from "@/firebase";
import { useSchoolData } from "@/hooks/use-school-data";
import { collection, query, writeBatch, doc } from "firebase/firestore";
import { useStudents } from "@/hooks/use-students";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, ArrowRight, Save, RotateCcw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { class_type as Class, student as Student, student_enrollment } from "@/lib/data-types";
import { StudentReportsService } from '@/services/student-reports-service';

export default function TransitionPage() {
    const firestore = useFirestore();
    const { schoolId, schoolData } = useSchoolData();
    const { toast } = useToast();

    const [sourceYear, setSourceYear] = useState<string>('2023-2024');
    const [targetYear, setTargetYear] = useState<string>('2024-2025');
    const [sourceClassId, setSourceClassId] = useState<string>('all');
    
    // Fetch students for the source year
    const { students: sourceStudents, loading: studentsLoading } = useStudents(schoolId, sourceClassId, 'active', sourceYear);

    const classesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
    const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
    const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

    // Local state to track decisions
    const [decisions, setDecisions] = useState<Record<string, { status: student_enrollment['status'], targetClassId: string }>>({});

    const handleDecision = (studentId: string, status: student_enrollment['status'], targetClassId: string) => {
        setDecisions(prev => ({
            ...prev,
            [studentId]: { status, targetClassId }
        }));
    };

    const handleBulkSave = async () => {
        if (!schoolId) return;
        
        try {
            const batch = writeBatch(firestore);
            let processedCount = 0;

            for (const student of sourceStudents) {
                const decision = decisions[student.id!];
                if (!decision || decision.status === 'Radié' || decision.status === 'Transféré') {
                    // Si pas de décision ou départ, on met à jour le statut global à Radié
                    if (decision?.status === 'Radié' || decision?.status === 'Transféré') {
                        const studentRef = doc(firestore, `ecoles/${schoolId}/eleves/${student.id}`);
                        batch.update(studentRef, { status: decision.status });
                        processedCount++;
                    }
                    continue;
                }

                // Pour les promus ou redoublants
                const targetClass = classes.find(c => c.id === decision.targetClassId);
                const tuitionFee = 50000; // TODO: fetch from target class fees based on Niveau

                const studentRef = doc(firestore, `ecoles/${schoolId}/eleves/${student.id}`);
                
                // Préparer la nouvelle inscription
                const newEnrollment: student_enrollment = {
                    schoolId,
                    studentId: student.id!,
                    academicYear: targetYear,
                    classId: decision.targetClassId,
                    status: decision.status,
                    tuitionFee: tuitionFee,
                    amountDue: tuitionFee,
                    tuitionStatus: "Non payé",
                    createdAt: new Date().toISOString(),
                    createdBy: "system" // Or current user ID
                };

                const updatedEnrollments = [...(student.enrollments || [])];
                // Remove if already exists for target year
                const existingIndex = updatedEnrollments.findIndex(e => e.academicYear === targetYear);
                if (existingIndex >= 0) {
                    updatedEnrollments[existingIndex] = newEnrollment;
                } else {
                    updatedEnrollments.push(newEnrollment);
                }

                batch.update(studentRef, {
                    classId: decision.targetClassId,
                    tuitionFee: tuitionFee,
                    amountDue: tuitionFee,
                    tuitionStatus: "Non payé",
                    enrollments: updatedEnrollments,
                    status: "Actif"
                });

                processedCount++;
            }

            if (processedCount > 0) {
                await batch.commit();
                toast({ title: "Succès", description: `${processedCount} élèves transférés vers ${targetYear}.` });
                setDecisions({});
            } else {
                toast({ title: "Info", description: "Aucun changement à enregistrer." });
            }

        } catch (error) {
            console.error("Error during bulk promotion:", error);
            toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue lors de l'enregistrement." });
        }
    };

    const handleExportReport = async () => {
        if (!sourceStudents.length) return;
        try {
            await StudentReportsService.generateTransitionReportPdf(
                decisions,
                sourceStudents,
                classes,
                schoolData?.name || 'Notre École',
                sourceYear,
                targetYear,
                schoolData?.mainLogoUrl
            );
            toast({ title: 'Succès', description: 'Le rapport a été généré.' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Erreur lors de la génération du rapport.' });
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Passage en Classe Supérieure</h1>
                <p className="text-slate-500">Préparez la rentrée scolaire en transférant les élèves vers leur nouvelle classe.</p>
            </div>

            <Card className="bg-white/40 backdrop-blur-xl border border-white/60">
                <CardHeader>
                    <CardTitle>Configuration de la transition</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-6 items-end">
                    <div className="space-y-2 w-48">
                        <label className="text-xs font-black uppercase text-slate-400">Année Source</label>
                        <Select value={sourceYear} onValueChange={setSourceYear}>
                            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2023-2024">2023-2024</SelectItem>
                                <SelectItem value="2024-2025">2024-2025</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <ArrowRight className="h-6 w-6 text-slate-300 mb-2" />
                    <div className="space-y-2 w-48">
                        <label className="text-xs font-black uppercase text-slate-400">Année Cible</label>
                        <Select value={targetYear} onValueChange={setTargetYear}>
                            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2024-2025">2024-2025</SelectItem>
                                <SelectItem value="2025-2026">2025-2026</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 w-64 ml-auto">
                        <label className="text-xs font-black uppercase text-slate-400">Classe Source</label>
                        <Select value={sourceClassId} onValueChange={setSourceClassId}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Sélectionnez une classe" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Toutes les classes</SelectItem>
                                {classes.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-white/40 backdrop-blur-xl border border-white/60">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Élève</TableHead>
                                <TableHead>Classe Actuelle</TableHead>
                                <TableHead>Décision</TableHead>
                                <TableHead>Classe Cible ({targetYear})</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {studentsLoading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Chargement...</TableCell></TableRow>
                            ) : sourceStudents.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Aucun élève trouvé pour cette classe/année.</TableCell></TableRow>
                            ) : sourceStudents.map(student => {
                                const decision = decisions[student.id!];
                                const currentClass = classes.find(c => c.id === student.classId)?.name;
                                
                                return (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium">
                                            {student.firstName} {student.lastName}
                                            <div className="text-xs text-slate-500">{student.matricule}</div>
                                        </TableCell>
                                        <TableCell>{currentClass}</TableCell>
                                        <TableCell>
                                            <Select 
                                                value={decision?.status || ''} 
                                                onValueChange={(val: any) => handleDecision(student.id!, val, decision?.targetClassId || '')}
                                            >
                                                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Décision" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Promu">Admis</SelectItem>
                                                    <SelectItem value="Redoublant">Redouble</SelectItem>
                                                    <SelectItem value="Radié">Départ/Radié</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Select 
                                                value={decision?.targetClassId || ''} 
                                                onValueChange={(val: any) => handleDecision(student.id!, decision?.status || 'Promu', val)}
                                                disabled={decision?.status === 'Radié' || !decision?.status}
                                            >
                                                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Classe cible" /></SelectTrigger>
                                                <SelectContent>
                                                    {classes.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
                <div className="p-4 border-t border-white/60 flex justify-end gap-3">
                    <Button variant="outline" onClick={handleExportReport} className="rounded-xl border-slate-200">
                        <Download className="mr-2 h-4 w-4" /> Exporter le Rapport
                    </Button>
                    <Button onClick={handleBulkSave} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                        <Save className="mr-2 h-4 w-4" /> Enregistrer les transitions
                    </Button>
                </div>
            </Card>
        </div>
    );
}
