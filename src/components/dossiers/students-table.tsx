
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal, Eye, Printer, FileText, CalendarDays, FileSignature, CreditCard, Edit, UserX, UserCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { TuitionStatusBadge } from "@/components/tuition-status-badge";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { differenceInYears, addYears, differenceInMonths } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { student as Student } from "@/lib/data-types";

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
        ageString += ` ${months} mois`;
      }
      return ageString;
    } catch {
      return 'N/A';
    }
}

interface StudentsTableProps {
    students: Student[];
    isLoading: boolean;
    canManageUsers: boolean;
    actionType: 'active' | 'archived';
    onEdit: (student: Student) => void;
    onArchive: (student: Student) => void;
    onRestore: (student: Student) => void;
}

export const StudentsTable = ({ students, isLoading, canManageUsers, actionType, onEdit, onArchive, onRestore }: StudentsTableProps) => {
    const router = useRouter();

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">N°</TableHead>
                        <TableHead>Élève</TableHead>
                        <TableHead>Classe</TableHead>
                        <TableHead>Âge</TableHead>
                        <TableHead>Sexe</TableHead>
                        <TableHead className="text-center">Statut</TableHead>
                        {actionType === 'active' && <TableHead className="text-center">Paiement</TableHead>}
                        <TableHead className="text-right print:hidden">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={8}><Skeleton className="h-5 w-full"/></TableCell>
                                </TableRow>
                            ))
                        ) : students.length > 0 ? (
                            students.map((student, index) => (
                                <TableRow key={student.id}>
                                <TableCell className="font-medium">{index + 1}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 print:hidden">
                                            <AvatarImage src={student.photoUrl || undefined} alt={`${student.firstName} ${student.lastName}`} data-ai-hint="person face" />
                                            <AvatarFallback>{`${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <Link href={`/dashboard/dossiers-eleves/${student.id}`} className="hover:underline">
                                                <p className="font-medium">{student.firstName} ${student.lastName}</p>
                                            </Link>
                                            <div className="text-xs text-muted-foreground font-mono">{student.matricule || student.id?.substring(0,8)}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{student.class}</TableCell>
                                <TableCell>{getAge(student.dateOfBirth)}</TableCell>
                                <TableCell>{student.gender?.charAt(0)}</TableCell>
                                <TableCell className="text-center">
                                    <Badge className={cn("border-transparent", getStatusBadgeVariant(student.status || 'Actif'))}>{student.status || 'Actif'}</Badge>
                                </TableCell>
                                {actionType === 'active' &&
                                  <TableCell className="text-center">
                                      <TuitionStatusBadge status={student.tuitionStatus || 'Partiel'} />
                                  </TableCell>
                                }
                                <TableCell className="text-right print:hidden">
                                    <div className="flex justify-end gap-1">
                                        {actionType === 'active' && canManageUsers && (
                                            <Button variant="outline" size="sm" onClick={() => onEdit(student)}>
                                                <Edit className="h-3.5 w-3.5 mr-1"/> Modifier
                                            </Button>
                                        )}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}`)}>
                                                    <Eye className="mr-2 h-4 w-4" /> Voir le Profil
                                                </DropdownMenuItem>
                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>
                                                        <Printer className="mr-2 h-4 w-4" /> Imprimer
                                                    </DropdownMenuSubTrigger>
                                                    <DropdownMenuPortal>
                                                        <DropdownMenuSubContent>
                                                            <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}/carte`)}><CreditCard className="mr-2 h-4 w-4" />Carte Étudiant</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}/bulletin`)}><FileText className="mr-2 h-4 w-4" />Bulletin</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}/emploi-du-temps`)}><CalendarDays className="mr-2 h-4 w-4" />Emploi du temps</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => router.push(`/dashboard/dossiers-eleves/${student.id}/fiche`)}><FileSignature className="mr-2 h-4 w-4" />Fiche</DropdownMenuItem>
                                                        </DropdownMenuSubContent>
                                                    </DropdownMenuPortal>
                                                </DropdownMenuSub>
                                                {canManageUsers && <DropdownMenuSeparator />}
                                                {actionType === 'active' && canManageUsers && (
                                                    <DropdownMenuItem className="text-destructive" onClick={() => onArchive(student)}>
                                                        <UserX className="mr-2 h-4 w-4" /> Radier
                                                    </DropdownMenuItem>
                                                )}
                                                {actionType === 'archived' && canManageUsers && (
                                                    <DropdownMenuItem onClick={() => onRestore(student)}>
                                                        <UserCheck className="mr-2 h-4 w-4" /> Restaurer
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">Aucun élève trouvé.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
