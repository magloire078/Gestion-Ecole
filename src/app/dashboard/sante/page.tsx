
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
import { Search, HeartPulse, ShieldAlert, Syringe, Users, CalendarClock } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, limit, orderBy, getDocs, collectionGroup, where } from 'firebase/firestore';
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { student as Student, dossierMedical as DossierMedical, consultation as Consultation, vaccination as Vaccination } from "@/lib/data-types";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";

export default function HealthPage() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({ withAllergies: 0 });
  const [recentConsultations, setRecentConsultations] = useState<(Consultation & {studentName: string})[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<(Vaccination & { studentName: string; studentId: string; id: string; rappelDate: Date })[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const studentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [firestore, schoolId]);
  
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);

  const allStudents: (Student & {id: string})[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student & {id: string})) || [], [studentsData]);
  const studentsMap = useMemo(() => new Map(allStudents.map(s => [s.id, `${s.firstName} ${s.lastName}`])), [allStudents]);

  const students = useMemo(() => {
    return allStudents.filter(student =>
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allStudents, searchTerm]);
  
  useEffect(() => {
    if (!schoolId || !firestore || studentsMap.size === 0) {
        if (!studentsLoading) setDataLoading(false);
        return;
    };
    
    const fetchHealthData = async () => {
        setDataLoading(true);

        const statsPromise = (async () => {
            const dossiersWithAllergiesQuery = query(collectionGroup(firestore, 'dossier_medical'), where('schoolId', '==', schoolId), where('allergies', '!=', []));
            const snapshot = await getDocs(dossiersWithAllergiesQuery);
            setStats({ withAllergies: snapshot.size });
        })();

        const consultationsPromise = (async () => {
            const consultationsQuery = query(collectionGroup(firestore, 'consultations'), where('schoolId', '==', schoolId), orderBy('date', 'desc'), limit(5));
            const snapshot = await getDocs(consultationsQuery);
            const consultations: (Consultation & {studentName: string})[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                const studentId = doc.ref.parent.parent?.parent?.id;
                if (studentId) {
                    consultations.push({ ...(data as Consultation), studentName: studentsMap.get(studentId) || 'Élève inconnu' });
                }
            });
            setRecentConsultations(consultations);
        })();

        const remindersPromise = (async () => {
            const today = new Date();
            const next30Days = new Date(today);
            next30Days.setDate(today.getDate() + 30);

            const vaccinsQuery = query(collectionGroup(firestore, 'vaccins'), where('schoolId', '==', schoolId), where('rappel', '>=', today.toISOString().split('T')[0]));
            const snapshot = await getDocs(vaccinsQuery);
            const reminders: (Vaccination & { studentName: string; studentId: string; id: string; rappelDate: Date })[] = [];
            snapshot.forEach(doc => {
                const data = doc.data() as Vaccination;
                if (data.rappel) {
                    const rappelDate = new Date(data.rappel);
                    if (rappelDate <= next30Days) {
                        const studentId = doc.ref.parent.parent?.parent?.id;
                        if (studentId) {
                            reminders.push({ ...data, id: doc.id, studentId, studentName: studentsMap.get(studentId) || 'Élève inconnu', rappelDate });
                        }
                    }
                }
            });
            reminders.sort((a,b) => a.rappelDate.getTime() - b.rappelDate.getTime());
            setUpcomingReminders(reminders);
        })();

        try {
            await Promise.all([statsPromise, consultationsPromise, remindersPromise]);
        } catch (error) {
            console.error("Error fetching health data:", error);
        } finally {
            setDataLoading(false);
        }
    };
    
    if (studentsMap.size > 0) {
      fetchHealthData();
    }
  }, [schoolId, firestore, studentsMap, studentsLoading]);

  const isLoading = schoolLoading || studentsLoading || userLoading || dataLoading;

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
            <CardTitle className="text-sm font-medium">Rappels (30j)</CardTitle>
             <Syringe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{upcomingReminders.length}</div>}
            <p className="text-xs text-muted-foreground">Prochains rappels de vaccins</p>
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
            <div className="space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Consultations Récentes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {isLoading ? (
                            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                        ) : recentConsultations.length > 0 ? (
                        recentConsultations.map((c, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-full">
                                <HeartPulse className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-sm">{c.studentName}</div>
                                <div className="text-xs text-muted-foreground">{c.motif}</div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {format(new Date(c.date), 'dd/MM', { locale: fr })}
                            </div>
                            </div>
                        ))
                        ) : (
                            <p className="text-center text-sm text-muted-foreground py-4">Aucune consultation récente.</p>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Prochains Rappels de Vaccins</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {isLoading ? (
                            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                        ) : upcomingReminders.length > 0 ? (
                        upcomingReminders.map(r => (
                            <div key={r.id} className="flex items-center gap-3">
                                <div className="p-2 bg-muted rounded-full">
                                    <CalendarClock className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-sm">{r.studentName}</div>
                                    <div className="text-xs text-muted-foreground">Rappel: {r.nom}</div>
                                </div>
                                <div className="text-xs font-semibold text-amber-700">
                                    {format(r.rappelDate, 'dd/MM/yy', { locale: fr })}
                                </div>
                            </div>
                        ))
                        ) : (
                            <p className="text-center text-sm text-muted-foreground py-4">Aucun rappel imminent.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
       </div>
    </div>
  );
}

