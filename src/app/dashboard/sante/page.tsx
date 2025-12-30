
'use client';

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
import { Search, HeartPulse, ShieldAlert, Syringe } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, limit, orderBy } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { student as Student, dossierMedical as DossierMedical } from "@/lib/data-types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function HealthPage() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  const [searchTerm, setSearchTerm] = useState("");

  const studentsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [firestore, schoolId]);
  const dossiersQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [firestore, schoolId]); // This is simplified. A real app might use a collectionGroup.
  
  const recentConsultationsQuery = useMemoFirebase(() => schoolId ? query(
      collection(firestore, `ecoles/${schoolId}/eleves`), 
      // This is a placeholder as we can't query subcollections easily without collectionGroup
      // A real implementation would use a separate 'consultations' root collection or a backend function.
      orderBy('createdAt', 'desc'), 
      limit(5)
  ) : null, [firestore, schoolId]);


  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: dossiersData, loading: dossiersLoading } = useCollection(dossiersQuery);
  const { data: recentConsultationsData, loading: consultationsLoading } = useCollection(recentConsultationsQuery);

  const allStudents: (Student & {id: string})[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student & {id: string})) || [], [studentsData]);

  const students = useMemo(() => {
    return allStudents.filter(student =>
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allStudents, searchTerm]);
  
  const stats = useMemo(() => {
      const allDossiers = dossiersData?.map(d => d.data() as DossierMedical) || [];
      const withAllergies = allDossiers.filter(d => d.allergies && d.allergies.length > 0).length;
      return { withAllergies };
  }, [dossiersData]);

  const isLoading = schoolLoading || studentsLoading || userLoading || dossiersLoading || consultationsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Santé Scolaire</h1>
        <p className="text-muted-foreground">Tableau de bord de l'infirmerie et accès aux dossiers médicaux.</p>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Élèves Suivis</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{allStudents.length}</div>}
            <p className="text-xs text-muted-foreground">Total des élèves dans l'école</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Allergies Signalées</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats.withAllergies}</div>}
            <p className="text-xs text-muted-foreground">Élèves avec allergies connues</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prochain Rappel</CardTitle>
             <Syringe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">N/A</div>}
            <p className="text-xs text-muted-foreground">Prochain rappel de vaccin</p>
          </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Rechercher un dossier élève</CardTitle>
                    <div className="relative pt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Chercher un élève par nom ou matricule..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow><TableHead>Élève</TableHead><TableHead>Classe</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                        {isLoading ? (
                            [...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={3}><Skeleton className="h-5 w-full" /></TableCell>
                            </TableRow>
                            ))
                        ) : students.length > 0 ? (
                            students.slice(0, 5).map((student) => (
                            <TableRow key={student.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={student.photoUrl || ''} />
                                            <AvatarFallback>{`${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{student.firstName} {student.lastName}</p>
                                            <p className="text-xs text-muted-foreground">{student.matricule}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{student.class}</TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/dashboard/sante/${student.id}`}>
                                            Consulter le dossier
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">Aucun élève trouvé.</TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Consultations Récentes</CardTitle>
                    <CardDescription>Dernières visites à l'infirmerie.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-3">
                    {consultationsLoading ? (
                        [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                    ) : (
                        <p className="text-center text-sm text-muted-foreground py-8">Fonctionnalité à venir.</p>
                    )}
                 </CardContent>
            </Card>
       </div>
    </div>
  );
}
