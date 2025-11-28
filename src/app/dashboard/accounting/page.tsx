
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
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { useSchoolData } from "@/hooks/use-school-data";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthProtection } from '@/hooks/use-auth-protection';
import { AccountingCharts } from "./charts";
import type { AccountingTransaction } from '@/lib/data';

export default function AccountingPage() {
  const { isLoading: isAuthLoading, AuthProtectionLoader } = useAuthProtection();
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  const transactionsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/comptabilite`), orderBy("date", "desc")) : null, [firestore, schoolId]);
  const { data: transactionsData, loading: transactionsLoading } = useCollection(transactionsQuery);
  const transactions: AccountingTransaction[] = useMemo(() => transactionsData?.map(d => ({ id: d.id, ...d.data() } as AccountingTransaction)) || [], [transactionsData]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [allCategories, setAllCategories] = useState({
    Revenu: ['Scolarité', 'Dons', 'Événements'],
    Dépense: ['Salaires', 'Fournitures', 'Maintenance', 'Services Publics', 'Marketing']
  });

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<'Revenu' | 'Dépense'>('Dépense');
  const [category, setCategory] = useState("");
  const [date, setDate] = useState('');

  const [editingTransaction, setEditingTransaction] = useState<AccountingTransaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<AccountingTransaction | null>(null);

  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!date) {
      setDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [date]);

  const getTransactionDocRef = (transactionId: string) => doc(firestore, `ecoles/${schoolId}/comptabilite/${transactionId}`);

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setType("Dépense");
    setCategory("");
    setDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleAddTransaction = () => {
    if (!schoolId || !description || !amount || !category || !date) {
      toast({ variant: "destructive", title: "Erreur", description: "Tous les champs sont requis." });
      return;
    }
    const newTransactionData = {
      description,
      amount: parseFloat(amount),
      type,
      category,
      date: format(new Date(date), "yyyy-MM-dd"),
    };
    const transactionCollectionRef = collection(firestore, `ecoles/${schoolId}/comptabilite`);
    addDoc(transactionCollectionRef, newTransactionData)
    .then(() => {
        toast({ title: "Transaction ajoutée", description: `La transaction a été enregistrée.` });
        resetForm();
        setIsAddDialogOpen(false);
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: transactionCollectionRef.path, operation: 'create', requestResourceData: newTransactionData });
        errorEmitter.emit('permission-error', permissionError);
    });
  };
  
  const handleOpenEditDialog = (transaction: AccountingTransaction) => {
    setEditingTransaction(transaction);
    setDescription(transaction.description);
    setAmount(String(transaction.amount));
    setType(transaction.type);
    setCategory(transaction.category);
    setDate(format(new Date(transaction.date), 'yyyy-MM-dd'));
    setIsEditDialogOpen(true);
  };

  const handleEditTransaction = () => {
    if (!schoolId || !editingTransaction || !description || !amount || !category || !date) {
      toast({ variant: "destructive", title: "Erreur", description: "Tous les champs sont requis." });
      return;
    }
    const updatedData = {
      description,
      amount: parseFloat(amount),
      type,
      category,
      date: format(new Date(date), 'yyyy-MM-dd'),
    };
    const transactionDocRef = getTransactionDocRef(editingTransaction.id);
    setDoc(transactionDocRef, updatedData, { merge: true })
    .then(() => {
        toast({ title: "Transaction modifiée", description: "La transaction a été mise à jour." });
        setIsEditDialogOpen(false);
        setEditingTransaction(null);
        resetForm();
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: transactionDocRef.path, operation: 'update', requestResourceData: updatedData });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleOpenDeleteDialog = (transaction: AccountingTransaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteTransaction = () => {
    if (!schoolId || !transactionToDelete) return;
    const transactionDocRef = getTransactionDocRef(transactionToDelete.id);
    deleteDoc(transactionDocRef)
    .then(() => {
        toast({ title: "Transaction supprimée", description: "La transaction a été supprimée." });
        setIsDeleteDialogOpen(false);
        setTransactionToDelete(null);
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: transactionDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const formatCurrency = (value: number) => isClient ? `${value.toLocaleString('fr-FR')} CFA` : `${value} CFA`;

  const handleCreateCategory = (newCategory: string) => {
      setAllCategories(prev => {
          const newCategoriesForType = [...prev[type], newCategory];
          return { ...prev, [type]: newCategoriesForType };
      });
      toast({ title: 'Catégorie créée', description: `La catégorie "${newCategory}" a été ajoutée.` });
      return Promise.resolve({ value: newCategory, label: newCategory });
  }

  const categoryOptions = allCategories[type].map(cat => ({ value: cat, label: cat }));

  const isLoading = !isClient || schoolLoading || transactionsLoading;

  if (isAuthLoading) {
    return <AuthProtectionLoader />;
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold md:text-2xl">Comptabilité</h1>
          <p className="text-muted-foreground">
            Suivez les revenus, les dépenses et la santé financière de votre école.
          </p>
        </div>
        
        <AccountingCharts transactions={transactions} />

        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Transactions Récentes</h2>
            <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setIsAddDialogOpen(isOpen); }}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Ajouter une Transaction</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouvelle Transaction</DialogTitle>
                        <DialogDescription>Entrez les détails de la transaction.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
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
                             <Combobox
                                className="col-span-3"
                                placeholder="Sélectionner une catégorie"
                                searchPlaceholder="Chercher ou créer..."
                                options={categoryOptions}
                                value={category}
                                onValueChange={setCategory}
                                onCreate={handleCreateCategory}
                            />
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
                {isLoading ? (
                    [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : transactions.length > 0 ? (
                    transactions.map((transaction) => (
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
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">Aucune transaction pour le moment.</TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

       {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {if (!isOpen) { setEditingTransaction(null); resetForm();} setIsEditDialogOpen(isOpen);}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la Transaction</DialogTitle>
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
                   <Combobox
                        className="col-span-3"
                        placeholder="Sélectionner une catégorie"
                        searchPlaceholder="Chercher ou créer..."
                        options={categoryOptions}
                        value={category}
                        onValueChange={setCategory}
                        onCreate={handleCreateCategory}
                    />
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
