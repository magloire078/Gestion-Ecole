'use client';
// Force TS check

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
import { MessageSquare, Search, Loader2, Download, Users } from "lucide-react";
import { TuitionStatusBadge } from "@/components/tuition-status-badge";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency-utils";
import { motion, AnimatePresence } from "framer-motion";
export default function PaymentsPage() {
    const firestore = useFirestore();
    const { schoolId, schoolName, loading: schoolDataLoading } = useSchoolData();
    const { toast } = useToast();

    const studentsQuery = useMemo(() => schoolId ? collection(firestore, `ecoles/${schoolId}/eleves`) : null, [firestore, schoolId]);
    const classesQuery = useMemo(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);

    const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
    const { data: classesData, loading: classesLoading } = useCollection(classesQuery);

    const students: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);
    const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [isGeneratingReminder, setIsGeneratingReminder] = useState(false);

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


    const handleExportCSV = () => {
        if (filteredStudents.length === 0) return;

        const headers = ["Matricule", "Nom", "Prénom", "Classe", "Statut", "Montant Payé", "Solde Dû"];
        const rows = filteredStudents.map(s => [
            s.matricule || '',
            s.lastName,
            s.firstName,
            s.class || '',
            s.tuitionStatus || 'Partiel',
            ((s.tuitionFee || 0) - (s.amountDue || 0)).toString(),
            (s.amountDue || 0).toString()
        ]);

        const csvContent = "\ufeff" + [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `paiements_${selectedClass !== 'all' ? classes.find(c => c.id === selectedClass)?.name : 'tous'}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Export réussi", description: "Le fichier CSV a été téléchargé." });
    };

    async function handleSendReminder(student: Student) {
        if (!schoolId || !schoolName) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Données de l\'école non disponibles.' });
            return;
        }

        const parentEmail = student.parent1Email || student.parent2Email;
        if (!parentEmail) {
            toast({
                variant: 'destructive',
                title: 'Email manquant',
                description: 'Aucune adresse email n\'est enregistrée pour les parents de cet élève.'
            });
            return;
        }

        setIsGeneratingReminder(true);
        try {
            const { MailService } = await import('@/services/mail-service');
            const mailService = new MailService(firestore);

            const parentName = student.parent1FirstName ? `${student.parent1FirstName} ${student.parent1LastName}` : "Cher Parent";

            const result = await mailService.sendTuitionReminder(
                parentEmail,
                parentName,
                `${student.firstName} ${student.lastName}`,
                student.amountDue || 0,
                schoolName
            );

            if (result.success) {
                toast({
                    title: "Rappel envoyé",
                    description: `L'email de relance a été envoyé à ${parentEmail}.`
                });
            } else {
                throw new Error("Échec de l'envoi");
            }
        } catch (e) {
            console.error("Failed to send reminder:", e);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Impossible d\'envoyer le rappel par email.'
            });
        } finally {
            setIsGeneratingReminder(false);
        }
    }

    async function handleMassReminder() {
        if (!schoolId || !schoolName) return;

        const lateStudents = filteredStudents.filter(s => s.amountDue && s.amountDue > 0 && (s.parent1Email || s.parent2Email));

        if (lateStudents.length === 0) {
            toast({ title: "Info", description: "Aucun élève avec un solde dû et un email valide n'a été trouvé." });
            return;
        }

        if (!confirm(`Voulez-vous envoyer un rappel par email aux parents de ${lateStudents.length} élèves ?`)) {
            return;
        }

        setIsGeneratingReminder(true);
        let sentCount = 0;
        let errorCount = 0;

        try {
            const { MailService } = await import('@/services/mail-service');
            const mailService = new MailService(firestore);

            for (const student of lateStudents) {
                const parentEmail = (student.parent1Email || student.parent2Email)!;
                const parentName = student.parent1FirstName ? `${student.parent1FirstName} ${student.parent1LastName}` : "Cher Parent";

                const result = await mailService.sendTuitionReminder(
                    parentEmail,
                    parentName,
                    `${student.firstName} ${student.lastName}`,
                    student.amountDue || 0,
                    schoolName
                );

                if (result.success) sentCount++;
                else errorCount++;
            }

            toast({
                title: "Relance groupée terminée",
                description: `${sentCount} emails envoyés avec succès. ${errorCount} échecs.`
            });
        } catch (e) {
            console.error("Mass reminder failed:", e);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue lors de la relance groupée.' });
        } finally {
            setIsGeneratingReminder(false);
        }
    }


    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-600 bg-clip-text text-transparent">Suivi des Paiements</h1>
                    <p className="text-slate-500 max-w-2xl text-sm font-medium">Gestion centralisée et analytique des flux de scolarité.</p>
                </div>
                <div className="flex gap-3">
                    <Button 
                        variant="outline" 
                        onClick={handleExportCSV} 
                        disabled={isLoading || filteredStudents.length === 0}
                        className="rounded-xl border-white/60 bg-white/40 backdrop-blur-md hover:bg-white/60 shadow-sm font-bold h-11"
                    >
                        <Download className="mr-2 h-4 w-4" /> Exporter CSV
                    </Button>
                    {selectedClass !== 'all' && filteredStudents.some(s => s.amountDue && s.amountDue > 0) && (
                        <Button 
                            variant="secondary" 
                            onClick={handleMassReminder} 
                            disabled={isGeneratingReminder}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 font-bold h-11"
                        >
                            {isGeneratingReminder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                            Relancer la classe
                        </Button>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="md:col-span-1 bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden border-t-white/80 transition-all duration-500 hover:shadow-2xl hover:shadow-rose-100/50 group">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total dû (filtré)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col">
                                <div className="text-3xl font-black text-rose-600 tracking-tighter">
                                    {isLoading ? <Skeleton className="h-10 w-48 rounded-lg" /> : formatCurrency(totalDue)}
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: "100%" }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            className="h-full bg-rose-500/30"
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-rose-500">ATTENTION</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="md:col-span-3 bg-white/30 backdrop-blur-lg border border-white/40 p-6 rounded-[2rem] shadow-xl shadow-slate-200/30 flex flex-col md:flex-row items-center gap-4">
                        <div className="relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                type="search"
                                placeholder="Chercher par nom ou matricule..."
                                className="pl-11 w-full bg-white/50 border-white/60 rounded-2xl h-12 focus:ring-indigo-500 font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <Select value={selectedClass} onValueChange={setSelectedClass} disabled={isLoading}>
                                <SelectTrigger className="w-full md:w-[200px] bg-white/50 border-white/60 rounded-2xl h-12 font-bold text-slate-700">
                                    <SelectValue placeholder="Toutes les classes" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-white/40">
                                    <SelectItem value="all">Toutes les classes</SelectItem>
                                    {classes.map(cls => (
                                        <SelectItem key={cls.id} value={cls.id!} className="font-medium">{cls.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={selectedStatus} onValueChange={setSelectedStatus} disabled={isLoading}>
                                <SelectTrigger className="w-full md:w-[200px] bg-white/50 border-white/60 rounded-2xl h-12 font-bold text-slate-700">
                                    <SelectValue placeholder="Tous les statuts" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-white/40">
                                    <SelectItem value="all">Tous les statuts</SelectItem>
                                    <SelectItem value="Soldé">Soldé</SelectItem>
                                    <SelectItem value="En retard">En retard</SelectItem>
                                    <SelectItem value="Partiel">Partiel</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <Card className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden border-t-white/80">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50/40">
                                <TableRow className="border-b-slate-100/50 hover:bg-transparent">
                                    <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-[0.2em] pl-10 h-16">Nom de l&apos;Élève</TableHead>
                                    <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-[0.2em] h-16">Classe</TableHead>
                                    <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-[0.2em] text-center h-16">Statut du Paiement</TableHead>
                                    <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-[0.2em] text-right h-16">Montant Payé</TableHead>
                                    <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-[0.2em] text-right h-16">Solde Dû</TableHead>
                                    <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-[0.2em] text-right pr-10 h-16">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i} className="h-20">
                                            <TableCell className="pl-10"><Skeleton className="h-6 w-32 rounded-lg" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-lg" /></TableCell>
                                            <TableCell className="text-center"><Skeleton className="h-8 w-24 mx-auto rounded-full" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-6 w-24 ml-auto rounded-lg" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-6 w-24 ml-auto rounded-lg" /></TableCell>
                                            <TableCell className="pr-10 text-right"><Skeleton className="h-10 w-24 ml-auto rounded-xl" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredStudents.length > 0 ? (
                                    <AnimatePresence mode="popLayout">
                                        {filteredStudents.map((student, idx) => (
                                            <motion.tr 
                                                key={student.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ duration: 0.3, delay: idx * 0.05 }}
                                                className="group hover:bg-indigo-50/30 transition-all duration-300 border-b border-slate-50/50 last:border-0 h-20"
                                            >
                                                <TableCell className="pl-10">
                                                    <Link href={`/dashboard/dossiers-eleves/${student.id}`} className="font-black text-slate-800 hover:text-indigo-600 transition-colors tracking-tight">
                                                        {student.firstName} {student.lastName}
                                                    </Link>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{student.matricule || 'Sans matricule'}</p>
                                                </TableCell>
                                                <TableCell className="font-bold text-slate-600">{student.class}</TableCell>
                                                <TableCell className="text-center">
                                                    <TuitionStatusBadge
                                                        status={student.tuitionStatus || 'Partiel'}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-black text-emerald-600 tracking-tighter">
                                                    {formatCurrency((student.tuitionFee || 0) - (student.amountDue || 0))}
                                                </TableCell>
                                                <TableCell className="text-right font-black text-rose-600 tracking-tighter">
                                                    {formatCurrency(student.amountDue || 0)}
                                                </TableCell>
                                                <TableCell className="pr-10 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                        {student.amountDue && student.amountDue > 0 && (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                onClick={() => handleSendReminder(student)} 
                                                                disabled={isGeneratingReminder}
                                                                className="h-9 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all font-bold"
                                                            >
                                                                <MessageSquare className="mr-2 h-4 w-4" />
                                                                Relancer
                                                            </Button>
                                                        )}
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            asChild
                                                            className="h-9 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white transition-all font-bold"
                                                        >
                                                            <Link href={`/dashboard/dossiers-eleves/${student.id}?tab=payments`}>
                                                                Gérer
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-64">
                                            <div className="flex flex-col items-center justify-center text-center">
                                                <div className="p-6 bg-slate-50 rounded-[2rem] mb-4">
                                                    <Search className="h-12 w-12 text-slate-300" />
                                                </div>
                                                <h4 className="text-xl font-black text-slate-900 tracking-tight">Aucun résultat</h4>
                                                <p className="text-slate-500 max-w-[280px] mt-2 font-medium">
                                                    Nous n&apos;avons trouvé aucun élève correspondant à vos critères de recherche.
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    );
}

