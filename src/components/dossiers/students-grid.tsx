
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Edit, UserX, UserCheck, Printer, Eye, CreditCard, FileText, CalendarDays, FileSignature } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { student as Student } from '@/lib/data-types';
import { useRouter } from 'next/navigation';
import { TuitionStatusBadge } from '@/components/tuition-status-badge';

interface StudentCardProps {
    student: Student;
    onEdit: (student: Student) => void;
    onArchive: (student: Student) => void;
    onRestore: (student: Student) => void;
    actionType: 'active' | 'archived';
}

const StudentCard = ({ student, onEdit, onArchive, onRestore, actionType }: StudentCardProps) => {
    const router = useRouter();
    const studentFullName = `${student.firstName} ${student.lastName}`;
    const fallback = studentFullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <Card className="flex flex-col">
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={student.photoUrl || undefined} alt={studentFullName} />
                            <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-lg">
                                <Link href={`/dashboard/dossiers-eleves/${student.id}`} className="hover:underline">
                                    {studentFullName}
                                </Link>
                            </CardTitle>
                            <CardDescription>{student.matricule}</CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 text-sm">
                <p>Classe: <strong>{student.class}</strong></p>
                <div className="flex items-center">
                    Statut scolarité: <TuitionStatusBadge status={student.tuitionStatus || 'Partiel'} />
                </div>
            </CardContent>
            <CardFooter>
                <div className="flex w-full items-center justify-between">
                    <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/dossiers-eleves/${student.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> Voir
                        </Link>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {actionType === 'active' && <DropdownMenuItem onClick={() => onEdit(student)}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>}
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger><Printer className="mr-2 h-4 w-4" /> Imprimer</DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}/carte`)}><CreditCard className="mr-2 h-4 w-4" />Carte</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}/bulletin`)}><FileText className="mr-2 h-4 w-4" />Bulletin</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}/emploi-du-temps`)}><CalendarDays className="mr-2 h-4 w-4" />Emploi du temps</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}/fiche`)}><FileSignature className="mr-2 h-4 w-4" />Fiche</DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                             {actionType === 'active' && (
                                <DropdownMenuItem className="text-destructive" onClick={() => onArchive(student)}>
                                    <UserX className="mr-2 h-4 w-4" /> Radier
                                </DropdownMenuItem>
                            )}
                            {actionType === 'archived' && (
                                <DropdownMenuItem onClick={() => onRestore(student)}>
                                    <UserCheck className="mr-2 h-4 w-4" /> Restaurer
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardFooter>
        </Card>
    );
};

interface StudentsGridProps {
    students: Student[];
    isLoading: boolean;
    onEdit: (student: Student) => void;
    onArchive: (student: Student) => void;
    onRestore: (student: Student) => void;
    actionType: 'active' | 'archived';
}

export const StudentsGrid = ({ students, isLoading, onEdit, onArchive, onRestore, actionType }: StudentsGridProps) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
            </div>
        );
    }

    if (students.length === 0) {
        return (
            <Card className="flex items-center justify-center h-48">
                <p className="text-muted-foreground">Aucun élève trouvé pour les filtres actuels.</p>
            </Card>
        );
    }
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {students.map(student => (
                <StudentCard 
                    key={student.id} 
                    student={student} 
                    onEdit={onEdit} 
                    onArchive={onArchive} 
                    onRestore={onRestore}
                    actionType={actionType}
                />
            ))}
        </div>
    );
};
