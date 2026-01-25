'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import type { discipline_incident as DisciplineIncident } from '@/lib/data-types';

interface IncidentWithDetails extends DisciplineIncident {
    id: string;
    studentName?: string;
    className?: string;
}

interface DisciplineIncidentsListProps {
  incidents: IncidentWithDetails[];
  isLoading: boolean;
}

export function DisciplineIncidentsList({ incidents, isLoading }: DisciplineIncidentsListProps) {
    const getTypeBadgeVariant = (type: string) => {
        if (type.includes('Exclusion') || type.includes('Mise à pied')) return 'destructive';
        if (type.includes('Retenue') || type.includes('Écrit')) return 'outline';
        return 'secondary';
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Élève</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Raison</TableHead>
                    <TableHead>Signalé par</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    [...Array(5)].map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                    ))
                ) : incidents.length > 0 ? (
                    incidents.map(incident => (
                        <TableRow key={incident.id}>
                            <TableCell>{format(new Date(incident.date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                            <TableCell>{incident.studentName}</TableCell>
                            <TableCell>{incident.className}</TableCell>
                            <TableCell><Badge variant={getTypeBadgeVariant(incident.type)}>{incident.type}</Badge></TableCell>
                            <TableCell>{incident.reason}</TableCell>
                            <TableCell>{incident.reportedByName}</TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">Aucun incident disciplinaire enregistré pour cette sélection.</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}