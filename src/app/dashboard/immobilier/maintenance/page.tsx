
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, MoreHorizontal, RefreshCw } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { tache_maintenance as TacheMaintenance, staff, salle as Salle, bus as Bus } from '@/lib/data-types';
import { format } from 'date-fns';
import { MaintenanceForm } from '@/components/immobilier/maintenance-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuPortal, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, User, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

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
        switch (priority) {
            case 'basse': return 'default';
            case 'moyenne': return 'secondary';
            case 'haute': return 'destructive';
            default: return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'à_faire': return <AlertCircle className="h-4 w-4 text-orange-500" />;
            case 'en_cours': return <Clock className="h-4 w-4 text-blue-500" />;
            case 'terminée': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            default: return null;
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
        >
            <Card className="glass-card overflow-hidden group border-white/10">
                <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                        <div className="space-y-1">
                            <h4 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">{tache.title}</h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate max-w-[150px]">{locationMap.get(tache.location || '') || tache.location || 'Non spécifié'}</span>
                            </div>
                        </div>
                        {canManageContent && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 glass">
                                    <DropdownMenuItem onClick={onEdit} className="gap-2">
                                        <Edit className="h-4 w-4" />Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="gap-2">
                                            <div className="flex items-center gap-2">
                                                <RefreshCw className="h-4 w-4" />
                                                <span>Changer Statut</span>
                                            </div>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent className="glass">
                                                {STATUSES.map(s => (
                                                    <DropdownMenuItem key={s.value} onClick={() => onStatusChange(s.value)} className="gap-2">
                                                        {getStatusIcon(s.value)}
                                                        {s.label}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                    <DropdownMenuItem className="text-destructive gap-2 focus:text-destructive" onClick={onDelete}>
                                        <Trash2 className="h-4 w-4" />Supprimer
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px]">
                            <Badge variant={getPriorityBadgeVariant(tache.priority)} className="h-5 px-2 font-normal capitalize">
                                {tache.priority}
                            </Badge>
                            {tache.dueDate && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>{format(new Date(tache.dueDate), 'dd MMM')}</span>
                                </div>
                            )}
                        </div>

                        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-3 w-3 text-primary" />
                                </div>
                                <span className="text-[10px] font-medium text-muted-foreground">
                                    {tache.assignedTo ? staffMap.get(tache.assignedTo) : 'Non assigné'}
                                </span>
                            </div>
                            <div className="flex -space-x-1">
                                {getStatusIcon(tache.status)}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
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
        const salles = sallesData?.map(d => ({ id: d.id, ...d.data() } as Salle & { id: string })) || [];
        const buses = busesData?.map(d => ({ id: d.id, ...d.data() } as Bus & { id: string })) || [];
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
            if (grouped[status]) {
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
                {STATUSES.map((statusInfo, idx) => (
                    <motion.div
                        key={statusInfo.value}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-muted/30 rounded-2xl border border-white/5 backdrop-blur-sm overflow-hidden"
                    >
                        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "h-2 w-2 rounded-full",
                                    statusInfo.value === 'à_faire' ? "bg-orange-500" :
                                        statusInfo.value === 'en_cours' ? "bg-blue-500" : "bg-green-500"
                                )} />
                                <h3 className="font-semibold text-sm">{statusInfo.label}</h3>
                            </div>
                            <Badge variant="secondary" className="rounded-full bg-white/10 hover:bg-white/20 border-0 text-xs">
                                {tachesByStatus[statusInfo.value]?.length || 0}
                            </Badge>
                        </div>
                        <div className="p-3 space-y-4 min-h-[300px] max-h-[70vh] overflow-y-auto scrollbar-hide">
                            <AnimatePresence mode="popLayout">
                                {isLoading ? (
                                    <div className="space-y-3">
                                        <Skeleton className="h-24 w-full rounded-xl opacity-50" />
                                        <Skeleton className="h-24 w-full rounded-xl opacity-30" />
                                    </div>
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
                            </AnimatePresence>
                        </div>
                    </motion.div>
                ))}
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTache ? 'Modifier la' : 'Nouvelle'} tâche de maintenance</DialogTitle>
                    </DialogHeader>
                    <MaintenanceForm
                        key={editingTache?.id || 'new'}
                        schoolId={schoolId!}
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
                        <AlertDialogDescription>La tâche <strong>&quot;{tacheToDelete?.title}&quot;</strong> sera supprimée.</AlertDialogDescription>
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

