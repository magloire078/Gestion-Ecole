'use client';

import { useCollection, useFirestore } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Medal, Star, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CompetitionsTabProps {
    schoolId: string;
    studentId: string;
}

export function CompetitionsTab({ schoolId, studentId }: CompetitionsTabProps) {
    const firestore = useFirestore();

    const participationsQuery = useMemo(() =>
        query(
            collection(firestore, `ecoles/${schoolId}/participations_competitions`),
            where('studentId', '==', studentId),
            orderBy('createdAt', 'desc')
        ), [firestore, schoolId, studentId]);

    const { data: participationsData, loading } = useCollection(participationsQuery);

    const participations = useMemo(() =>
        participationsData?.map(d => ({ id: d.id, ...d.data() })) || [],
        [participationsData]);

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }

    if (participations.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Trophy className="h-12 w-12 mb-4 opacity-20" />
                    <p>Aucune participation à une compétition enregistrée.</p>
                </CardContent>
            </Card>
        );
    }

    const wins = participations.filter(p => p.rank?.includes('1') || p.rank?.includes('2') || p.rank?.includes('3')).length;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/10 dark:to-slate-900 border-amber-100 dark:border-amber-900/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600">
                                <Trophy size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Podiums</p>
                                <h3 className="text-2xl font-bold">{wins}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/10 dark:to-slate-900 border-blue-100 dark:border-blue-900/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600">
                                <Medal size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Participations</p>
                                <h3 className="text-2xl font-bold">{participations.length}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historique des Compétitions</CardTitle>
                    <CardDescription>Liste des évènements auxquels l'élève a participé.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Compétition</TableHead>
                                <TableHead>Classement</TableHead>
                                <TableHead className="text-right">Score</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {participations.map((p) => {
                                const isWinner = p.rank?.includes('1') || p.rank?.includes('2') || p.rank?.includes('3');
                                return (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {isWinner && <Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
                                                {p.competitionName || 'Compétition'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={isWinner ? "default" : "secondary"} className={cn(
                                                isWinner && "bg-amber-500 hover:bg-amber-600"
                                            )}>
                                                {p.rank || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {p.score || 'N/A'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
