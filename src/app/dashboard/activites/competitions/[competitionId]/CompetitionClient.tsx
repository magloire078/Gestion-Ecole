'use client';

import { useParams, notFound } from 'next/navigation';
import { useMemo, useState } from 'react';
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
import { PlusCircle, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ParticipationWithStudentName extends Participation {
    id: string;
    studentName?: string;
}

export default function CompetitionParticipantsClient() {
    const params = useParams();
    const competitionId = params.competitionId as string;
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
            <Card>
                <CardHeader>
                    <CardTitle>Gestion des Participants</CardTitle>
                    <CardDescription>Compétition : <span className="font-semibold">{competitionData.name}</span></CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {canManageActivities && (
                            <div className="flex flex-col sm:flex-row items-end gap-4 p-4 border rounded-lg bg-muted/50">
                                <div className="flex-1 w-full">
                                    <label className="text-sm font-medium">Inscrire un élève</label>
                                    <Select onValueChange={setSelectedStudent} value={selectedStudent}>
                                        <SelectTrigger><SelectValue placeholder="Choisir un élève..." /></SelectTrigger>
                                        <SelectContent>{availableStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="w-full sm:w-auto">
                                    <label className="text-sm font-medium">Classement / Résultat</label>
                                    <Input placeholder="Ex: 3ème place" value={rank} onChange={(e) => setRank(e.target.value)} />
                                </div>
                                <Button onClick={handleAddParticipant} disabled={!selectedStudent}><PlusCircle className="mr-2 h-4 w-4" />Inscrire</Button>
                            </div>
                        )}
                        <Table>
                            <TableHeader><TableRow><TableHead>Élève</TableHead><TableHead>Classement / Résultat</TableHead>{canManageActivities && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
                            <TableBody>
                                {participants.length > 0 ? (
                                    participants.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium">{p.studentName}</TableCell>
                                            <TableCell>{p.rank}</TableCell>
                                            {canManageActivities && (
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteParticipant(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={canManageActivities ? 3 : 2} className="h-24 text-center">Aucun participant pour le moment.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
