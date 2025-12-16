
'use client';

import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3,
  TrendingUp, 
  TrendingDown, 
  Users,
  FileText,
  CalendarDays,
  Filter,
  ArrowLeft
} from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Mocked Chart Component
const DemoChart = ({ title, description }: { title: string, description: string }) => (
    <Card>
        <CardHeader>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="h-48 w-full bg-muted rounded-md flex items-center justify-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30" />
            </div>
        </CardContent>
    </Card>
);

const DEMO_REPORTS = [
    { name: "Rapport Financier - Mai 2024", date: "01/06/2024", type: "Financier" },
    { name: "Analyse des Absences - Trimestre 3", date: "28/05/2024", type: "Académique" },
    { name: "Répartition des Élèves par Cycle", date: "25/05/2024", type: "Démographique" },
    { name: "Performance par Matière - Lycée", date: "22/05/2024", type: "Académique" },
]

export default function DemoAnalyticsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-muted/40 p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold md:text-2xl">Démo: Analytics & Rapports</h1>
              <p className="text-muted-foreground">Simulation du tableau de bord analytique.</p>
            </div>
             <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
            </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taux de Réussite</CardTitle>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">89.5%</div>
                    <p className="text-xs text-muted-foreground">+2.1% par rapport au dernier trimestre</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taux d'Absentéisme</CardTitle>
                    <TrendingDown className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">3.2%</div>
                    <p className="text-xs text-muted-foreground">-0.5% par rapport au dernier mois</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Nouvelles Inscriptions</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">+12</div>
                    <p className="text-xs text-muted-foreground">Ce mois-ci</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Performance Financière</CardTitle>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">+12%</div>
                    <p className="text-xs text-muted-foreground">Revenus par rapport à l'année dernière</p>
                </CardContent>
            </Card>
        </div>

        <div className="flex justify-end">
            <Button variant="outline" disabled>
                <Filter className="h-4 w-4 mr-2" />
                Filtrer par période
                <Badge variant="secondary" className="ml-2">Ce Trimestre</Badge>
            </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <DemoChart title="Évolution des inscriptions" description="Nombre de nouveaux élèves par mois." />
            <DemoChart title="Répartition par cycle" description="Distribution des élèves dans les cycles." />
            <DemoChart title="Performance par matière" description="Moyenne générale par matière principale." />
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Rapports Récents</CardTitle>
                <CardDescription>Liste des derniers rapports générés automatiquement.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom du Rapport</TableHead>
                            <TableHead>Date de Génération</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {DEMO_REPORTS.map(report => (
                            <TableRow key={report.name}>
                                <TableCell className="font-medium">{report.name}</TableCell>
                                <TableCell>{report.date}</TableCell>
                                <TableCell><Badge variant="outline">{report.type}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" disabled>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Télécharger
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
