'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Files } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { payrollRun as PayrollRun } from '@/lib/data-types';

interface PayrollRunWithId extends PayrollRun {
    id: string;
}

interface PayrollHistoryTableProps {
    payrollHistory: PayrollRunWithId[];
    isLoading: boolean;
    onViewPayslips: (run: PayrollRunWithId) => void;
}

export function PayrollHistoryTable({ payrollHistory, isLoading, onViewPayslips }: PayrollHistoryTableProps) {
    const formatCurrency = (value: number) => `${value.toLocaleString('fr-FR')} CFA`;

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Période</TableHead>
                    <TableHead>Date d&apos;exécution</TableHead>
                    <TableHead>Masse Salariale</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={5}><Skeleton className="h-20 w-full" /></TableCell></TableRow>
                ) : payrollHistory.length > 0 ? (
                    payrollHistory.map((run) => (
                        <TableRow key={run.id}>
                            <TableCell className="font-medium">{run.period}</TableCell>
                            <TableCell>{format(new Date(run.executionDate), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                            <TableCell>{formatCurrency(run.totalMass)}</TableCell>
                            <TableCell><Badge variant="secondary">{run.status}</Badge></TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => onViewPayslips(run)}>
                                    <Files className="mr-2 h-4 w-4" /> Voir les bulletins
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">Aucun historique de paie trouvé.</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
