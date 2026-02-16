'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Edit, UserX, UserCheck, Printer, Eye, CreditCard, FileText, CalendarDays, FileSignature, Cake, VenetianMask } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { student as Student } from '@/lib/data-types';
import { useRouter } from 'next/navigation';
import { TuitionStatusBadge } from '@/components/tuition-status-badge';
import { differenceInYears, addYears, differenceInMonths } from 'date-fns';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';


const getStatusBadgeVariant = (status: Student['status']) => {
    switch (status) {
        case 'Actif':
            return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
        case 'En attente':
            return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
        case 'Transféré':
        case 'Diplômé':
            return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        case 'Radié':
            return 'bg-destructive/80 text-destructive-foreground';
        default:
            return 'bg-secondary text-secondary-foreground';
    }
};

interface StudentCardProps {
    student: Student;
    onEdit: (student: Student) => void;
    onArchive: (student: Student) => void;
    onRestore: (student: Student) => void;
    actionType: 'active' | 'archived';
}

const getAge = (dateOfBirth: string | undefined) => {
    if (!dateOfBirth) return 'N/A';
    try {
        const birthDate = new Date(dateOfBirth);
        const today = new Date();
        const years = differenceInYears(today, birthDate);
        const monthDate = addYears(birthDate, years);
        const months = differenceInMonths(today, monthDate);

        let ageString = `${years} an${years > 1 ? 's' : ''}`;
        if (months > 0) {
            ageString += ` et ${months} mois`;
        }
        return ageString;
    } catch {
        return 'N/A';
    }
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
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border bg-muted flex items-center justify-center">
                            {student.photoUrl ? (
                                <img
                                    src={student.photoUrl}
                                    alt={studentFullName}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <span className="text-sm font-bold">{fallback}</span>
                            )}
                        </div>
                        <div>
                            <CardTitle className="text-lg">
                                <Link href={`/dashboard/dossiers-eleves/${student.id}`} className="hover:underline">
                                    {studentFullName}
                                </Link>
                            </CardTitle>
                            <CardDescription>{student.matricule}</CardDescription>
                        </div>
                    </div>
                    <Badge className={cn("border-transparent", getStatusBadgeVariant(student.status || 'Actif'))}>{student.status || 'Actif'}</Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 text-sm">
                <p>Classe: <strong>{student.class}</strong></p>
                <div className="flex items-center text-muted-foreground">
                    <Cake className="h-4 w-4 mr-2" />
                    <span>{getAge(student.dateOfBirth)}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                    <VenetianMask className="h-4 w-4 mr-2" />
                    <span>{student.gender}</span>
                </div>
                <div className="flex items-center pt-2">
                    <TuitionStatusBadge status={student.tuitionStatus || 'Partiel'} />
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
