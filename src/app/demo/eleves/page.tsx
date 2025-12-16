
'use client';

import { useState, useMemo } from 'react';
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
import { Input } from "@/components/ui/input";
import { Search, PlusCircle, Eye, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DEMO_STUDENTS } from '@/lib/demo-data';

const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'Actif':
            return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
        case 'Radié':
            return 'bg-destructive/80 text-destructive-foreground';
        case 'En attente':
            return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
        default:
            return 'bg-secondary text-secondary-foreground';
    }
};

const getTuitionBadgeVariant = (status: string) => {
    switch (status) {
        case 'Soldé': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
        case 'En retard': return 'bg-destructive/80 text-destructive-foreground';
        case 'Partiel': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
        default: return 'bg-secondary text-secondary-foreground';
    }
};


export default function DemoStudentsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = useMemo(() => {
    return DEMO_STUDENTS.filter(student =>
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-muted/40 p-6">
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4">
                <div>
                  <h1 className="text-lg font-semibold md:text-2xl">Démo: Liste des Élèves ({filteredStudents.length})</h1>
                  <p className="text-muted-foreground">Ceci est une simulation de la page de gestion des élèves.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.back()}>Retour au tableau de bord</Button>
                    <Button disabled>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Inscription
                    </Button>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Chercher par nom ou matricule..."
                        className="pl-8 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Élève</TableHead>
                                <TableHead>Classe</TableHead>
                                <TableHead>Âge</TableHead>
                                <TableHead className="text-center">Statut</TableHead>
                                <TableHead className="text-center">Paiement</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={student.photoUrl} alt={`${student.firstName} ${student.lastName}`} />
                                                    <AvatarFallback>{`${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{student.firstName} {student.lastName}</p>
                                                    <div className="text-xs text-muted-foreground font-mono">{student.matricule}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{student.class}</TableCell>
                                        <TableCell>{student.age} ans</TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={getStatusBadgeVariant(student.status)}>{student.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                             <Badge className={getTuitionBadgeVariant(student.tuitionStatus)}>{student.tuitionStatus}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Voir le Profil (simulé)
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">Aucun élève trouvé.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
