'use client';

import { useSearchParams, notFound } from 'next/navigation';
import { useMemo, useState, Suspense } from 'react';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, doc, query, where, addDoc, deleteDoc, type DocumentReference, type DocumentData } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { competition as Competition, student as Student, participationCompetition as Participation } from '@/lib/data-types';
import { PlusCircle, Trash2, Trophy, Medal, Users, Printer, Star } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ParticipationWithStudentName extends Participation {
    id: string;
    studentName?: string;
}

function CompetitionContent({ competitionId }: { competitionId: string }) {
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const canManageActivities = !!user?.profile?.permissions?.manageActivities;

    const [selectedStudent, setSelectedStudent] = useState('');
    const [rank, setRank] = useState('');

    const competitionRef = useMemo(() => (schoolId && competitionId) ? doc(firestore, `ecoles/${schoolId}/competitions/${competitionId}`) as DocumentReference<Competition, DocumentData> : null, [firestore, schoolId, competitionId]);
    const { data: competitionData, loading: competitionLoading } = useDoc<Competition>(competitionRef);

    const studentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [firestore, schoolId]);
    const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
    const students = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student & { id: string })) || [], [studentsData]);

    const participantsQuery = useMemo(() => (schoolId && competitionId) ? query(collection(firestore, `ecoles/${schoolId}/participations_competitions`), where('competitionId', '==', competitionId)) : null, [firestore, schoolId, competitionId]);
    const { data: participantsData, loading: participantsLoading } = useCollection(participantsQuery);

    const participants: ParticipationWithStudentName[] = useMemo(() => {
        if (!participantsData) return [];
        const studentMap = new Map(students.map(s => [s.id, `${s.firstName} ${s.lastName}`]));
        return participantsData.map(doc => {
            const data = doc.data() as Participation;
            return {
                id: doc.id,
                ...data,
                studentName: studentMap.get(data.studentId) || 'Élève inconnu',
            };
        });
    }, [participantsData, students]);

    const availableStudents = useMemo(() => {
        const participantIds = new Set(participants.map(p => p.studentId));
        return students.filter(s => !participantIds.has(s.id));
    }, [students, participants]);

    const stats = useMemo(() => {
        const total = participants.length;
        const podium = participants
            .filter(p => (p.rank || '').toLowerCase().includes('1er') || (p.rank || '').toLowerCase().includes('1ère') || (p.rank || '').toLowerCase().includes('premier'))
            .length;
        return { total, podium };
    }, [participants]);

    const podiumParticipants = useMemo(() => {
        return participants
            .filter(p => {
                const r = (p.rank || '').toLowerCase();
                return r.includes('1er') || r.includes('2ème') || r.includes('3ème') ||
                    r.includes('1st') || r.includes('2nd') || r.includes('3rd');
            })
            .sort((a, b) => {
                const getScore = (r: string) => {
                    const lowR = r.toLowerCase();
                    if (lowR.includes('1')) return 3;
                    if (lowR.includes('2')) return 2;
                    if (lowR.includes('3')) return 1;
                    return 0;
                };
                return getScore(b.rank || '') - getScore(a.rank || '');
            });
    }, [participants]);

    const handleSendResultsEmail = async () => {
        if (!schoolId || !schoolName || !competitionData || participants.length === 0) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Données insuffisantes pour l\'envoi.' });
            return;
        }

        if (!confirm(`Voulez-vous envoyer les résultats par email aux parents de ${participants.length} participants ?`)) {
            return;
        }

        const { MailService } = await import('@/services/mail-service');
        const mailService = new MailService(firestore);
        let sentCount = 0;
        let errorCount = 0;

        for (const p of participants) {
            const student = students.find(s => s.id === p.studentId);
            const parentEmail = (student as any)?.parent1Email || (student as any)?.parent2Email;

            if (parentEmail) {
                const result = await mailService.sendCompetitionResultEmail(
                    parentEmail,
                    p.studentName || 'Élève',
                    competitionData.name,
                    p.rank || 'Participant',
                    schoolName
                );
                if (result.success) sentCount++;
                else errorCount++;
            } else {
                errorCount++;
            }
        }

        toast({
            title: "Notification terminée",
            description: `${sentCount} emails envoyés. ${errorCount} échecs (emails manquants ou erreurs).`
        });
    };

    const handlePrintResults = () => {
        if (!competitionData) return;
        const doc = new jsPDF();

        // Header
        doc.setFillColor(12, 54, 90);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("RÉSULTATS DE COMPÉTITION", 105, 18, { align: 'center' });
        doc.setFontSize(12);
        doc.text(competitionData.name.toUpperCase(), 105, 28, { align: 'center' });
        doc.text(`Date : ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, 105, 35, { align: 'center' });

        // Table
        autoTable(doc, {
            startY: 50,
            head: [['Rang', 'Élève', 'Notes/Observations']],
            body: participants.map(p => [(p.rank || ''), p.studentName, p.notes || '-']),
            headStyles: { fillColor: [12, 54, 90], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [245, 247, 249] },
        });

        doc.save(`resultats_${competitionData.name.replace(/\s+/g, '_').toLowerCase()}.pdf`);
    };

    const handleAddParticipant = async () => {
        if (!schoolId || !competitionId || !selectedStudent) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner un élève.' });
            return;
        }
        const dataToSave = {
            studentId: selectedStudent,
            competitionId,
            rank: rank || 'Participant',
            notes: ''
        };
        const participantsCollectionRef = collection(firestore, `ecoles/${schoolId}/participations_competitions`);
        try {
            await addDoc(participantsCollectionRef, dataToSave);
            toast({ title: 'Participant ajouté', description: "L'élève a été ajouté à la compétition." });

            // Envoi de l'email de confirmation
            const student = students.find(s => s.id === selectedStudent);
            const parentEmail = (student as any)?.parent1Email || (student as any)?.parent2Email;
            if (parentEmail && schoolName && competitionData) {
                const { MailService } = await import('@/services/mail-service');
                const mailService = new MailService(firestore);
                await mailService.sendCompetitionRegistrationEmail(
                    parentEmail,
                    `${student?.firstName} ${student?.lastName}`,
                    competitionData.name,
                    schoolName
                );
            }

            setSelectedStudent('');
            setRank('');
        } catch (error) {
            console.error("Error adding participant:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'ajouter le participant.' });
        }
    };

    const handleDeleteParticipant = async (participantId: string) => {
        if (!schoolId) return;
        const participantDocRef = doc(firestore, `ecoles/${schoolId}/participations_competitions`, participantId);
        try {
            await deleteDoc(participantDocRef);
            toast({ title: 'Participant retiré', description: "L'élève a été retiré de la compétition." });
        } catch (error) {
            console.error("Error deleting participant:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de retirer le participant.' });
        }
    }

    const isLoading = schoolLoading || competitionLoading || studentsLoading || participantsLoading;

    if (isLoading) {
        return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;
    }

    if (!competitionData) {
        notFound();
    }

    return (
        <div className="space-y-6">
            {/* Statistiques et Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-900 border-blue-100 dark:border-blue-900/30 shadow-md transform hover:scale-[1.02] transition-all duration-300">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Participants</p>
                                <h3 className="text-3xl font-bold mt-1">{stats.total}</h3>
                            </div>
                            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Users size={24} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-100 dark:border-amber-900/30 shadow-md transform hover:scale-[1.02] transition-all duration-300">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Podium (1ers)</p>
                                <h3 className="text-3xl font-bold mt-1">{stats.podium}</h3>
                            </div>
                            <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <Trophy size={24} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-100 dark:border-emerald-900/30 shadow-md flex items-center justify-center cursor-pointer hover:shadow-lg transition-all" onClick={handlePrintResults}>
                    <CardContent className="pt-6 text-center">
                        <Printer className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
                        <p className="font-bold text-emerald-700 dark:text-emerald-400">Imprimer les Résultats</p>
                    </CardContent>
                </Card>

                {canManageActivities && participants.length > 0 && (
                    <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900 border-indigo-100 dark:border-indigo-900/30 shadow-md flex items-center justify-center cursor-pointer hover:shadow-lg transition-all" onClick={handleSendResultsEmail}>
                        <CardContent className="pt-6 text-center">
                            <Trophy className="mx-auto h-8 w-8 text-indigo-600 mb-2" />
                            <p className="font-bold text-indigo-700 dark:text-indigo-400">Notifier les Parents</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {podiumParticipants.length > 0 && (
                <Card className="border-none shadow-xl bg-slate-900 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Star className="w-32 h-32 text-amber-400 animate-pulse" />
                    </div>
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Medal className="text-amber-400" /> Meilleures Performances
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4 items-end justify-center pb-4">
                            {podiumParticipants.map((p, i) => (
                                <div key={p.id} className={cn(
                                    "flex flex-col items-center p-4 rounded-t-2xl min-w-[120px]",
                                    (p.rank || '').includes('1') ? "bg-amber-400/20 border-t-4 border-amber-400 h-32" :
                                        (p.rank || '').includes('2') ? "bg-slate-400/20 border-t-4 border-slate-300 h-28" :
                                            "bg-orange-400/20 border-t-4 border-orange-400 h-24"
                                )}>
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2">
                                        <span className="text-white font-bold">{(p.rank || '').match(/\d+/)?.[0] || '?'}</span>
                                    </div>
                                    <p className="text-white text-xs font-bold text-center max-w-[100px] truncate">{p.studentName}</p>
                                    <p className="text-white/60 text-[10px] uppercase font-bold mt-1">{p.rank}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="shadow-lg border-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                    <div>
                        <CardTitle className="text-2xl font-bold">Participants & Classement</CardTitle>
                        <CardDescription>
                            Liste complète des élèves inscrits et leurs résultats
                        </CardDescription>
                    </div>
                    {canManageActivities && (
                        <div className="flex gap-2">
                            {participants.length > 0 && (
                                <Button variant="outline" onClick={handleSendResultsEmail} className="gap-2">
                                    <Trophy size={16} /> Notifier les Parents
                                </Button>
                            )}
                            <Button variant="outline" onClick={handlePrintResults} className="gap-2">
                                <Printer size={16} /> Rapport PDF
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {canManageActivities && (
                            <div className="flex flex-col sm:flex-row items-end gap-4 p-5 border rounded-2xl bg-slate-50 dark:bg-slate-900/50 mb-6">
                                <div className="flex-1 w-full space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Inscrire un élève</label>
                                    <Select onValueChange={setSelectedStudent} value={selectedStudent}>
                                        <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Choisir un élève..." /></SelectTrigger>
                                        <SelectContent>{availableStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="w-full sm:w-[200px] space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Classement</label>
                                    <Input
                                        placeholder="Ex: 1er Place, Mention TB"
                                        value={rank}
                                        onChange={(e) => setRank(e.target.value)}
                                        className="h-11 rounded-xl"
                                    />
                                </div>
                                <Button onClick={handleAddParticipant} disabled={!selectedStudent} className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"><PlusCircle className="mr-2 h-4 w-4" />Inscrire</Button>
                            </div>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="font-bold text-slate-900 dark:text-white">Élève</TableHead>
                                    <TableHead className="font-bold text-slate-900 dark:text-white">Résultat</TableHead>
                                    {canManageActivities && <TableHead className="text-right font-bold text-slate-900 dark:text-white">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {participants.length > 0 ? (
                                    participants.map(p => {
                                        const rankStr = (p.rank || '');
                                        const isPodium = rankStr.includes('1') || rankStr.includes('2') || rankStr.includes('3');
                                        return (
                                            <TableRow key={p.id} className="group transition-colors border-slate-100 dark:border-slate-800">
                                                <TableCell className="font-medium py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                            {p.studentName?.charAt(0)}
                                                        </div>
                                                        {p.studentName}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {isPodium ? (
                                                        <Badge className={cn(
                                                            "gap-1 py-1 px-3",
                                                            rankStr.includes('1') ? "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100" :
                                                                rankStr.includes('2') ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100" :
                                                                    "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100"
                                                        )}>
                                                            <Trophy size={12} /> {p.rank}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">{p.rank}</span>
                                                    )}
                                                </TableCell>
                                                {canManageActivities && (
                                                    <TableCell className="text-right py-4">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteParticipant(p.id)}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 rounded-full"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow><TableCell colSpan={canManageActivities ? 3 : 2} className="h-32 text-center text-muted-foreground">Aucun participant pour le moment.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function CompetitionParticipantsClient() {
    const searchParams = useSearchParams();
    const competitionId = searchParams.get('id') as string;

    return (
        <Suspense fallback={<div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>}>
            <CompetitionContent competitionId={competitionId} />
        </Suspense>
    );
}
