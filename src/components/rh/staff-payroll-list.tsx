'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Loader2, Files } from "lucide-react";
import type { staff as Staff } from '@/lib/data-types';

interface StaffPayrollListProps {
    staffWithSalary: (Staff & { id: string })[];
    isLoading: boolean;
    canManageBilling: boolean;
    onGeneratePayslip: (staffMember: Staff) => void;
    onGenerateAllPayslips: () => void;
    isBulkGenerating: boolean;
}

export function StaffPayrollList({ staffWithSalary, isLoading, canManageBilling, onGeneratePayslip, onGenerateAllPayslips, isBulkGenerating }: StaffPayrollListProps) {
    const formatCurrency = (value: number) => `${value.toLocaleString('fr-FR')} CFA`;

    return (
        <>
            <div className="flex justify-end mb-4">
                {canManageBilling && staffWithSalary.length > 0 && (
                    <Button onClick={onGenerateAllPayslips} disabled={isBulkGenerating} variant="secondary">
                        {isBulkGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Files className="mr-2 h-4 w-4" />}
                        {isBulkGenerating ? 'Génération...' : 'Générer Tous les Bulletins'}
                    </Button>
                )}
            </div>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Salaire de Base</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
                    </TableRow>
                    ))
                ) : staffWithSalary.length > 0 ? (
                    staffWithSalary.map(staff => (
                    <TableRow key={staff.id}>
                        <TableCell className="font-medium">{staff.firstName} {staff.lastName}</TableCell>
                        <TableCell className="capitalize">{staff.role}</TableCell>
                        <TableCell className="font-mono">{formatCurrency(staff.baseSalary)}</TableCell>
                        <TableCell>
                        <Badge variant={staff.status === 'Actif' ? 'secondary' : 'outline'}>{staff.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                        {canManageBilling && (
                            <Button variant="outline" size="sm" onClick={() => onGeneratePayslip(staff)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Générer Bulletin
                            </Button>
                        )}
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">Aucun membre du personnel avec un salaire défini.</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </>
    );
}
