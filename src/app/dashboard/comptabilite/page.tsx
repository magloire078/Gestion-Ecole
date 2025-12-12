
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
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc, query, orderBy, where } from "firebase/firestore";
import { useSchoolData } from "@/hooks/use-school-data";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import type { accountingTransaction as AccountingTransaction } from '@/lib/data-types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AccountingCharts } from './charts';

const transactionSchema = z.object({
    description: z.string().min(1, { message: "La description est requise." }),
    amount: z.coerce.number().positive({ message: "Le montant doit être un nombre positif." }),
    type: z.enum(['Revenu', 'Dépense'], { required_error: "Le type est requis." }),
    category: z.string().min(1, { message: "La catégorie est requise." }),
    date: z.string().min(1, { message: "La date est requise." }),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export default function AccountingPage() {
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  const transactionsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `comptabilite`), where('schoolId', '==', schoolId), orderBy("date", "desc")) : null, [firestore, schoolId]);
  const { data: transactionsData, loading: transactionsLoading } = useCollection(transactionsQuery);
  const transactions: AccountingTransaction[] = useMemo(() => transactionsData?.map(d => ({ id: d.id, ...d.data() } as AccountingTransaction)) || [], [transactionsData]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<AccountingTransaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<AccountingTransaction | null>(null);

  const [allCategories, setAllCategories] = useState({
    Revenu: ['Scolarité', 'Dons', 'Événements'],
    Dépense: ['Salaires', 'Fournitures', 'Maintenance', 'Services Publics', 'Marketing']
  });

  const { toast } = useToast();
  const [todayDateString, setTodayDateString] = useState('');

  useEffect(() => {
    setTodayDateString(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
        description: "",
        amount: 0,
        type: "Dépense",
        category: "",
        date: todayDateString,
    },
  });

  const watchedType = form.watch('type');

  useEffect(() => {
    if (isFormOpen) {
        if (editingTransaction) {
            form.reset({
                description: editingTransaction.description,
                amount: editingTransaction.amount,
                type: editingTransaction.type,
                category: editingTransaction.category,
                date: format(new Date(editingTransaction.date), 'yyyy-MM-dd'),
            });
        } else {
            form.reset({
                description: "",
                amount: 0,
                type: "Dépense",
                category: "",
                date: todayDateString,
            });
        }
    }
  }, [isFormOpen, editingTransaction, form, todayDateString]);
  
  useEffect(() => {
    form.setValue('category', '');
  }, [watchedType, form]);


  const getTransactionDocRef = (transactionId: string) => doc(firestore, `comptabilite/${transactionId}`);
  
  const handleTransactionSubmit = (values: TransactionFormValues) => {
    if (!schoolId) return;

    const transactionData = {
        ...values,
        schoolId,
        date: format(new Date(values.date), "yyyy-MM-dd"),
    };

    if (editingTransaction) {
        const transactionDocRef = getTransactionDocRef(editingTransaction.id);
        setDoc(transactionDocRef, transactionData, { merge: true })
        .then(() => {
            toast({ title: "Transaction modifiée", description: "La transaction a été mise à jour." });
            setIsFormOpen(false);
        }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: transactionDocRef.path, operation: 'update', requestResourceData: transactionData });
            errorEmitter.emit('permission-error', permissionError);
        });
    } else {
        const transactionCollectionRef = collection(firestore, `comptabilite`);
        addDoc(transactionCollectionRef, transactionData)
        .then(() => {
            toast({ title: "Transaction ajoutée", description: `La transaction a été enregistrée.` });
            setIsFormOpen(false);
        }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: transactionCollectionRef.path, operation: 'create', requestResourceData: transactionData });
            errorEmitter.emit('permission-error', permissionError);
        });
    }
  };

  const handleOpenFormDialog = (transaction: AccountingTransaction | null) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
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

  const formatCurrency = (value: number) => `${value.toLocaleString('fr-FR')} CFA`;

  const handleCreateCategory = (newCategory: string) => {
      setAllCategories(prev => {
          const newCategoriesForType = [...prev[watchedType], newCategory];
          return { ...prev, [watchedType]: newCategoriesForType };
      });
      toast({ title: 'Catégorie créée', description: `La catégorie "${newCategory}" a été ajoutée.` });
      form.setValue('category', newCategory);
      return Promise.resolve({ value: newCategory, label: newCategory });
  }

  const categoryOptions = allCategories[watchedType].map(cat => ({ value: cat, label: cat }));
  const isLoading = schoolLoading || transactionsLoading;
  
  const renderFormContent = () => (
    <Form {...form}>
        <form id="transaction-form" onSubmit={form.handleSubmit(handleTransactionSubmit)} className="grid gap-4 py-4">
             <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-right">Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="col-span-3 flex items-center space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="Revenu" id="r1" />
                        </FormControl>
                        <FormLabel htmlFor="r1" className="font-normal">Revenu</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="Dépense" id="r2" />
                        </FormControl>
                        <FormLabel htmlFor="r2" className="font-normal">Dépense</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Catégorie</FormLabel>
                    <FormControl className="col-span-3">
                        <Combobox
                            placeholder="Sélectionner une catégorie"
                            searchPlaceholder="Chercher ou créer..."
                            options={categoryOptions}
                            value={field.value}
                            onValueChange={field.onChange}
                            onCreate={handleCreateCategory}
                        />
                    </FormControl>
                     <FormMessage className="col-start-2 col-span-3" />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Description</FormLabel>
                    <FormControl className="col-span-3">
                        <Input {...field} />
                    </FormControl>
                     <FormMessage className="col-start-2 col-span-3" />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Montant (CFA)</FormLabel>
                     <FormControl className="col-span-3">
                        <Input type="number" {...field} />
                    </FormControl>
                     <FormMessage className="col-start-2 col-span-3" />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Date</FormLabel>
                     <FormControl className="col-span-3">
                        <Input type="date" {...field} />
                    </FormControl>
                     <FormMessage className="col-start-2 col-span-3" />
                </FormItem>
                )}
            />
        </form>
    </Form>
  );

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold md:text-2xl">Comptabilité</h1>
          <p className="text-muted-foreground">
            Suivez les revenus, les dépenses et la santé financière de votre école.
          </p>
        </div>

        { !isLoading && transactions.length > 0 && <AccountingCharts transactions={transactions} /> }

        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Transactions Récentes</h2>
            <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) setEditingTransaction(null); setIsFormOpen(isOpen); }}>
                <DialogTrigger asChild>
                    <Button onClick={() => handleOpenFormDialog(null)}><span className="flex items-center gap-2"><PlusCircle className="h-4 w-4" /> Ajouter une Transaction</span></Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTransaction ? 'Modifier' : 'Nouvelle'} Transaction</DialogTitle>
                        <DialogDescription>Entrez les détails de la transaction.</DialogDescription>
                    </DialogHeader>
                    {renderFormContent()}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                        <Button type="submit" form="transaction-form" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
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
                        <TableCell>{format(new Date(transaction.date), 'd MMM yyyy', { locale: fr })}</TableCell>
                        <TableCell className="font-medium">{transaction.description}</TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell className={`text-right font-mono ${transaction.type === 'Revenu' ? 'text-emerald-500' : 'text-destructive'}`}>
                            {transaction.type === 'Revenu' ? '+' : '-'} {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                        <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleOpenFormDialog(transaction)}>Modifier</DropdownMenuItem>
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
