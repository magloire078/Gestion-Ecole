
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import type { admin_role as AdminRole } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useSchoolData } from '@/hooks/use-school-data';

const permissionsSchema = z.object({
    manageUsers: z.boolean().default(false),
    viewUsers: z.boolean().default(false),
    manageSchools: z.boolean().default(false),
    viewSchools: z.boolean().default(false),
    manageClasses: z.boolean().default(false),
    manageGrades: z.boolean().default(false),
    manageSystem: z.boolean().default(false),
    viewAnalytics: z.boolean().default(false),
    manageSettings: z.boolean().default(false),
    manageBilling: z.boolean().default(false),
    manageCommunication: z.boolean().default(false),
    manageLibrary: z.boolean().default(false),
    manageCantine: z.boolean().default(false),
    manageTransport: z.boolean().default(false),
    manageInternat: z.boolean().default(false),
    manageInventory: z.boolean().default(false),
    manageRooms: z.boolean().default(false),
    manageActivities: z.boolean().default(false),
    manageMedical: z.boolean().default(false),
    viewSupportTickets: z.boolean().default(false),
    manageSupportTickets: z.boolean().default(false),
    apiAccess: z.boolean().default(false),
    exportData: z.boolean().default(false),
});

const roleSchema = z.object({
  name: z.string().min(1, { message: "Le nom du rôle est requis." }),
  description: z.string().optional(),
  permissions: permissionsSchema,
});

type RoleFormValues = z.infer<typeof roleSchema>;

const allPermissions: {id: keyof z.infer<typeof permissionsSchema>, label: string, group: string}[] = [
    { id: 'manageUsers', label: 'Gérer utilisateurs', group: 'Utilisateurs' },
    { id: 'viewUsers', label: 'Voir utilisateurs', group: 'Utilisateurs' },
    { id: 'manageClasses', label: 'Gérer classes/notes', group: 'Pédagogie' },
    { id: 'manageGrades', label: 'Gérer notes', group: 'Pédagogie' },
    { id: 'manageSchedule', label: 'Gérer emploi du temps', group: 'Pédagogie' },
    { id: 'manageAttendance', label: 'Gérer absences', group: 'Pédagogie' },
    { id: 'manageBilling', label: 'Gérer facturation', group: 'Finance' },
    { id: 'viewAnalytics', label: 'Voir statistiques', group: 'Analyse' },
    { id: 'manageCommunication', label: 'Gérer communication', group: 'Communication' },
    { id: 'manageLibrary', label: 'Gérer bibliothèque', group: 'Modules' },
    { id: 'manageCantine', label: 'Gérer cantine', group: 'Modules' },
    { id: 'manageTransport', label: 'Gérer transport', group: 'Modules' },
    { id: 'manageInternat', label: 'Gérer internat', group: 'Modules' },
    { id: 'manageInventory', label: 'Gérer inventaire', group: 'Modules' },
    { id: 'manageRooms', label: 'Gérer salles', group: 'Modules' },
    { id: 'manageActivities', label: 'Gérer activités', group: 'Modules' },
    { id: 'manageMedical', label: 'Gérer santé', group: 'Modules' },
    { id: 'manageSettings', label: 'Gérer paramètres école', group: 'Administration' },
    { id: 'exportData', label: 'Exporter les données', group: 'Administration' },
];

const permissionGroups = ['Utilisateurs', 'Pédagogie', 'Finance', 'Analyse', 'Communication', 'Modules', 'Administration'];

export default function AdminRolesPage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { schoolId, loading: schoolLoading } = useSchoolData();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<AdminRole & { id: string } | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<AdminRole & { id: string } | null>(null);
    
    const isDirectorOrAdmin = user?.profile?.role === 'directeur' || user?.profile?.isAdmin;

    const rolesQuery = useMemoFirebase(() => (schoolId && isDirectorOrAdmin) ? query(collection(firestore, `ecoles/${schoolId}/admin_roles`)) : null, [firestore, schoolId, isDirectorOrAdmin]);
    const { data: rolesData, loading: rolesLoading } = useCollection(rolesQuery);
    
    const roles: (AdminRole & { id: string })[] = useMemo(() => rolesData?.map(doc => ({ id: doc.id, ...doc.data() } as AdminRole & { id: string })) || [], [rolesData]);

    const form = useForm<RoleFormValues>({
        resolver: zodResolver(roleSchema),
        defaultValues: {
            name: '',
            description: '',
            permissions: {},
        }
    });
    
    useEffect(() => {
        if (!userLoading && !isDirectorOrAdmin) {
            toast({
                variant: 'destructive',
                title: 'Accès non autorisé',
                description: "Vous n'avez pas les droits pour accéder à cette page."
            });
            router.push('/dashboard');
        }
    }, [user, userLoading, router, toast, isDirectorOrAdmin]);


    useEffect(() => {
        if (isFormOpen) {
            form.reset(editingRole ? {
                name: editingRole.name,
                description: editingRole.description || '',
                permissions: editingRole.permissions || {},
            } : {
                name: '',
                description: '',
                permissions: {},
            });
        }
    }, [isFormOpen, editingRole, form]);

    const handleOpenForm = (role: AdminRole & { id: string } | null) => {
        setEditingRole(role);
        setIsFormOpen(true);
    };
    
    const handleOpenDeleteDialog = (role: AdminRole & { id: string }) => {
        setRoleToDelete(role);
        setIsDeleteDialogOpen(true);
    };

    const handleSaveRole = async (values: RoleFormValues) => {
        if (!schoolId) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'ID de l\'école non trouvé.'});
            return;
        }

        try {
            if (editingRole) {
                const roleRef = doc(firestore, `ecoles/${schoolId}/admin_roles`, editingRole.id);
                await setDoc(roleRef, values, { merge: true });
                toast({ title: 'Rôle modifié' });
            } else {
                const rolesCollectionRef = collection(firestore, `ecoles/${schoolId}/admin_roles`);
                await addDoc(rolesCollectionRef, { ...values, schoolId });
                toast({ title: 'Rôle créé' });
            }
            setIsFormOpen(false);
        } catch (e) {
            const path = `ecoles/${schoolId}/admin_roles/${editingRole?.id || ''}`;
            const operation = editingRole ? 'update' : 'create';
            const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: values });
            errorEmitter.emit('permission-error', permissionError);
        }
    };
    
    const handleDeleteRole = async () => {
        if (!roleToDelete || !schoolId) return;
        
        try {
            const roleRef = doc(firestore, `ecoles/${schoolId}/admin_roles`, roleToDelete.id);
            await deleteDoc(roleRef);
            toast({
                title: "Rôle supprimé",
                description: `Le rôle "${roleToDelete.name}" a été supprimé.`,
            });
        } catch (error) {
            const permissionError = new FirestorePermissionError({ path: `ecoles/${schoolId}/admin_roles/${roleToDelete.id}`, operation: 'delete' });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsDeleteDialogOpen(false);
            setRoleToDelete(null);
        }
    };

    const isLoading = userLoading || rolesLoading || schoolLoading;

    if (isLoading || !isDirectorOrAdmin) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-40 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-lg font-semibold md:text-2xl">Gestion des Rôles</h1>
                        <p className="text-muted-foreground">Créez et gérez les rôles administratifs de votre école.</p>
                    </div>
                    <Button onClick={() => handleOpenForm(null)}>
                      <span className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" /> Ajouter un Rôle
                      </span>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Rôles existants</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom du Rôle</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {roles.length > 0 ? roles.map(role => (
                                    <TableRow key={role.id}>
                                        <TableCell className="font-medium">{role.name}</TableCell>
                                        <TableCell>{role.description}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenForm(role)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleOpenDeleteDialog(role)} disabled={role.isSystem}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">Aucun rôle trouvé.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editingRole ? 'Modifier' : 'Nouveau'} Rôle</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form id="role-form" onSubmit={form.handleSubmit(handleSaveRole)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 py-4">
                            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom du rôle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Permissions</CardTitle>
                                    <CardDescription className="text-xs">Attribuez les permissions pour ce rôle.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Accordion type="multiple" className="w-full">
                                        {permissionGroups.map(group => (
                                            <AccordionItem value={group} key={group}>
                                                <AccordionTrigger>{group}</AccordionTrigger>
                                                <AccordionContent>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 pl-2">
                                                        {allPermissions.filter(p => p.group === group).map(permission => (
                                                            <FormField
                                                                key={permission.id}
                                                                control={form.control}
                                                                name={`permissions.${permission.id}`}
                                                                render={({ field }) => (
                                                                    <FormItem className="flex items-center space-x-2">
                                                                        <FormControl>
                                                                            <Checkbox
                                                                                checked={field.value}
                                                                                onCheckedChange={field.onChange}
                                                                            />
                                                                        </FormControl>
                                                                        <FormLabel className="text-sm font-normal">{permission.label}</FormLabel>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        ))}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </form>
                    </Form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                        <Button type="submit" form="role-form" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
             <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous absolument sûr(e) ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Le rôle <strong>"{roleToDelete?.name}"</strong> sera supprimé.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteRole} className="bg-destructive hover:bg-destructive/90">
                            Oui, supprimer ce rôle
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

