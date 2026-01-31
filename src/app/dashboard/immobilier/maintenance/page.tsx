
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { tache_maintenance as TacheMaintenance, staff, salle as Salle, bus as Bus } from '@/lib/data-types';
import { format } from 'date-fns';
import { MaintenanceForm } from '@/components/immobilier/maintenance-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuPortal, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type Status = 'à_faire' | 'en_cours' | 'terminée';
const STATUSES: { value: Status; label: string }[] = [
    { value: 'à_faire', label: 'À Faire' },
    { value: 'en_cours', label: 'En Cours' },
    { value: 'terminée', label: 'Terminée' },
];

function MaintenanceCard({ tache, onEdit, onDelete, onStatusChange, staffMap, locationMap }: { tache: TacheMaintenance & { id: string }, onEdit: () => void, onDelete: () => void, onStatusChange: (newStatus: Status) => void, staffMap: Map<string, string>, locationMap: Map<string, string> }) {
    const { user } = useUser();
    const canManageContent = !!user?.profile?.permissions?.manageInventory;

    const getPriorityBadgeVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
        switch(priority) {
            case 'basse': return 'default';
            case 'moyenne': return 'secondary';
            case 'haute': return 'destructive';
            default: return 'default';
        }
    };

    return (
        <Card className="mb-4">
            <CardContent className="p-4">
                <div className="flex justify-between items-start">
                    <p className="font-semibold text-sm">{tache.title}</p>
                    {canManageContent && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Changer Statut</DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                            {STATUSES.map(s => <DropdownMenuItem key={s.value} onClick={() => onStatusChange(s.value)}>{s.label}</DropdownMenuItem>)}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                                <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{locationMap.get(tache.location || '') || tache.location}</p>
                <div className="flex items-center justify-between mt-2">
                    <Badge variant={getPriorityBadgeVariant(tache.priority)} className="capitalize">{tache.priority}</Badge>
                    <p className="text-xs text-muted-foreground">{tache.assignedTo ? `Assigné à ${staffMap.get(tache.assignedTo) || 'N/A'}` : 'Non assigné'}</p>
                </div>
            </CardContent>
        </Card>
    );
}


export default function MaintenanceKanbanPage() {
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const canManageContent = !!user?.profile?.permissions?.manageInventory;

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTache, setEditingTache] = useState<(TacheMaintenance & { id: string }) | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [tacheToDelete, setTacheToDelete] = useState<(TacheMaintenance & { id: string }) | null>(null);

    const tachesQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/maintenance`), orderBy('priority', 'desc')), [firestore, schoolId]);
    const { data: tachesData, loading: tachesLoading } = useCollection(tachesQuery);

    const staffQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/personnel`)), [firestore, schoolId]);
    const { data: staffData, loading: staffLoading } = useCollection(staffQuery);
    
    const sallesQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/salles`)), [firestore, schoolId]);
    const busesQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/transport_bus`)), [firestore, schoolId]);
    const { data: sallesData, loading: sallesLoading } = useCollection(sallesQuery);
    const { data: busesData, loading: busesLoading } = useCollection(busesQuery);

    const staffMembers: (staff & { id: string })[] = useMemo(() => staffData?.map(d => ({ id: d.id, ...d.data() } as staff & { id: string })) || [], [staffData]);
    const staffMap = useMemo(() => new Map(staffMembers.map(s => [s.id, `${s.firstName} ${s.lastName}`])), [staffMembers]);

    const locationOptions = useMemo(() => {
        const salles = sallesData?.map(d => ({ id: d.id, ...d.data() } as salle & { id: string })) || [];
        const buses = busesData?.map(d => ({ id: d.id, ...d.data() } as bus & { id: string })) || [];
        const salleOptions = salles.map(s => ({ value: `salle:${s.id}`, label: `Salle: ${s.name}` }));
        const busOptions = buses.map(b => ({ value: `bus:${b.id}`, label: `Bus: ${b.registrationNumber}` }));
        return [...salleOptions, ...busOptions];
    }, [sallesData, busesData]);

    const locationMap = useMemo(() => new Map(locationOptions.map(o => [o.value, o.label])), [locationOptions]);

    const tachesByStatus = useMemo(() => {
        const grouped: Record<Status, (TacheMaintenance & { id: string })[]> = { à_faire: [], en_cours: [], terminée: [] };
        tachesData?.forEach(doc => {
            const tache = { id: doc.id, ...doc.data() } as TacheMaintenance & { id: string };
            const status = tache.status as Status;
            if(grouped[status]) {
                grouped[status].push(tache);
            }
        });
        return grouped;
    }, [tachesData]);

    const handleOpenForm = (tache: (TacheMaintenance & { id: string }) | null) => {
        setEditingTache(tache);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (!schoolId || !tacheToDelete) return;
        try {
            await deleteDoc(doc(firestore, `ecoles/${schoolId}/maintenance`, tacheToDelete.id));
            toast({ title: "Tâche supprimée" });
        } catch (error) {
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer la tâche." });
        } finally {
            setIsDeleteDialogOpen(false);
            setTacheToDelete(null);
        }
    };
    
    const handleStatusChange = async (tacheId: string, newStatus: Status) => {
        const tacheRef = doc(firestore, `ecoles/${schoolId}/maintenance`, tacheId);
        try {
            await updateDoc(tacheRef, { status: newStatus });
            toast({ title: 'Statut mis à jour' });
        } catch (e) {
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de changer le statut." });
        }
    };

    const isLoading = schoolLoading || tachesLoading || staffLoading || sallesLoading || busesLoading;

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-semibold">Suivi de la Maintenance</h2>
                    <p className="text-muted-foreground">Vue Kanban des tâches de maintenance.</p>
                </div>
                {canManageContent && (
                    <Button onClick={() => handleOpenForm(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nouvelle Tâche
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {STATUSES.map(statusInfo => (
                    <div key={statusInfo.value} className="bg-muted/50 rounded-lg">
                        <div className="p-4 border-b">
                            <h3 className="font-semibold">{statusInfo.label} <Badge variant="secondary" className="ml-2">{tachesByStatus[statusInfo.value]?.length || 0}</Badge></h3>
                        </div>
                        <div className="p-4 space-y-4 min-h-[200px]">
                            {isLoading ? (
                                <Skeleton className="h-24 w-full" />
                            ) : (
                                tachesByStatus[statusInfo.value]?.map(tache => (
                                    <MaintenanceCard
                                        key={tache.id}
                                        tache={tache}
                                        onEdit={() => handleOpenForm(tache)}
                                        onDelete={() => { setTacheToDelete(tache); setIsDeleteDialogOpen(true); }}
                                        onStatusChange={(newStatus) => handleStatusChange(tache.id, newStatus)}
                                        staffMap={staffMap}
                                        locationMap={locationMap}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingTache ? 'Modifier la' : 'Nouvelle'} tâche de maintenance</DialogTitle>
                </DialogHeader>
                <MaintenanceForm 
                    key={editingTache?.id || 'new'}
                    schoolId={schoolId}
                    tache={editingTache}
                    staffMembers={staffMembers}
                    locationOptions={locationOptions}
                    onSave={() => setIsFormOpen(false)}
                />
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                    <AlertDialogDescription>La tâche <strong>"{tacheToDelete?.title}"</strong> sera supprimée.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
