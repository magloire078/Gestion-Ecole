
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, ArrowRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import type { classe as Classe } from '@/lib/data-types';


interface ClassesListViewProps {
    cycleId: string;
    searchQuery: string;
}

export function ClassesListView({ cycleId, searchQuery }: ClassesListViewProps) {
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();

    const classesQuery = useMemoFirebase(() => {
        if (!schoolId) return null;
        if (cycleId === 'all') {
            return query(collection(firestore, `ecoles/${schoolId}/classes`));
        }
        return query(collection(firestore, `ecoles/${schoolId}/classes`), where('cycleId', '==', cycleId));
    }, [schoolId, cycleId, firestore]);

    const { data: classesData, loading: classesLoading } = useCollection(classesQuery);

    const classes = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Classe & { id: string })) || [], [classesData]);

    const filteredClasses = useMemo(() => {
      if (!searchQuery) return classes;
      return classes.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [classes, searchQuery]);

    const isLoading = schoolLoading || classesLoading;

    return (
        <Card>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom de la Classe</TableHead>
                            <TableHead>Effectif</TableHead>
                            <TableHead>Prof. Principal</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredClasses.length > 0 ? (
                            filteredClasses.map((classe) => (
                                <TableRow key={classe.id}>
                                    <TableCell className="font-medium">{classe.name}</TableCell>
                                    <TableCell>{classe.studentCount} / {classe.maxStudents}</TableCell>
                                    <TableCell>{classe.mainTeacherName || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={classe.status === 'active' ? 'secondary' : 'outline'}>{classe.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/dashboard/classes/${classe.id}`}>
                                                        Gérer la classe
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>Modifier</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive">Archiver</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                     {cycleId === 'all' && !searchQuery ? 'Aucune classe n\'a encore été créée.' : 'Aucune classe trouvée pour les filtres actuels.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
