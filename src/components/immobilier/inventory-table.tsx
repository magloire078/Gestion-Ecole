

'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { materiel as Materiel } from "@/lib/data-types";

interface InventoryTableProps {
    items: (Materiel & { id: string })[];
    isLoading: boolean;
    onEdit: (item: Materiel & { id: string }) => void;
    onDelete: (item: Materiel & { id: string }) => void;
    locationMap: Map<string, string>;
}

export const InventoryTable = ({ items, isLoading, onEdit, onDelete, locationMap }: InventoryTableProps) => {

    const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
        switch(status) {
            case 'neuf': return 'default';
            case 'bon': return 'secondary';
            case 'à réparer': return 'outline';
            case 'hors_service': return 'destructive';
            default: return 'default';
        }
    };
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Emplacement</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
                ) : items.length > 0 ? (
                    items.map(item => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{locationMap.get(item.locationId) || item.locationId}</TableCell>
                            <TableCell><Badge variant={getStatusBadgeVariant(item.status)} className="capitalize">{item.status.replace(/_/g, ' ')}</Badge></TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEdit(item)}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(item)}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">Aucun matériel trouvé pour les filtres actuels.</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
};
