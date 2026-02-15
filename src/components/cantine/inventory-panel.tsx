'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, doc, setDoc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Search, AlertTriangle, ArrowUpDown, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { canteenInventoryItem } from '@/lib/data-types';
import { NotificationService } from '@/services/notification-service';

export function InventoryPanel({ schoolId }: { schoolId: string }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<canteenInventoryItem | null>(null);

    // Form states for adding/editing
    const [newItem, setNewItem] = useState<Partial<canteenInventoryItem>>({
        name: '',
        category: 'ingredient',
        quantity: 0,
        unit: 'kg',
        minThreshold: 5
    });

    // Form logic for quantity adjustment
    const [adjustment, setAdjustment] = useState({
        quantity: 0,
        reason: 'achat' as any,
        notes: ''
    });

    const inventoryQuery = useMemo(() =>
        query(collection(firestore, `ecoles/${schoolId}/cantine_inventaire`), orderBy('name')),
        [firestore, schoolId]);

    const { data: inventoryData, loading } = useCollection(inventoryQuery);

    const filteredInventory = useMemo(() => {
        if (!inventoryData) return [];
        return inventoryData.map(doc => ({ id: doc.id, ...doc.data() } as canteenInventoryItem))
            .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [inventoryData, searchTerm]);

    const handleAddItem = async () => {
        if (!newItem.name) return;
        try {
            const itemRef = doc(collection(firestore, `ecoles/${schoolId}/cantine_inventaire`));
            const itemData = {
                ...newItem,
                schoolId,
                lastUpdated: new Date().toISOString()
            };
            await setDoc(itemRef, itemData);
            setIsAddDialogOpen(false);
            setNewItem({ name: '', category: 'ingredient', quantity: 0, unit: 'kg', minThreshold: 5 });
            toast({ title: "Article ajouté", description: `${newItem.name} a été ajouté à l'inventaire.` });
        } catch (e) {
            toast({ variant: "destructive", title: "Erreur", description: "Impossible d'ajouter l'article." });
        }
    };

    const handleAdjustStock = async () => {
        if (!selectedItem || adjustment.quantity === 0) return;
        try {
            const type = adjustment.quantity > 0 ? 'in' : 'out';
            const absQty = Math.abs(adjustment.quantity);
            const newQuantity = (selectedItem.quantity || 0) + adjustment.quantity;

            const itemRef = doc(firestore, `ecoles/${schoolId}/cantine_inventaire`, selectedItem.id!);
            await setDoc(itemRef, {
                quantity: newQuantity,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            // Create log entry
            const logRef = doc(collection(firestore, `ecoles/${schoolId}/cantine_inventaire_logs`));
            await setDoc(logRef, {
                itemId: selectedItem.id,
                itemName: selectedItem.name,
                type,
                quantity: absQty,
                reason: adjustment.reason,
                timestamp: new Date().toISOString(),
                staffId: user?.uid,
                notes: adjustment.notes
            });

            setIsAdjustDialogOpen(false);
            setAdjustment({ quantity: 0, reason: 'achat', notes: '' });
            toast({ title: "Stock mis à jour", description: `Le stock de ${selectedItem.name} a été ajusté.` });

            // Check for threshold and notify staff
            if (newQuantity <= selectedItem.minThreshold) {
                await NotificationService.notifyStaffWithPermission(firestore, schoolId, 'manageCantine', {
                    title: `⚠️ Alerte Stock : ${selectedItem.name}`,
                    content: `Le stock de ${selectedItem.name} est bas (${newQuantity} ${selectedItem.unit}). Pensez à recommander.`,
                    href: "/dashboard/admin/cantine?tab=inventory"
                });
            }
        } catch (e) {
            toast({ variant: "destructive", title: "Erreur", description: "Échec de la mise à jour du stock." });
        }
    };

    return (
        <Card className="glass-card border-white/10 shadow-xl overflow-hidden">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            <PlusCircle className="h-6 w-6 text-primary" />
                            Gestion des Stocks
                        </CardTitle>
                        <CardDescription>Suivez vos ingrédients et fournitures en temps réel.</CardDescription>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#0C365A] hover:bg-[#0C365A]/90">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Nouvel Article
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Ajouter un article à l'inventaire</DialogTitle>
                                <DialogDescription>Créez un nouvel article pour le suivi des stocks.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nom de l'article</Label>
                                    <Input id="name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Ex: Riz long grain" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="category">Catégorie</Label>
                                        <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v as any })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ingredient">Ingrédient</SelectItem>
                                                <SelectItem value="boisson">Boisson</SelectItem>
                                                <SelectItem value="fourniture">Fourniture</SelectItem>
                                                <SelectItem value="autre">Autre</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="unit">Unité</Label>
                                        <Select value={newItem.unit} onValueChange={(v) => setNewItem({ ...newItem, unit: v as any })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="kg">Kilogrammes (kg)</SelectItem>
                                                <SelectItem value="l">Litres (l)</SelectItem>
                                                <SelectItem value="unité">Unités</SelectItem>
                                                <SelectItem value="paquet">Paquets</SelectItem>
                                                <SelectItem value="sac">Sacs</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="qty">Quantité initiale</Label>
                                        <Input id="qty" type="number" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="threshold">Seuil d'alerte</Label>
                                        <Input id="threshold" type="number" value={newItem.minThreshold} onChange={(e) => setNewItem({ ...newItem, minThreshold: parseFloat(e.target.value) })} />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddItem}>Enregistrer l'article</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                <div className="flex gap-4 mt-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher un article..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="hover:bg-transparent border-white/5">
                                <TableHead className="font-bold text-xs uppercase tracking-widest py-4">Article</TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-widest py-4">Catégorie</TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-widest py-4 text-right">Stock Actuel</TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-widest py-4">Statut</TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-widest py-4 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={5} className="h-12 animate-pulse bg-slate-50/50" /></TableRow>
                                ))
                            ) : filteredInventory.length > 0 ? (
                                filteredInventory.map((item) => (
                                    <TableRow key={item.id} className="group border-white/5 hover:bg-white/5 transition-colors">
                                        <TableCell className="font-medium text-foreground font-bold">{item.name}</TableCell>
                                        <TableCell><Badge variant="outline" className="bg-white/5 text-[10px] border-white/10 uppercase tracking-tighter">{item.category}</Badge></TableCell>
                                        <TableCell className="text-right font-black text-lg">
                                            <span className={item.quantity <= item.minThreshold ? 'text-amber-500' : ''}>
                                                {item.quantity} {item.unit}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {item.quantity <= item.minThreshold ? (
                                                <Badge variant="outline" className="text-amber-500 border-amber-500/50 bg-amber-500/10">Stock Bas</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10">Optimum</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedItem(item);
                                                    setIsAdjustDialogOpen(true);
                                                }}
                                                className="hover:bg-white/10"
                                            >
                                                <ArrowUpDown className="h-4 w-4 mr-2" />
                                                Ajuster
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                                        Aucun article trouvé.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajuster le stock : {selectedItem?.name}</DialogTitle>
                        <DialogDescription>
                            Enregistrez une entrée ou une sortie de stock pour cet article.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="adj-qty">Valeur du changement (négatif pour une sortie)</Label>
                            <Input
                                id="adj-qty"
                                type="number"
                                value={adjustment.quantity}
                                onChange={(e) => setAdjustment({ ...adjustment, quantity: parseFloat(e.target.value) })}
                                placeholder="Ex: -5 pour retirer 5kg"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="reason">Raison</Label>
                            <Select value={adjustment.reason} onValueChange={(v) => setAdjustment({ ...adjustment, reason: v as any })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="achat">Achat / Nouvel arrivage</SelectItem>
                                    <SelectItem value="consommation">Consommation cuisine</SelectItem>
                                    <SelectItem value="perte">Perte / Périmé</SelectItem>
                                    <SelectItem value="ajustement">Correction inventaire</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="notes">Notes locales (Facultatif)</Label>
                            <Input id="notes" value={adjustment.notes} onChange={(e) => setAdjustment({ ...adjustment, notes: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleAdjustStock} className="bg-primary hover:bg-primary/90">Appliquer l'ajustement</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
