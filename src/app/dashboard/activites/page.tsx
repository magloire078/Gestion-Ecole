
'use client';

import { useState, useMemo, useEffect } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Trophy, List, UserPlus } from 'lucide-react';
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
import type { activite as Activite, staff as Staff } from '@/lib/data-types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const activiteSchema = z.object({
  name: z.string().min(2, "Le nom de l'activité est requis."),
  type: z.enum(['sportive', 'culturelle', 'club']),
  teacherInChargeId: z.string().min(1, "Le responsable est requis."),
  description: z.string().optional(),
  schedule: z.string().optional(),
});

type ActiviteFormValues = z.infer<typeof activiteSchema>;

export default function ActivitesLayout() {
  const pathname = usePathname();
  const activeTab = pathname.includes('/inscriptions') ? 'inscriptions' : pathname.includes('/competitions') ? 'competitions' : 'activites';

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-lg font-semibold md:text-2xl">Activités Parascolaires</h1>
            <p className="text-muted-foreground">Gérez les activités, les inscriptions des élèves et les compétitions.</p>
        </div>
        
        <Tabs defaultValue={activeTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="activites" asChild>
                    <Link href="/dashboard/activites"><Trophy className="mr-2 h-4 w-4" />Activités</Link>
                </TabsTrigger>
                <TabsTrigger value="inscriptions" asChild>
                    <Link href="/dashboard/activites/inscriptions"><UserPlus className="mr-2 h-4 w-4" />Inscriptions</Link>
                </TabsTrigger>
                 <TabsTrigger value="competitions" asChild>
                    <Link href="/dashboard/activites/competitions"><List className="mr-2 h-4 w-4" />Compétitions</Link>
                </TabsTrigger>
            </TabsList>
            {pathname === '/dashboard/activites' && <ActivitesPage />}
        </Tabs>
      </div>
  )
}

function ActivitesPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageContent = !!user?.profile?.permissions?.manageContent;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivite, setEditingActivite] = useState<(Activite & { id: string }) | null>(null);
  
  const activitesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/activites`)) : null, [firestore, schoolId]);
  const { data: activitesData, loading: activitesLoading } = useCollection(activitesQuery);
  const activites: (Activite & { id: string })[] = useMemo(() => activitesData?.map(d => ({ id: d.id, ...d.data() } as Activite & { id: string })) || [], [activitesData]);

  const teachersQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);
  const teachers: (Staff & { id: string })[] = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [teachersData]);

  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, `${t.firstName} ${t.lastName}`])), [teachers]);

  const form = useForm<ActiviteFormValues>({
    resolver: zodResolver(activiteSchema),
    defaultValues: { type: 'sportive' },
  });

  useEffect(() => {
    form.reset(editingActivite || { type: 'sportive', name: '', description: '', schedule: '', teacherInChargeId: '' });
  }, [isFormOpen, editingActivite, form]);

  const handleFormSubmit = async (values: ActiviteFormValues) => {
    if (!schoolId) return;

    const promise = editingActivite
      ? setDoc(doc(firestore, `ecoles/${schoolId}/activites/${editingActivite.id}`), values, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/activites`), values);

    try {
      await promise;
      toast({ title: `Activité ${editingActivite ? 'modifiée' : 'ajoutée'}`, description: `L'activité ${values.name} a été enregistrée.` });
      setIsFormOpen(false);
    } catch (error) {
      const path = `ecoles/${schoolId}/activites/${editingActivite?.id || '(new)'}`;
      const operation = editingActivite ? 'update' : 'create';
      const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: values });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const isLoading = schoolLoading || activitesLoading || teachersLoading;

  return (
    <>
      <TabsContent value="activites" className="mt-6">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Liste des activités</h2>
              {canManageContent && (
                <Button onClick={() => { setEditingActivite(null); setIsFormOpen(true); }}>
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
                      {canManageContent && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingActivite(activite); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <CardTitle>{activite.name}</CardTitle>
                    <CardDescription className="capitalize">{activite.type}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground">{activite.description}</p>
                  </CardContent>
                  <CardFooter className="flex flex-col items-start text-sm">
                     <p><span className="font-semibold">Responsable:</span> {teacherMap.get(activite.teacherInChargeId) || 'N/A'}</p>
                     <p><span className="font-semibold">Horaire:</span> {activite.schedule || 'Non défini'}</p>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full">
                <Card className="flex items-center justify-center h-48">
                  <p className="text-muted-foreground">Aucune activité n'a été créée pour le moment.</p>
                </Card>
              </div>
            )}
          </div>
      </TabsContent>
      
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingActivite ? 'Modifier' : 'Ajouter'} une activité</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form id="activite-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nom de l'activité</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="type" render={({ field }) => <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="sportive">Sportive</SelectItem><SelectItem value="culturelle">Culturelle</SelectItem><SelectItem value="club">Club</SelectItem></SelectContent></Select></FormItem>} />
              <FormField control={form.control} name="teacherInChargeId" render={({ field }) => <FormItem><FormLabel>Responsable</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir un responsable..."/></SelectTrigger></FormControl><SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
              <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
              <FormField control={form.control} name="schedule" render={({ field }) => <FormItem><FormLabel>Horaire</FormLabel><FormControl><Input placeholder="Ex: Mardi 16h-17h" {...field} /></FormControl></FormItem>} />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
            <Button type="submit" form="activite-form" disabled={form.formState.isSubmitting}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
