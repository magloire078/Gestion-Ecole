'use client';

import { useParams, useRouter, notFound } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, collection, query, where, type DocumentReference, type DocumentData, type Query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Users, Clock, BookOpen, CalendarDays, Download, Upload, CheckCircle2, Contact, Plus } from 'lucide-react';
import Link from 'next/link';
import { TuitionStatusBadge } from '@/components/tuition-status-badge';
import type { class_type as Class, student as Student, timetableEntry as TimetableEntry, staff as Staff } from '@/lib/data-types';
import { formatCurrency } from '@/lib/currency-utils';
import { StudentCardService, StudentCardData } from '@/services/student-card-service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { DraggableTimetableEntry } from '@/components/timetable/draggable-entry';
import { DroppableCell } from '@/components/timetable/droppable-cell';
import { TimetableService } from '@/services/timetable-service';
import { TimetablePDFService } from '@/services/timetable-pdf-service';
import { useTimetable } from '@/hooks/use-timetable';
import { validateMove } from '@/lib/timetable-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TimetableForm } from '@/components/timetable/timetable-form';
import { useSubjects } from '@/hooks/use-subjects';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FinancialReportsService, type StudentWithPayments } from '@/services/financial-reports-service';
import { ClassListReportService } from '@/services/class-list-service';
import { getDocs } from 'firebase/firestore';

function ClassDetailsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10" />
                <div className="space-y-2">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-96" />
        </div>
    );
}

export default function ClassDetailsClient() {
    const params = useParams();
    const router = useRouter();
    const classId = params.classId as string;
    const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();
    const { toast } = useToast();

    // Fetch Class Details
    const classRef = useMemo(() =>
        (schoolId && classId) ? doc(firestore, `ecoles/${schoolId}/classes/${classId}`) as DocumentReference<Class, DocumentData> : null
        , [firestore, schoolId, classId]);
    const { data: classData, loading: classLoading } = useDoc<Class>(classRef);

    // Fetch Students in this class
    const studentsQuery = useMemo(() =>
        (schoolId && classId) ? query(collection(firestore, `ecoles/${schoolId}/eleves`), where('classId', '==', classId)) as Query<Student, DocumentData> : null
        , [firestore, schoolId, classId]);
    const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
    const students = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);

    // Fetch Emploi du Temps
    const timetableQuery = useMemo(() =>
        (schoolId && classId) ? query(collection(firestore, `ecoles/${schoolId}/emploi_du_temps`), where('classId', '==', classId)) as Query<TimetableEntry, DocumentData> : null
        , [firestore, schoolId, classId]);
    const { data: timetableData } = useCollection(timetableQuery);
    const timetableEntries = useMemo(() => timetableData?.map(d => ({ id: d.id, ...d.data() } as TimetableEntry & { id: string })) || [], [timetableData]);

    // Data for timetable form
    const allTeachersQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`), where('role', '==', 'enseignant')) as Query<Staff, DocumentData> : null, [schoolId, firestore]);
    const { data: teachersData } = useCollection(allTeachersQuery);
    const teachers = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [teachersData]);
    const { subjects } = useSubjects(schoolId);
    
    // Fetch all timetable entries for conflict detection across all classes
    const { timetable: allEntries } = useTimetable(schoolId || '', 'all');

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
    const [isGeneratingFinancePDF, setIsGeneratingFinancePDF] = useState(false);

    const generateFinancialReport = async (filter: 'all' | 'paid' | 'unpaid' = 'all') => {
        if (!schoolId || !classData || students.length === 0) return;
        setIsGeneratingFinancePDF(true);
        toast({ title: "Génération en cours...", description: "Veuillez patienter pendant la création du bilan." });
        try {
            const studentsWithPayments: StudentWithPayments[] = await Promise.all(students.map(async (s) => {
                const paymentsRef = collection(firestore, `ecoles/${schoolId}/eleves/${s.id}/paiements`);
                const q = query(paymentsRef); 
                const snap = await getDocs(q);
                const paymentHistory = snap.docs.map(doc => doc.data() as any);
                return { ...s, paymentHistory };
            }));
            
            FinancialReportsService.generateClassFinancialReportPdf(schoolData as any, classData, studentsWithPayments, schoolData?.mainLogoUrl, filter);
            
            toast({
                title: "Succès",
                description: "Le bilan financier a été généré avec succès."
            });
        } catch (e) {
            console.error("Erreur lors de la génération du bilan financier :", e);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de générer le bilan financier."
            });
        } finally {
            setIsGeneratingFinancePDF(false);
        }
    };

    const handleGenerateCards = async () => {
        if (!classData || students.length === 0) return;
        toast({ title: "Génération en cours...", description: "Veuillez patienter pendant la création des QR codes." });
        
        const cardDataList: StudentCardData[] = students.map(s => ({
            id: s.id!,
            firstName: s.firstName || '',
            lastName: s.lastName || '',
            matricule: s.matricule || 'N/A',
            className: classData.name,
            academicYear: classData.academicYear || '',
            photoUrl: s.photoURL,
            dateOfBirth: s.dateOfBirth
        }));

        await StudentCardService.generateCardsPDF(cardDataList, {
            name: schoolData?.name || 'École',
            logoUrl: schoolData?.mainLogoUrl,
            motto: schoolData?.motto
        });
    };

    const isLoading = schoolLoading || classLoading || studentsLoading;

    if (isLoading) {
        return <ClassDetailsSkeleton />;
    }

    if (!classData) {
        notFound();
    }

    // Heures standards de cours pour plages horaires (utilisé pour la grille visuelle)
    const plagesHoraires = [
        { nom: "M1", start: "08:00", end: "09:00", type: "Cours" },
        { nom: "M2", start: "09:00", end: "10:00", type: "Cours" },
        { nom: "Récréation", start: "10:00", end: "10:15", type: "Pause" },
        { nom: "M3", start: "10:15", end: "11:15", type: "Cours" },
        { nom: "M4", start: "11:15", end: "12:15", type: "Cours" },
        { nom: "Midi", start: "12:15", end: "14:00", type: "Pause" },
        { nom: "A1", start: "14:00", end: "15:00", type: "Cours" },
        { nom: "A2", start: "15:00", end: "16:00", type: "Cours" }
    ];

    const computedVolumesHoraires = useMemo(() => {
        const volumes: Record<string, number> = {};
        
        timetableEntries.forEach(entry => {
            const start = new Date(`2000-01-01T${entry.startTime}:00`);
            const end = new Date(`2000-01-01T${entry.endTime}:00`);
            const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            
            if (!volumes[entry.subject]) {
                volumes[entry.subject] = 0;
            }
            volumes[entry.subject] += durationHours;
        });

        return Object.keys(volumes).map(subjectName => {
            return {
                matiere: subjectName,
                volume: `${Math.round(volumes[subjectName] * 10) / 10} heure${volumes[subjectName] > 1 ? 's' : ''}`,
                coef: '-'
            };
        }).sort((a, b) => a.matiere.localeCompare(b.matiere));
    }, [timetableEntries, subjects]);

    // Jours de la semaine
    const joursSemaine = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || !schoolId) return;

        const entry = active.data.current?.entry as TimetableEntry;
        const [overDay, overTime] = (over.id as string).split('-');

        const startObj = new Date(`2000/01/01 ${entry.startTime}`);
        const endObj = new Date(`2000/01/01 ${entry.endTime}`);
        const durationMs = endObj.getTime() - startObj.getTime();
        
        const newStartObj = new Date(`2000/01/01 ${overTime}`);
        const newEndObj = new Date(newStartObj.getTime() + durationMs);
        const newEndTime = newEndObj.toTimeString().substring(0, 5);

        if (entry.day !== overDay || entry.startTime !== overTime) {
            // Check for conflicts before updating
            const conflicts = validateMove(entry, overDay as any, overTime, allEntries);
            if (conflicts.length > 0) {
                toast({ variant: "destructive", title: "Conflit détecté", description: conflicts[0] });
                return;
            }

            try {
                await TimetableService.updateEntry(schoolId, entry.id!, {
                    ...entry,
                    day: overDay as any,
                    startTime: overTime,
                    endTime: newEndTime
                });
                toast({ title: "Déplacé", description: "Le cours a été déplacé avec succès." });
            } catch (e) {
                toast({ variant: "destructive", title: "Erreur", description: "Impossible de déplacer le cours." });
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Retour</span>
                </Button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">{classData.name}</h1>
                    <p className="text-sm text-slate-500 font-medium">Année scolaire {classData.academicYear}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-black uppercase tracking-widest text-slate-400">Enseignant Principal</CardDescription>
                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2 mt-1">
                            <User className="h-5 w-5 text-indigo-500" />
                            {classData.mainTeacherName || 'Non assigné'}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-black uppercase tracking-widest text-slate-400">Effectif</CardDescription>
                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2 mt-1">
                            <Users className="h-5 w-5 text-indigo-500" />
                            <span className="font-mono text-indigo-600">{classData.studentCount}</span>
                            <span className="text-slate-400">/</span>
                            <span className="text-slate-500 font-mono">{classData.maxStudents || 30}</span>
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-black uppercase tracking-widest text-slate-400">Taux de Remplissage</CardDescription>
                        <CardTitle className="text-lg font-bold text-slate-800 mt-1">
                            {classData.maxStudents > 0 ? `${Math.round((classData.studentCount / classData.maxStudents) * 100)}%` : 'N/A'}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Onglets Multiniveau de Détails Classe */}
            <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-2 rounded-2xl shadow-md">
                <Tabs defaultValue="eleves" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-transparent p-1 h-auto gap-2">
                        <TabsTrigger value="eleves" className="rounded-xl py-3 font-bold text-xs">
                            <Users className="mr-2 h-4 w-4 text-slate-500" />
                            Liste des élèves
                        </TabsTrigger>
                        <TabsTrigger value="emploi" className="rounded-xl py-3 font-bold text-xs">
                            <CalendarDays className="mr-2 h-4 w-4 text-slate-500" />
                            Emploi du Temps
                        </TabsTrigger>
                    </TabsList>

                    <div className="px-2 pb-2 mt-4">
                        
                        {/* Tab 1: Liste des élèves */}
                        <TabsContent value="eleves" className="focus-visible:ring-0">
                            <Card className="border-none shadow-none bg-transparent">
                                <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
                                    <CardTitle className="text-base font-bold text-slate-700">Registre des Élèves</CardTitle>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => ClassListReportService.generateClassListPDF(schoolData as any, classData, students, schoolData?.mainLogoUrl)}>
                                            <Download className="mr-2 h-4 w-4" /> Liste PDF
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={handleGenerateCards}>
                                            <IdCard className="mr-2 h-4 w-4" /> Cartes Scolaires
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" disabled={isGeneratingFinancePDF}>
                                                    <Download className="mr-2 h-4 w-4" /> Bilan Financier
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56">
                                                <DropdownMenuItem onClick={() => generateFinancialReport('all')}>
                                                    Tous les élèves
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => generateFinancialReport('paid')} className="text-emerald-600">
                                                    Uniquement les Soldés (Reste = 0)
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => generateFinancialReport('unpaid')} className="text-rose-600">
                                                    Uniquement les Impayés (Reste &gt; 0)
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow>
                                                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Élève</TableHead>
                                                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Matricule</TableHead>
                                                <TableHead className="text-center text-xs font-black uppercase tracking-widest text-slate-400">Scolarité</TableHead>
                                                <TableHead className="text-right text-xs font-black uppercase tracking-widest text-slate-400">Solde Restant</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {students.length > 0 ? students.map(student => (
                                                <TableRow key={student.id} className="hover:bg-slate-50/40">
                                                    <TableCell>
                                                        <Link href={`/dashboard/dossiers-eleves/details?id=${student.id}`} className="flex items-center gap-3 hover:underline">
                                                            <Avatar className="h-9 w-9">
                                                                <AvatarImage src={student.photoURL || ''} alt={`${student.firstName} ${student.lastName}`} />
                                                                <AvatarFallback className="bg-slate-100 font-bold">{student.firstName?.[0]}{student.lastName?.[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-bold text-slate-900">{student.firstName} {student.lastName}</p>
                                                                {student.statusAff === 'Affecté' && (
                                                                    <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200/50">Affecté</span>
                                                                )}
                                                            </div>
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-slate-500">{student.matricule}</TableCell>
                                                    <TableCell className="text-center">
                                                        <TuitionStatusBadge status={student.tuitionStatus || 'Partiel'} />
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-bold text-slate-900">{formatCurrency(student.amountDue)}</TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center h-24 text-slate-400">Aucun élève inscrit dans cette classe.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab 3: Volume Horaires */}
                        <TabsContent value="volumes" className="focus-visible:ring-0">
                            <Card className="border-none shadow-none bg-transparent">
                                <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
                                    <div>
                                        <CardTitle className="text-base font-bold text-slate-700">Volumes Horaires Hebdomadaires</CardTitle>
                                        <CardDescription className="text-xs">Volumes calculés automatiquement d'après l'emploi du temps.</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow>
                                                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Matière</TableHead>
                                                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Volume Enseigné</TableHead>
                                                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Coefficient</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {computedVolumesHoraires.length > 0 ? computedVolumesHoraires.map(v => (
                                                <TableRow key={v.matiere} className="hover:bg-slate-50/40">
                                                    <TableCell className="font-bold text-slate-800">{v.matiere}</TableCell>
                                                    <TableCell className="font-mono text-slate-600">{v.volume}</TableCell>
                                                    <TableCell className="font-mono text-slate-600 font-bold">{v.coef}</TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="text-center h-24 text-slate-400">Aucun cours dans l'emploi du temps.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab 4: Emploi du temps Visuel */}
                        <TabsContent value="emploi" className="focus-visible:ring-0">
                            <Card className="border-none shadow-none bg-transparent">
                                <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
                                    <CardTitle className="text-base font-bold text-slate-700">Grille Hebdomadaire des Cours</CardTitle>
                                    <div className="flex gap-2">
                                        <Button variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 rounded-xl h-9 text-xs" onClick={() => TimetablePDFService.generateTimetablePDF(schoolData as any, classData, timetableEntries, teachers)}>
                                            <Download className="mr-2 h-4 w-4" /> Exporter PDF
                                        </Button>
                                        <Button onClick={() => { setEditingEntry(null); setIsFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 text-xs">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Ajouter un cours
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <div className="overflow-x-auto">
                                            <Table className="border rounded-xl">
                                                <TableHeader className="bg-slate-50">
                                                    <TableRow>
                                                        <TableHead className="w-[100px] text-xs font-black uppercase text-slate-400">Créneau</TableHead>
                                                        {joursSemaine.map(j => (
                                                            <TableHead key={j} className="text-xs font-black uppercase text-slate-400 text-center">{j}</TableHead>
                                                        ))}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {plagesHoraires.filter(p => p.type === 'Cours').map(plage => (
                                                        <TableRow key={plage.nom}>
                                                            <TableCell className="font-bold text-xs text-slate-500 font-mono align-top pt-4">
                                                                {plage.nom} <br/><span className="text-[10px] text-slate-400">({plage.start}-{plage.end})</span>
                                                            </TableCell>
                                                            {joursSemaine.map(jour => {
                                                                const matches = timetableEntries.filter(e => 
                                                                    e.day === jour && 
                                                                    (e.startTime === plage.start || (e.startTime >= plage.start && e.startTime < plage.end))
                                                                );
                                                                return (
                                                                    <TableCell key={jour} className="p-0 border-l">
                                                                        <DroppableCell day={jour as any} time={plage.start}>
                                                                            {matches.map(match => (
                                                                                <DraggableTimetableEntry
                                                                                    key={match.id}
                                                                                    entry={match}
                                                                                    teacher={teachers.find(t => t.id === match.teacherId)}
                                                                                    canManage={true}
                                                                                    color={match.color}
                                                                                    onEdit={(e) => { setEditingEntry(e); setIsFormOpen(true); }}
                                                                                    onDelete={async (e) => {
                                                                                        if (confirm("Supprimer ce cours ?")) {
                                                                                            await TimetableService.deleteEntry(schoolId!, e.id!);
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            ))}
                                                                        </DroppableCell>
                                                                    </TableCell>
                                                                );
                                                            })}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </DndContext>
                                </CardContent>
                            </Card>
                        </TabsContent>

                    </div>
                </Tabs>
            </div>
            
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-2xl bg-white/90 backdrop-blur-xl border-white/60 shadow-2xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
                            {editingEntry ? 'Modifier le cours' : 'Ajouter un cours'}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            Configurez les détails du cours dans l'emploi du temps de la classe.
                        </DialogDescription>
                    </DialogHeader>
                    {classData && (
                        <TimetableForm 
                            schoolId={schoolId!}
                            entry={editingEntry}
                            classes={[{ id: classId, ...classData }]}
                            teachers={teachers}
                            subjects={subjects}
                            onSave={() => setIsFormOpen(false)}
                            onCancel={() => setIsFormOpen(false)}
                            defaultValues={{ classId }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
