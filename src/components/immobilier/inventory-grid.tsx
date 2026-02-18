

'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Edit, Trash2, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { materiel as Materiel } from '@/lib/data-types';
import { SafeImage } from '../ui/safe-image';

interface InventoryGridProps {
    items: (Materiel & { id: string })[];
    isLoading: boolean;
    onEdit: (item: Materiel & { id: string }) => void;
    onDelete: (item: Materiel & { id: string }) => void;
    locationMap: Map<string, string>;
}

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'neuf': return 'default';
        case 'bon': return 'secondary';
        case 'à réparer': return 'outline';
        case 'hors_service': return 'destructive';
        default: return 'default';
    }
};

export const InventoryGrid = ({ items, isLoading, onEdit, onDelete, locationMap }: InventoryGridProps) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <Card className="flex items-center justify-center h-48 col-span-full">
                <p className="text-muted-foreground">Aucun équipement trouvé pour les filtres actuels.</p>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map(item => (
                <Card key={item.id} className="flex flex-col">
                    <CardHeader className="p-0">
                        <div className="relative h-40 w-full">
                            <SafeImage
                                src={item.photoURL || `https://picsum.photos/seed/${item.id}/400/200`}
                                alt={item.name}
                                fill
                                style={{ objectFit: 'cover' }}
                                className="rounded-t-lg"
                                data-ai-hint="office equipment"
                                fallback={<div className="h-full w-full bg-muted flex items-center justify-center"><Package className="h-16 w-16 text-muted-foreground" /></div>}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 flex-1">
                        <CardTitle className="text-base font-bold">{item.name}</CardTitle>
                        <CardDescription>{item.category}</CardDescription>
                        <div className="flex items-center justify-between text-sm mt-2">
                            <span className="text-muted-foreground">Quantité: {item.quantity}</span>
                            <Badge variant={getStatusBadgeVariant(item.status)} className="capitalize">{item.status.replace(/_/g, ' ')}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Lieu: {locationMap.get(item.locationId) || item.locationId}</p>
                    </CardContent>
                    <CardFooter className="p-2 border-t">
                        <div className="flex w-full justify-end">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Actions</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEdit(item)}>
                                        <Edit className="mr-2 h-4 w-4" /> Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete(item)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
};
