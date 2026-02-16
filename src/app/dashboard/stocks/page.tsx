'use client';

import { useState, useMemo } from 'react';
import { useSchoolData } from '@/hooks/use-school-data';
import { useCollection, useUser } from '@/firebase';
import { StockService } from '@/services/stock-service';
import type { canteenInventoryItem as StockItem } from '@/lib/data-types';
import {
    Plus,
    Search,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownLeft,
    Package,
    History,
    MoreHorizontal,
    Edit,
    Trash
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import {
    collection,
    query,
    orderBy,
    Query
} from 'firebase/firestore';
import { db } from '@/firebase';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function StockPage() {
    const { schoolId, loading: schoolLoading, error } = useSchoolData();
    const { user } = useUser();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

    // Form states
    const [newItem, setNewItem] = useState<Partial<StockItem>>({
        name: '',
        category: 'ingredient',
        quantity: 0,
        unit: 'kg',
        minThreshold: 5,
        pricePerUnit: 0
    });

    const [movement, setMovement] = useState({
        type: 'in' as 'in' | 'out',
        quantity: 0,
        reason: 'achat',
        notes: ''
    });

    // Fetch stocks in real-time
    const stocksQuery = useMemo(() =>
        (schoolId && db) ? query(collection(db, `ecoles/${schoolId}/stocks`), orderBy('name')) as Query<StockItem> : null
        , [schoolId]);

    const { data: stocksSnapshots, loading: stocksLoading, error: stocksError } = useCollection<StockItem>(stocksQuery);

    const stocks = useMemo(() =>
        stocksSnapshots?.map(doc => ({ id: doc.id, ...doc.data() } as StockItem)) || []
        , [stocksSnapshots]);

    const filteredStocks = stocks.filter((item: StockItem) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddItem = async () => {
        if (!schoolId || !newItem.name) return;
        try {
            await StockService.addItem(schoolId, newItem as any);
            toast({ title: "Succès", description: "Article ajouté au stock." });
            setIsAddDialogOpen(false);
            setNewItem({ name: '', category: 'ingredient', quantity: 0, unit: 'kg', minThreshold: 5, pricePerUnit: 0 });
        } catch (error) {
            toast({ variant: "destructive", title: "Erreur", description: "Impossible d'ajouter l'article." });
        }
    };

    const handleMovement = async () => {
        if (!schoolId || !selectedItem || !selectedItem.id) return;
        try {
            await StockService.logMovement(schoolId, selectedItem.id, {
                ...movement,
                staffId: user?.uid || 'unknown'
            });
            toast({ title: "Mouvement enregistré", description: `Stock mis à jour pour ${selectedItem.name}.` });
            setIsMoveDialogOpen(false);
            setMovement({ type: 'in', quantity: 0, reason: 'achat', notes: '' });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erreur", description: error.message || "Impossible d'enregistrer le mouvement." });
        }
    };

    if (schoolLoading) return <div className="p-8"><Skeleton className="h-12 w-48 mb-6" /><Skeleton className="h-96 w-full" /></div>;

    if (error || stocksError) {
        return (
            <div className="p-8">
                <Card className="border-destructive/50 bg-destructive/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Erreur de chargement
                        </CardTitle>
                        <CardDescription>
                            Une erreur est survenue lors de la récupération des données de stock.
                            {(error || stocksError?.message) && <span className="block mt-2 font-mono text-xs">{error || stocksError?.message}</span>}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" onClick={() => window.location.reload()}>Réessayer</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">Gestion des Stocks</h1>
                    <p className="text-muted-foreground">Suivez vos inventaires et recevez des alertes en temps réel.</p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="premium" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Nouvel Article
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card border-white/10 sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Ajouter un article</DialogTitle>
                            <DialogDescription>Définissez les paramètres de stock pour cet article.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nom de l'article</label>
                                <Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="ex: Riz parfumé" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Catégorie</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 backdrop-blur-sm px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                        value={newItem.category}
                                        onChange={e => setNewItem({ ...newItem, category: e.target.value as any })}
                                    >
                                        <option value="ingredient">Ingrédient</option>
                                        <option value="boisson">Boisson</option>
                                        <option value="fourniture">Fourniture</option>
                                        <option value="autre">Autre</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unité</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 backdrop-blur-sm px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                        value={newItem.unit}
                                        onChange={e => setNewItem({ ...newItem, unit: e.target.value as any })}
                                    >
                                        <option value="kg">Kilogramme (kg)</option>
                                        <option value="l">Litre (l)</option>
                                        <option value="unité">Unité</option>
                                        <option value="paquet">Paquet</option>
                                        <option value="sac">Sac</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stock Initial</label>
                                    <Input type="number" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })} />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seuil Alerte</label>
                                    <Input type="number" value={newItem.minThreshold} onChange={e => setNewItem({ ...newItem, minThreshold: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="premium" onClick={handleAddItem}>Enregistrer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="glass-card border-white/10 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Total Articles</CardTitle>
                        <Package className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">{stocks.length}</div>
                    </CardContent>
                </Card>

                <Card className="glass-card border-white/10 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Alertes Stock Bas</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-amber-500">
                            {stocks.filter(i => i.quantity <= i.minThreshold).length}
                        </div>
                    </CardContent>
                </Card>

                <div className="relative">
                    <Input
                        placeholder="Rechercher un article..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-10 h-full min-h-[80px] text-lg glass-card border-none focus-visible:ring-primary/30"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
            </div>

            <Card className="glass-card border-white/5 overflow-hidden">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="hover:bg-transparent border-white/5">
                            <TableHead className="font-bold text-xs uppercase tracking-widest py-4">Nom de l'Article</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-widest p-4">Catégorie</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-widest py-4 text-right">Quantité</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-widest py-4">Status</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-widest py-4 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <AnimatePresence>
                            {stocksLoading ? (
                                [...Array(5)].map((_, i: number) => (
                                    <TableRow key={i} className="border-white/5">
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell />
                                    </TableRow>
                                ))
                            ) : filteredStocks?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Package className="h-10 w-10 text-muted-foreground/30" />
                                            <p className="text-muted-foreground font-medium">Aucun article trouvé</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSearchTerm('')}
                                                className="text-primary hover:text-primary/80"
                                            >
                                                Effacer les filtres
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredStocks?.map((item) => (
                                <motion.tr
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    key={item.id}
                                    className="group border-white/5 hover:bg-white/5 transition-colors"
                                >
                                    <TableCell className="font-medium py-4">
                                        <div className="flex flex-col">
                                            <span className="text-foreground font-bold">{item.name}</span>
                                            <span className="text-[10px] text-muted-foreground/60 uppercase">
                                                Mis à jour le {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-white/5 text-[10px] border-white/10 uppercase tracking-tighter">
                                            {item.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-black text-lg">
                                        <span className={item.quantity <= item.minThreshold ? 'text-amber-500' : ''}>
                                            {item.quantity} {item.unit}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {item.quantity <= 0 ? (
                                            <Badge variant="destructive" className="animate-pulse">Épuisé</Badge>
                                        ) : item.quantity <= item.minThreshold ? (
                                            <Badge variant="outline" className="text-amber-500 border-amber-500/50 bg-amber-500/10">Stock Bas</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10">Optimum</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => {
                                                    setSelectedItem(item);
                                                    setMovement({ ...movement, type: 'in' });
                                                    setIsMoveDialogOpen(true);
                                                }}
                                            >
                                                <ArrowUpRight className="h-4 w-4 text-green-500" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => {
                                                    setSelectedItem(item);
                                                    setMovement({ ...movement, type: 'out' });
                                                    setIsMoveDialogOpen(true);
                                                }}
                                            >
                                                <ArrowDownLeft className="h-4 w-4 text-amber-500" />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="glass-card border-white/10">
                                                    <DropdownMenuItem className="gap-2 cursor-pointer">
                                                        <Edit className="h-4 w-4" /> Modifier
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                                                        onClick={() => {
                                                            if (confirm('Supprimer cet article ?')) {
                                                                StockService.deleteItem(schoolId!, item.id!);
                                                            }
                                                        }}
                                                    >
                                                        <Trash className="h-4 w-4" /> Supprimer
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </TableBody>
                </Table>
            </Card>

            {/* Dialog Mouvement Stock */}
            <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
                <DialogContent className="glass-card border-white/10 sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {movement.type === 'in' ? <ArrowUpRight className="text-green-500" /> : <ArrowDownLeft className="text-amber-500" />}
                            {movement.type === 'in' ? 'Entrée de Stock' : 'Sortie de Stock'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedItem?.name} - Quantité actuelle : {selectedItem?.quantity} {selectedItem?.unit}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quantité à {movement.type === 'in' ? 'ajouter' : 'retirer'}</label>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="number"
                                    value={movement.quantity}
                                    onChange={e => setMovement({ ...movement, quantity: parseFloat(e.target.value) })}
                                    className="text-lg font-bold"
                                />
                                <span className="text-sm font-bold text-muted-foreground whitespace-nowrap">{selectedItem?.unit}</span>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Motif</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 backdrop-blur-sm px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                value={movement.reason}
                                onChange={e => setMovement({ ...movement, reason: e.target.value as any })}
                            >
                                {movement.type === 'in' ? (
                                    <>
                                        <option value="achat">Achat / Réapprovisionnement</option>
                                        <option value="don">Don / Cadeau</option>
                                        <option value="ajustement">Ajustement d'inventaire (+)</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="consommation">Consommation journalière</option>
                                        <option value="perte">Perte / Vol / Péremption</option>
                                        <option value="ajustement">Ajustement d'inventaire (-)</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant={movement.type === 'in' ? 'premium' : 'destructive'}
                            onClick={handleMovement}
                            className="w-full"
                        >
                            Confirmer le mouvement
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
