
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Scale,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { mockAccountingData } from "@/lib/data";
import type { Transaction } from "@/lib/data";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const categories = {
    Revenu: ['Scolarité', 'Dons', 'Événements', 'Autre'],
    Dépense: ['Salaires', 'Fournitures', 'Maintenance', 'Services Publics', 'Marketing', 'Autre']
};

export default function AccountingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockAccountingData);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<'Revenu' | 'Dépense'>('Dépense');
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setType("Dépense");
    setCategory("");
    setDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleAddTransaction = () => {
    if (!description || !amount || !category || !date) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Tous les champs sont requis.",
      });
      return;
    }

    const newTransaction: Transaction = {
      id: `TR${transactions.length + 1}`,
      description,
      amount: parseFloat(amount),
      type,
      category,
      date: format(new Date(date), "yyyy-MM-dd"),
    };

    setTransactions([...transactions, newTransaction]);
    toast({
      title: "Transaction ajoutée",
      description: `La transaction a été enregistrée avec succès.`,
    });

    resetForm();
    setIsAddDialogOpen(false);
  };
  
  const handleOpenEditDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setDescription(transaction.description);
    setAmount(String(transaction.amount));
    setType(transaction.type);
    setCategory(transaction.category);
    setDate(format(new Date(transaction.date), 'yyyy-MM-dd'));
    setIsEditDialogOpen(true);
  };

  const handleEditTransaction = () => {
    if (!editingTransaction || !description || !amount || !category || !date) {
      toast({ variant: "destructive", title: "Erreur", description: "Tous les champs sont requis." });
      return;
    }
    
    setTransactions(transactions.map(t => t.id === editingTransaction.id ? {
      ...t,
      description,
      amount: parseFloat(amount),
      type,
      category,
      date: format(new Date(date), 'yyyy-MM-dd'),
    } : t));

    toast({ title: "Transaction modifiée", description: "La transaction a été mise à jour." });
    
    setIsEditDialogOpen(false);
    setEditingTransaction(null);
    resetForm();
  };

  const handleOpenDeleteDialog = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteTransaction = () => {
    if (!transactionToDelete) return;
    setTransactions(transactions.filter(t => t.id !== transactionToDelete.id));
    toast({ title: "Transaction supprimée", description: "La transaction a été supprimée." });
    setIsDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  const { totalRevenue, totalExpenses, netBalance } = useMemo(() => {
    const totalRevenue = transactions.filter(t => t.type === 'Revenu').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'Dépense').reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalRevenue - totalExpenses;
    return { totalRevenue, totalExpenses, netBalance };
  }, [transactions]);
  
  const formatCurrency = (value: number) => isClient ? `${value.toLocaleString('fr-FR')} CFA` : `${value} CFA`;

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold md:text-2xl">Comptabilité</h1>
          <p className="text-muted-foreground">
            Suivez les revenus, les dépenses et la santé financière de votre école.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenu Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold text-emerald-500">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">Sur la période sélectionnée</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dépenses Totales</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
                <p className="text-xs text-muted-foreground">Sur la période sélectionnée</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Solde Net</CardTitle>
                <Scale className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(netBalance)}</div>
                <p className="text-xs text-muted-foreground">Revenus - Dépenses</p>
                </CardContent>
            </Card>
        </div>

        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Transactions Récentes</h2>
            <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setIsAddDialogOpen(isOpen); }}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Ajouter une transaction</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouvelle transaction</DialogTitle>
                        <DialogDescription>Entrez les détails de la transaction.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Form fields here */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">Type</Label>
                            <Select onValueChange={(v) => { setType(v as any); setCategory(''); }} value={type}>
                                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Revenu">Revenu</SelectItem>
                                    <SelectItem value="Dépense">Dépense</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category" className="text-right">Catégorie</Label>
                            <Select onValueChange={setCategory} value={category}>
                                <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger>
                                <SelectContent>
                                    {categories[type].map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">Description</Label>
                            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">Montant (CFA)</Label>
                            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">Date</Label>
                            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleAddTransaction}>Ajouter</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{isClient ? format(new Date(transaction.date), 'd MMM yyyy', { locale: fr }) : transaction.date}</TableCell>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell>{transaction.category}</TableCell>
                    <TableCell className={`text-right font-mono ${transaction.type === 'Revenu' ? 'text-emerald-500' : 'text-destructive'}`}>
                        {transaction.type === 'Revenu' ? '+' : '-'} {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEditDialog(transaction)}>Modifier</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(transaction)}>Supprimer</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

       {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {if (!isOpen) { setEditingTransaction(null); resetForm();} setIsEditDialogOpen(isOpen);}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la transaction</DialogTitle>
             <DialogDescription>Mettez à jour les détails de la transaction.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-type" className="text-right">Type</Label>
                  <Select onValueChange={(v) => { setType(v as any); setCategory(''); }} value={type}>
                      <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Revenu">Revenu</SelectItem>
                          <SelectItem value="Dépense">Dépense</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-category" className="text-right">Catégorie</Label>
                  <Select onValueChange={setCategory} value={category}>
                      <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger>
                      <SelectContent>
                          {categories[type].map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-description" className="text-right">Description</Label>
                  <Input id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-amount" className="text-right">Montant (CFA)</Label>
                  <Input id="edit-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-date" className="text-right">Date</Label>
                  <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="col-span-3" />
              </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleEditTransaction}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La transaction <strong>{transactionToDelete?.description}</strong> sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransaction} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
