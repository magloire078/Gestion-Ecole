
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Trophy, List, UserPlus, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, addDoc, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { activite as Activite, staff as Staff, student as Student, inscriptionActivite as Inscription, competition as Competition } from '@/lib/data-types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Schemas
const activiteSchema = z.object({
  name: z.string().min(2, "Le nom de l'activité est requis."),
  type: z.enum(['sportive', 'culturelle', 'club']),
  teacherInChargeId: z.string().min(1, "Le responsable est requis."),
  description: z.string().optional(),
  schedule: z.string().optional(),
});
type ActiviteFormValues = z.infer<typeof activiteSchema>;

const inscriptionSchema = z.object({
  studentId: z.string().min(1, { message: "Veuillez sélectionner un élève." }),
  activiteId: z.string().min(1, { message: "Veuillez sélectionner une activité." }),
  academicYear: z.string().min(1, { message: "L'année académique est requise." }),
});
type InscriptionFormValues = z.infer<typeof inscriptionSchema>;

const competitionSchema = z.object({
  name: z.string().min(2, "Le nom est requis."),
  date: z.string().min(1, "La date est requise."),
  description: z.string().optional(),
  results: z.string().optional(),
});
type CompetitionFormValues = z.infer<typeof competitionSchema>;


export default function ActivitesModulePage() {
  return (
        <Tabs defaultValue="activites" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="activites"><Trophy className="mr-2 h-4 w-4" />Activités</TabsTrigger>
                <TabsTrigger value="inscriptions"><UserPlus className="mr-2 h-4 w-4" />Inscriptions</TabsTrigger>
                <TabsTrigger value="competitions"><List className="mr-2 h-4 w-4" />Compétitions</TabsTrigger>
            </TabsList>
            <TabsContent value="activites" className="mt-6"><ActivitesPage /></TabsContent>
            <TabsContent value="inscriptions" className="mt-6"><InscriptionsPage /></TabsContent>
            <TabsContent value="competitions" className="mt-6"><CompetitionsPage /></TabsContent>
        </Tabs>
  )
}

function ActivitesPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageActivities = !!user?.profile?.permissions?.manageActivities;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivite, setEditingActivite] = useState<(Activite & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [activiteToDelete, setActiviteToDelete] = useState<(Activite & { id: string }) | null>(null);
  
  const activitesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/activites`)) : null, [firestore, schoolId]);
  const { data: activitesData, loading: activitesLoading } = useCollection(activitesQuery);
  const activites: (Activite & { id: string })[] = useMemo(() => activitesData?.map(d => ({ id: d.id, ...d.data() } as Activite & { id: string })) || [], [activitesData]);

  const teachersQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);
  const teachers: (Staff & { id: string })[] = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [teachersData]);

  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, `${t.firstName} ${t.lastName}`])), [teachers]);

  const form = useForm<ActiviteFormValues>({
    resolver: zodResolver(activiteSchema),
    defaultValues: { type: 'sportive', name: '', description: '', schedule: '', teacherInChargeId: '' },
  });

  const handleFormSubmit = async (values: ActiviteFormValues) => {
    if (!schoolId) return;
    const promise = editingActivite
      ? setDoc(doc(firestore, `ecoles/${schoolId}/activites/${editingActivite.id}`), values, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/activites`), values);
    try {
      await promise;
      toast({ title: `Activité ${editingActivite ? 'modifiée' : 'ajoutée'}`});
      setIsFormOpen(false);
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `ecoles/${schoolId}/activites`, operation: 'write', requestResourceData: values }));
    }
  };
  
  const handleOpenDeleteDialog = (activite: Activite & { id: string }) => {
    setActiviteToDelete(activite);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteActivite = async () => {
    if (!schoolId || !activiteToDelete) return;
    try {
        await deleteDoc(doc(firestore, `ecoles/${schoolId}/activites`, activiteToDelete.id));
        toast({ title: 'Activité supprimée' });
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `ecoles/${schoolId}/activites/${activiteToDelete.id}`, operation: 'delete' }));
    } finally {
        setIsDeleteDialogOpen(false);
        setActiviteToDelete(null);
    }
  };

  const isLoading = schoolLoading || activitesLoading || teachersLoading;

  return (
    <>
       <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Liste des activités</h2>
          {canManageActivities && (
            <Button onClick={() => { setEditingActivite(null); form.reset({ type: 'sportive', name: '', description: '', schedule: '', teacherInChargeId: '' }); setIsFormOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Ajouter une activité
            </Button>
          )}
      </div>
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 w-full" />)
        ) : activites.length > 0 ? (
          activites.map(activite => (
            <Card key={activite.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <Trophy className="h-8 w-8 text-amber-500" />
                  {canManageActivities && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingActivite(activite); form.reset(activite); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(activite)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <CardTitle>{activite.name}</CardTitle>
                <CardDescription className="capitalize">{activite.type}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1"><p className="text-sm text-muted-foreground">{activite.description}</p></CardContent>
              <CardFooter className="flex flex-col items-start text-sm">
                 <p><span className="font-semibold">Responsable:</span> {teacherMap.get(activite.teacherInChargeId) || 'N/A'}</p>
                 <p><span className="font-semibold">Horaire:</span> {activite.schedule || 'Non défini'}</p>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full"><Card className="flex items-center justify-center h-48"><p className="text-muted-foreground">Aucune activité créée.</p></Card></div>
        )}
      </div>
      
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingActivite ? 'Modifier' : 'Ajouter'} une activité</DialogTitle></DialogHeader>
          <Form {...form}><form id="activite-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="type" render={({ field }) => <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="sportive">Sportive</SelectItem><SelectItem value="culturelle">Culturelle</SelectItem><SelectItem value="club">Club</SelectItem></SelectContent></Select></FormItem>} />
              <FormField control={form.control} name="teacherInChargeId" render={({ field }) => <FormItem><FormLabel>Responsable</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir..."/></SelectTrigger></FormControl><SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
              <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
              <FormField control={form.control} name="schedule" render={({ field }) => <FormItem><FormLabel>Horaire</FormLabel><FormControl><Input placeholder="Ex: Mardi 16h-17h" {...field} /></FormControl></FormItem>} />
          </form></Form>
          <DialogFooter><Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button><Button type="submit" form="activite-form" disabled={form.formState.isSubmitting}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Cette action est irréversible. L'activité <strong>"{activiteToDelete?.name}"</strong> sera définitivement supprimée.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteActivite} className="bg-destructive hover:bg-destructive/90">
                    Supprimer
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function InscriptionsPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageActivities = !!user?.profile?.permissions?.manageActivities;

  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const inscriptionsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/inscriptions_activites`)) : null, [firestore, schoolId]);
  const { data: inscriptionsData, loading: inscriptionsLoading } = useCollection(inscriptionsQuery);
  const activitesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/activites`)) : null, [firestore, schoolId]);
  const { data: activitesData, loading: activitesLoading } = useCollection(activitesQuery);
  const studentsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [firestore, schoolId]);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);

  const activites: (Activite & { id: string })[] = useMemo(() => activitesData?.map(d => ({ id: d.id, ...d.data() } as Activite & { id: string })) || [], [activitesData]);
  const students: (Student & { id: string })[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student & { id: string })) || [], [studentsData]);
  const inscriptions = useMemo(() => {
    if (!inscriptionsData) return [];
    const studentMap = new Map(students.map(s => [s.id, `${s.firstName} ${s.lastName}`]));
    const activiteMap = new Map(activites.map(a => [a.id, a.name]));
    return inscriptionsData.map(doc => {
      const data = doc.data() as Inscription;
      return { id: doc.id, ...data, studentName: studentMap.get(data.studentId) || 'N/A', activiteName: activiteMap.get(data.activiteId) || 'N/A' };
    });
  }, [inscriptionsData, students, activites]);
  
  const form = useForm<InscriptionFormValues>({ resolver: zodResolver(inscriptionSchema), defaultValues: { academicYear: '2024-2025' } });

  const handleFormSubmit = async (values: InscriptionFormValues) => {
    if (!schoolId) return;
    try {
      await addDoc(collection(firestore, `ecoles/${schoolId}/inscriptions_activites`), values);
      toast({ title: 'Inscription réussie' });
      setIsFormOpen(false);
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `ecoles/${schoolId}/inscriptions_activites`, operation: 'create', requestResourceData: values }));
    }
  };

  const handleDelete = async (inscriptionId: string) => {
    if (!schoolId) return;
    try {
      await deleteDoc(doc(firestore, `ecoles/${schoolId}/inscriptions_activites`, inscriptionId));
      toast({ title: "Inscription annulée" });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `ecoles/${schoolId}/inscriptions_activites/${inscriptionId}`, operation: 'delete' }));
    }
  }

  const isLoading = schoolLoading || inscriptionsLoading || activitesLoading || studentsLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div><CardTitle>Inscriptions aux Activités</CardTitle><CardDescription>Gérez les élèves inscrits aux activités.</CardDescription></div>
            {canManageActivities && (<Button onClick={() => setIsFormOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Inscrire un élève</Button>)}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Élève</TableHead><TableHead>Activité</TableHead><TableHead>Année</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? ([...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>))
              : inscriptions.length > 0 ? (inscriptions.map(inscription => (
                  <TableRow key={inscription.id}>
                    <TableCell className="font-medium">{inscription.studentName}</TableCell>
                    <TableCell>{inscription.activiteName}</TableCell>
                    <TableCell>{inscription.academicYear}</TableCell>
                    <TableCell className="text-right">{canManageActivities && <Button variant="ghost" size="icon" onClick={() => handleDelete(inscription.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</TableCell>
                  </TableRow>
                )))
              : (<TableRow><TableCell colSpan={4} className="h-24 text-center">Aucune inscription.</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Inscrire un élève</DialogTitle></DialogHeader>
          <Form {...form}><form id="inscription-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="studentId" render={({ field }) => <FormItem><FormLabel>Élève</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir..."/></SelectTrigger></FormControl><SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
              <FormField control={form.control} name="activiteId" render={({ field }) => <FormItem><FormLabel>Activité</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir..."/></SelectTrigger></FormControl><SelectContent>{activites.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
              <FormField control={form.control} name="academicYear" render={({ field }) => (<FormItem><FormLabel>Année Scolaire</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="2024-2025">2024-2025</SelectItem><SelectItem value="2025-2026">2025-2026</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
          </form></Form>
          <DialogFooter><Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button><Button type="submit" form="inscription-form" disabled={form.formState.isSubmitting}>Inscrire</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CompetitionsPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageActivities = !!user?.profile?.permissions?.manageActivities;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<(Competition & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [competitionToDelete, setCompetitionToDelete] = useState<(Competition & { id: string }) | null>(null);

  const competitionsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/competitions`)) : null, [firestore, schoolId]);
  const { data: competitionsData, loading: competitionsLoading } = useCollection(competitionsQuery);
  const competitions = useMemo(() => competitionsData?.map(d => ({ id: d.id, ...d.data() } as Competition & { id: string })) || [], [competitionsData]);

  const form = useForm<CompetitionFormValues>({ resolver: zodResolver(competitionSchema) });

  const handleOpenForm = (competition: (Competition & { id: string }) | null) => {
    setEditingCompetition(competition);
    form.reset(competition ? { ...competition, date: format(new Date(competition.date), 'yyyy-MM-dd') } : { name: '', date: format(new Date(), 'yyyy-MM-dd'), description: '', results: '' });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: CompetitionFormValues) => {
    if (!schoolId) return;
    const promise = editingCompetition
      ? setDoc(doc(firestore, `ecoles/${schoolId}/competitions/${editingCompetition.id}`), values, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/competitions`), values);
    try {
      await promise;
      toast({ title: `Compétition ${editingCompetition ? 'modifiée' : 'ajoutée'}` });
      setIsFormOpen(false);
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `ecoles/${schoolId}/competitions`, operation: 'write', requestResourceData: values }));
    }
  };
  
  const handleOpenDeleteDialog = (competition: Competition & { id: string }) => {
    setCompetitionToDelete(competition);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCompetition = async () => {
    if (!schoolId || !competitionToDelete) return;
    try {
      await deleteDoc(doc(firestore, `ecoles/${schoolId}/competitions`, competitionToDelete.id));
      toast({ title: 'Événement supprimé' });
    } catch (e) {
       errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `ecoles/${schoolId}/competitions/${competitionToDelete.id}`, operation: 'delete' }));
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const isLoading = schoolLoading || competitionsLoading;

  return (
    <>
      <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div><CardTitle>Compétitions et Événements</CardTitle><CardDescription>Gérez les événements sportifs et culturels.</CardDescription></div>
              {canManageActivities && (<Button onClick={() => handleOpenForm(null)}><PlusCircle className="mr-2 h-4 w-4" />Nouvel Événement</Button>)}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Date</TableHead><TableHead>Résultats</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? ([...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>))
                : competitions.length > 0 ? (competitions.map(comp => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-medium">{comp.name}</TableCell>
                      <TableCell>{format(new Date(comp.date), 'd MMMM yyyy', { locale: fr })}</TableCell>
                      <TableCell className="text-muted-foreground">{comp.results || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/dashboard/activites/competitions/${comp.id}`}><Users className="mr-2 h-4 w-4"/>Gérer participants</Link></DropdownMenuItem>
                            {canManageActivities && <DropdownMenuItem onClick={() => handleOpenForm(comp)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>}
                            {canManageActivities && <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(comp)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )))
                : (<TableRow><TableCell colSpan={4} className="h-24 text-center">Aucune compétition.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCompetition ? 'Modifier' : 'Ajouter'} un événement</DialogTitle></DialogHeader>
          <Form {...form}><form id="competition-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="date" render={({ field }) => <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>} />
              <FormField control={form.control} name="results" render={({ field }) => <FormItem><FormLabel>Résultats</FormLabel><FormControl><Input placeholder="Ex: 1ère place..." {...field} /></FormControl></FormItem>} />
          </form></Form>
          <DialogFooter><Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button><Button type="submit" form="competition-form" disabled={form.formState.isSubmitting}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Cette action est irréversible. L'événement <strong>"{competitionToDelete?.name}"</strong> sera définitivement supprimé.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCompetition} className="bg-destructive hover:bg-destructive/90">
                    Supprimer
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
