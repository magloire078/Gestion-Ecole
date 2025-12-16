'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import type { admin_role as AdminRole } from '@/lib/data-types';

const permissionsSchema = z.object({
    manageUsers: z.boolean().default(false), viewUsers: z.boolean().default(false),
    manageSchools: z.boolean().default(false), viewSchools: z.boolean().default(false),
    manageClasses: z.boolean().default(false), manageGrades: z.boolean().default(false),
    manageSystem: z.boolean().default(false), viewAnalytics: z.boolean().default(false),
    manageSettings: z.boolean().default(false), manageBilling: z.boolean().default(false),
    manageContent: z.boolean().default(false), viewSupportTickets: z.boolean().default(false),
    manageSupportTickets: z.boolean().default(false), apiAccess: z.boolean().default(false),
    exportData: z.boolean().default(false),
    manageCommunication: z.boolean().default(false),
    manageSchedule: z.boolean().default(false),
    manageAttendance: z.boolean().default(false),
    manageLibrary: z.boolean().default(false),
    manageCantine: z.boolean().default(false),
    manageTransport: z.boolean().default(false),
    manageInternat: z.boolean().default(false),
    manageInventory: z.boolean().default(false),
    manageRooms: z.boolean().default(false),
    manageActivities: z.boolean().default(false),
    manageMedical: z.boolean().default(false),
});


const roleSchema = z.object({
  name: z.string().min(2, "Le nom est requis."),
  description: z.string().optional(),
  permissions: permissionsSchema
});
type RoleFormValues = z.infer<typeof roleSchema>;

const permissionLabels: { id: keyof z.infer<typeof permissionsSchema>; label: string, category: string }[] = [
    { id: 'manageUsers', label: 'Gérer Personnel & Élèves', category: 'Utilisateurs' },
    { id: 'viewUsers', label: 'Voir Personnel & Élèves', category: 'Utilisateurs' },
    { id: 'manageBilling', label: 'Gérer Facturation & Comptabilité', category: 'Finances' },
    { id: 'manageClasses', label: 'Gérer Structure & Emploi du temps', category: 'Pédagogie' },
    { id: 'manageGrades', label: 'Gérer Notes & Absences', category: 'Pédagogie' },
    { id: 'manageCommunication', label: 'Gérer la Communication', category: 'Communication' },
    { id: 'manageLibrary', label: 'Gérer la Bibliothèque', category: 'Modules' },
    { id: 'manageCantine', label: 'Gérer la Cantine', category: 'Modules' },
    { id: 'manageTransport', label: 'Gérer le Transport', category: 'Modules' },
    { id: 'manageInternat', label: 'Gérer l\'Internat', category: 'Modules' },
    { id: 'manageInventory', label: 'Gérer l\'Inventaire & Maintenance', category: 'Modules' },
    { id: 'manageRooms', label: 'Gérer Salles & Réservations', category: 'Modules' },
    { id: 'manageActivities', label: 'Gérer Activités & Compétitions', category: 'Modules' },
    { id: 'manageMedical', label: 'Gérer Dossiers Médicaux', category: 'Modules' },
    { id: 'manageSettings', label: 'Gérer Paramètres École', category: 'Administration' },
    { id: 'manageSystem', label: 'Gérer Système (Super Admin)', category: 'Administration' },
];


export default function AdminRolesPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isDirector = user?.profile?.role === 'directeur';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<(AdminRole & { id: string }) | null>(null);
  
  const rolesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/admin_roles`)) : null, [firestore, schoolId]);
  const { data: rolesData, loading: rolesLoading } = useCollection(rolesQuery);
  const roles: (AdminRole & { id: string })[] = useMemo(() => rolesData?.map(d => ({ id: d.id, ...d.data() } as AdminRole & { id: string })) || [], [rolesData]);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', description: '', permissions: {} },
  });

  const handleOpenForm = (role: (AdminRole & { id: string }) | null) => {
    setEditingRole(role);
    form.reset(role ? {
        name: role.name,
        description: role.description,
        permissions: role.permissions || {}
    } : { name: '', description: '', permissions: {} });
    setIsFormOpen(true);
  };

  const handleSaveRole = async (values: RoleFormValues) => {
    if (!schoolId) return;

    try {
        const roleId = editingRole ? editingRole.id : values.name.toLowerCase().replace(/ /g, '_');
        const roleRef = doc(firestore, `ecoles/${schoolId}/admin_roles`, roleId);
        
        await setDoc(roleRef, { ...values, schoolId, level: 0 }, { merge: true });

        toast({ title: 'Rôle enregistré', description: `Le rôle "${values.name}" a été sauvegardé.` });
        setIsFormOpen(false);
    } catch (error) {
        const path = `admin_roles/${editingRole ? editingRole.id : '(new)'}`;
        const operation = editingRole ? 'update' : 'create';
        const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: values });
        errorEmitter.emit('permission-error', permissionError);
    }
  };

  const isLoading = schoolLoading || rolesLoading;
  
  const groupedPermissions = permissionLabels.reduce((acc, perm) => {
      acc[perm.category] = acc[perm.category] || [];
      acc[perm.category].push(perm);
      return acc;
  }, {} as Record<string, typeof permissionLabels>);

  return (
    <>
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Gestion des Rôles</CardTitle>
                        <CardDescription>Définissez des rôles personnalisés pour votre personnel.</CardDescription>
                    </div>
                    {isDirector && (
                         <Button onClick={() => handleOpenForm(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />Nouveau Rôle
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {isLoading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full"/>)
                    : roles.map(role => (
                        <Card key={role.id}>
                             <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle>{role.name}</CardTitle>
                                    {isDirector && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenForm(role)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Modifier
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                                <CardDescription>{role.description || 'Pas de description'}</CardDescription>
                            </CardHeader>
                             <CardContent>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    {Object.entries(role.permissions || {}).filter(([, value]) => value === true).map(([key]) => (
                                        <li key={key} className="capitalize">
                                            - {permissionLabels.find(p => p.id === key)?.label || key}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>{editingRole ? 'Modifier le rôle' : 'Créer un nouveau rôle'}</DialogTitle>
            </DialogHeader>
             <Form {...form}>
                <form id="role-form" onSubmit={form.handleSubmit(handleSaveRole)} className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom du rôle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)} />
                    <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                     
                     <div className="space-y-4 pt-4 border-t max-h-[50vh] overflow-y-auto p-1">
                        <h3 className="font-semibold">Permissions</h3>
                        {Object.entries(groupedPermissions).map(([category, perms]) => (
                            <div key={category}>
                                <h4 className="font-medium text-sm mb-2">{category}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                {perms.map(p => (
                                    <FormField key={p.id} control={form.control} name={`permissions.${p.id}`} render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            <FormLabel className="font-normal">{p.label}</FormLabel>
                                        </FormItem>
                                    )}/>
                                ))}
                                </div>
                            </div>
                        ))}
                     </div>
                </form>
            </Form>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                <Button type="submit" form="role-form" disabled={form.formState.isSubmitting}>Enregistrer</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
