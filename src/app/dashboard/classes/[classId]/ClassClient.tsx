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
import { ArrowLeft, User, Users, Clock, BookOpen, CalendarDays, Download, Upload, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { TuitionStatusBadge } from '@/components/tuition-status-badge';
import type { class_type as Class, student as Student, timetableEntry as TimetableEntry } from '@/lib/data-types';
import { formatCurrency } from '@/lib/currency-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
    const { schoolId, loading: schoolLoading } = useSchoolData();
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

    const isLoading = schoolLoading || classLoading || studentsLoading;

    if (isLoading) {
        return <ClassDetailsSkeleton />;
    }

    if (!classData) {
        notFound();
    }

    // Heures standards de cours pour plages horaires
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

    // Volumes horaires par matière (Exemple école)
    const volumesHoraires = [
        { matiere: "Mathématiques", volume: "5 heures", coef: 4 },
        { matiere: "Français & Composition", volume: "6 heures", coef: 5 },
        { matiere: "Histoire-Géographie", volume: "3 heures", coef: 2 },
        { matiere: "Sciences de la Vie et de la Terre", volume: "2 heures", coef: 2 },
        { matiere: "Anglais", volume: "3 heures", coef: 3 },
        { matiere: "Éducation Physique et Sportive", volume: "2 heures", coef: 1 }
    ];

    // Jours de la semaine
    const joursSemaine = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

    // Simulation d'importation
    const handleImportExcel = () => {
        toast({
            title: "Importation Réussie !",
            description: "Le volume horaire a été mis à jour via Excel.",
        });
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
                            Planning Classe
                        </TabsTrigger>
                        <TabsTrigger value="plages" className="rounded-xl py-3 font-bold text-xs">
                            <Clock className="mr-2 h-4 w-4 text-slate-500" />
                            Plages horaires
                        </TabsTrigger>
                        <TabsTrigger value="volumes" className="rounded-xl py-3 font-bold text-xs">
                            <BookOpen className="mr-2 h-4 w-4 text-slate-500" />
                            Volume Horaires
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
                                <CardHeader className="px-0 pt-0">
                                    <CardTitle className="text-base font-bold text-slate-700">Registre des Élèves</CardTitle>
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

                        {/* Tab 2: Plages Horaires */}
                        <TabsContent value="plages" className="focus-visible:ring-0">
                            <Card className="border-none shadow-none bg-transparent">
                                <CardHeader className="px-0 pt-0">
                                    <CardTitle className="text-base font-bold text-slate-700">Configuration des Plages Horaires</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow>
                                                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Plage / Code</TableHead>
                                                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Heure Début</TableHead>
                                                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Heure Fin</TableHead>
                                                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Type</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {plagesHoraires.map(p => (
                                                <TableRow key={p.nom} className="hover:bg-slate-50/40">
                                                    <TableCell className="font-bold text-slate-800">{p.nom}</TableCell>
                                                    <TableCell className="font-mono text-slate-600">{p.start}</TableCell>
                                                    <TableCell className="font-mono text-slate-600">{p.end}</TableCell>
                                                    <TableCell>
                                                        <span className={cn(
                                                            "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                                            p.type === 'Cours' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                                                        )}>{p.type}</span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
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
                                        <CardDescription className="text-xs">Gérez le volume horaire requis par matière.</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5" onClick={() => toast({ title: "Téléchargement", description: "Le gabarit Excel a été téléchargé." })}>
                                            <Download className="h-3.5 w-3.5" /> Gabarit
                                        </Button>
                                        <Button size="sm" className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5" onClick={handleImportExcel}>
                                            <Upload className="h-3.5 w-3.5" /> Importer Excel
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow>
                                                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Matière</TableHead>
                                                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Volume Requis</TableHead>
                                                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Coefficient</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {volumesHoraires.map(v => (
                                                <TableRow key={v.matiere} className="hover:bg-slate-50/40">
                                                    <TableCell className="font-bold text-slate-800">{v.matiere}</TableCell>
                                                    <TableCell className="font-mono text-slate-600">{v.volume}</TableCell>
                                                    <TableCell className="font-mono text-slate-600 font-bold">{v.coef}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab 4: Emploi du temps Visuel */}
                        <TabsContent value="emploi" className="focus-visible:ring-0">
                            <Card className="border-none shadow-none bg-transparent">
                                <CardHeader className="px-0 pt-0">
                                    <CardTitle className="text-base font-bold text-slate-700">Grille Hebdomadaire des Cours</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table className="border rounded-xl">
                                            <TableHeader className="bg-slate-50">
                                                <TableRow>
                                                    <TableHead className="w-[100px] text-xs font-black uppercase text-slate-400">Créneau</TableHead>
                                                    {joursSemaine.map(j => (
                                                        <TableHead key={j} className="text-xs font-black uppercase text-slate-400">{j}</TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {plagesHoraires.filter(p => p.type === 'Cours').map(plage => (
                                                    <TableRow key={plage.nom} className="h-16">
                                                        <TableCell className="font-bold text-xs text-slate-500 font-mono">
                                                            {plage.nom} ({plage.start}-{plage.end})
                                                        </TableCell>
                                                        {joursSemaine.map(jour => {
                                                            // Trouver une entrée de cours correspondante
                                                            const match = timetableEntries.find(e => 
                                                                e.day === jour && 
                                                                (e.startTime === plage.start || (e.startTime >= plage.start && e.startTime < plage.end))
                                                            );
                                                            return (
                                                                <TableCell key={jour} className="p-1 border-l">
                                                                    {match ? (
                                                                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 h-full flex flex-col justify-center">
                                                                            <p className="text-xs font-bold text-indigo-700 leading-tight">{match.subject}</p>
                                                                            <p className="text-[9px] text-indigo-500 font-medium truncate mt-0.5">{match.classroom || 'Salle N/A'}</p>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-[10px] text-slate-300 italic flex justify-center items-center h-full">-</span>
                                                                    )}
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                    </div>
                </Tabs>
            </div>
        </div>
    );
}
