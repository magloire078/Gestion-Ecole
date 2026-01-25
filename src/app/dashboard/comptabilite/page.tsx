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
  Scale
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, doc, deleteDoc, query, orderBy } from "firebase/firestore";
import { useSchoolData } from "@/hooks/use-school-data";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import type { accountingTransaction as AccountingTransaction } from '@/lib/data-types';
import { AccountingCharts } from './charts';
import { cn } from "@/lib/utils";
import { TransactionForm } from "@/components/comptabilite/transaction-form";


const StatCard = ({ title, value, icon: Icon, description, loading, colorClass }: { title: string, value: string | number, icon: React.ElementType, description?: string, loading: boolean, colorClass?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className={cn("h-4 w-4 text-muted-foreground", colorClass)} />
        </CardHeader>
        <CardContent>
            {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}
            {description && !loading && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);


export default function AccountingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const canManageBilling = !!user?.profile?.permissions?.manageBilling;

  const transactionsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/comptabilite`), orderBy("date", "desc")) : null, [firestore, schoolId]);
  const { data: transactionsData, loading: transactionsLoading } = useCollection(transactionsQuery);
  const transactions = useMemo(() => transactionsData?.map(d => ({ id: d.id, ...d.data() } as AccountingTransaction & {id: string})) || [], [transactionsData]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<(AccountingTransaction & {id: string}) | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<(AccountingTransaction & {id: string}) | null>(null);

  const { toast } = useToast();
  
  const getTransactionDocRef = (transactionId: string) => doc(firestore, `ecoles/${schoolId}/comptabilite/${transactionId}`);

  const handleOpenFormDialog = (transaction: (AccountingTransaction & {id: string}) | null) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleOpenDeleteDialog = (transaction: (AccountingTransaction & {id: string})) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteTransaction = () => {
    if (!schoolId || !transactionToDelete || !transactionToDelete.id) return;
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

  const isLoading = schoolLoading || transactionsLoading;

  const stats = useMemo(() => {
    const totalRevenu = transactions
        .filter(t => t.type === 'Revenu')
        .reduce((sum, t) => sum + t.amount, 0);
    const totalDepense = transactions
        .filter(t => t.type === 'Dépense')
        .reduce((sum, t) => sum + t.amount, 0);
    const solde = totalRevenu - totalDepense;
    return { totalRevenu, totalDepense, solde };
  }, [transactions]);
  
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
            <StatCard title="Total des Revenus" value={formatCurrency(stats.totalRevenu)} icon={TrendingUp} loading={isLoading} colorClass="text-emerald-500" />
            <StatCard title="Total des Dépenses" value={formatCurrency(stats.totalDepense)} icon={TrendingDown} loading={isLoading} colorClass="text-destructive" />
            <StatCard title="Solde Actuel" value={formatCurrency(stats.solde)} icon={Scale} loading={isLoading} colorClass={stats.solde >= 0 ? 'text-emerald-500' : 'text-destructive'} />
        </div>

        { !isLoading && transactions.length > 0 && <AccountingCharts transactions={transactions} /> }

        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Transactions Récentes</h2>
            {canManageBilling && (
              <Button onClick={() => handleOpenFormDialog(null)}>
                <span className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" /> Ajouter une Transaction
                </span>
              </Button>
            )}
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
                  {canManageBilling && <TableHead className="w-[50px] text-right">Actions</TableHead>}
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
                            {canManageBilling && <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>}
                        </TableRow>
                    ))
                ) : transactions.length > 0 ? (
                    transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                        <TableCell>{format(new Date(transaction.date), 'd MMM yyyy', { locale: fr })}</TableCell>
                        <TableCell className="font-medium">{transaction.description}</TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell className={cn('text-right font-mono', transaction.type === 'Revenu' ? 'text-emerald-500' : 'text-destructive')}>
                            {transaction.type === 'Revenu' ? '+' : '-'} {formatCurrency(transaction.amount)}
                        </TableCell>
                        {canManageBilling && (
                          <TableCell className="text-right">
                          <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                          <MoreHorizontal />
                                      </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleOpenFormDialog(transaction)}>Modifier</DropdownMenuItem>
                                      <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(transaction)}>Supprimer</DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                        )}
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={canManageBilling ? 5 : 4} className="h-24 text-center">Aucune transaction pour le moment.</TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
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

       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingTransaction ? 'Modifier' : 'Nouvelle'} Transaction</DialogTitle>
                <DialogDescription>Entrez les détails de la transaction.</DialogDescription>
            </DialogHeader>
            <TransactionForm 
                schoolId={schoolId!} 
                transaction={editingTransaction} 
                onSave={() => setIsFormOpen(false)}
            />
        </DialogContent>
    </Dialog>
    </>
  );
}
