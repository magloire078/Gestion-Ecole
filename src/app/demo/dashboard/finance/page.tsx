
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, TrendingUp, TrendingDown, Wallet, ArrowLeft } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';


const DEMO_TRANSACTIONS = [
    { id: 't1', date: '2024-05-20', description: 'Paiement scolarité - Awa Diop', category: 'Scolarité', type: 'Revenu', amount: 150000 },
    { id: 't2', date: '2024-05-18', description: 'Achat de fournitures de bureau', category: 'Fournitures', type: 'Dépense', amount: -25000 },
    { id: 't3', date: '2024-05-17', description: 'Paiement salaire - M. Diallo', category: 'Salaires', type: 'Dépense', amount: -450000 },
    { id: 't4', date: '2024-05-15', description: 'Paiement cantine - Famille Koné', category: 'Cantine', type: 'Revenu', amount: 30000 },
    { id: 't5', date: '2024-05-14', description: 'Facture électricité Senelec', category: 'Services Publics', type: 'Dépense', amount: -75000 },
    { id: 't6', date: '2024-05-12', description: 'Inscription activité extra-scolaire - F. Ndiaye', category: 'Activités', type: 'Revenu', amount: 15000 },
];

const totalRevenue = DEMO_TRANSACTIONS.filter(t => t.type === 'Revenu').reduce((sum, t) => sum + t.amount, 0);
const totalExpense = DEMO_TRANSACTIONS.filter(t => t.type === 'Dépense').reduce((sum, t) => sum + t.amount, 0);
const balance = totalRevenue + totalExpense;

export default function DemoFinancePage() {
  const router = useRouter();

  const formatCurrency = (value: number) => `${value.toLocaleString('fr-FR')} CFA`;

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-muted/40 p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold md:text-2xl">Démo: Comptabilité</h1>
              <p className="text-muted-foreground">Simulation du tableau de bord financier.</p>
            </div>
             <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
            </Button>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Encaissé</CardTitle>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground">Sur la période de démo</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Dépensé</CardTitle>
                    <TrendingDown className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">{formatCurrency(Math.abs(totalExpense))}</div>
                    <p className="text-xs text-muted-foreground">Sur la période de démo</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Solde</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
                    <p className="text-xs text-muted-foreground">Solde actuel de la trésorerie</p>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                  <CardTitle>Transactions Récentes</CardTitle>
                  <CardDescription>Liste des derniers mouvements financiers enregistrés.</CardDescription>
                </div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button disabled>
                          <span className="flex items-center gap-2">
                            <PlusCircle className="h-4 w-4" /> Ajouter une transaction
                          </span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Fonctionnalité désactivée en mode démo</p></TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DEMO_TRANSACTIONS.map((transaction) => (
                    <TableRow key={transaction.id}>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell className="font-medium">{transaction.description}</TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell className={cn('text-right font-mono', transaction.type === 'Revenu' ? 'text-emerald-500' : 'text-destructive')}>
                            {formatCurrency(transaction.amount)}
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      </div>
    </div>
    </TooltipProvider>
  );
}
