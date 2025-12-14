
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
    manageContent: z.boolean().default(false),
    viewSupportTickets: z.boolean().default(false),
    manageSupportTickets: z.boolean().default(false),
    apiAccess: z.boolean().default(false),
    exportData: z.boolean().default(false),
});

const roleSchema = z.object({
  name: z.string().min(1, { message: "Le nom du rôle est requis." }),
  description: z.string().min(1, { message: "La description est requise." }),
  level: z.coerce.number().min(1, "Le niveau doit être d'au moins 1."),
  permissions: permissionsSchema,
});

type RoleFormValues = z.infer<typeof roleSchema>;

const allPermissions: {id: keyof z.infer<typeof permissionsSchema>, label: string, group: string}[] = [
    { id: 'manageUsers', label: 'Gérer les utilisateurs', group: 'Utilisateurs' },
    { id: 'viewUsers', label: 'Voir les utilisateurs', group: 'Utilisateurs' },
    { id: 'manageSchools', label: 'Gérer les écoles', group: 'Écoles' },
    { id: 'viewSchools', label: 'Voir les écoles', group: 'Écoles' },
    { id: 'manageClasses', label: 'Gérer les classes', group: 'Pédagogie' },
    { id: 'manageGrades', label: 'Gérer les notes', group: 'Pédagogie' },
    { id: 'manageBilling', label: 'Gérer la facturation', group: 'Finance' },
    { id: 'viewAnalytics', label: 'Voir les statistiques', group: 'Analyse' },
    { id: 'manageContent', label: 'Gérer le contenu', group: 'Contenu' },
    { id: 'manageSupportTickets', label: 'Gérer les tickets de support', group: 'Support' },
    { id: 'viewSupportTickets', label: 'Voir les tickets de support', group: 'Support' },
    { id: 'manageSystem', label: 'Gérer le système', group: 'Système' },
    { id: 'manageSettings', label: 'Gérer les paramètres', group: 'Système' },
    { id: 'apiAccess', label: 'Accès API', group: 'Avancé' },
    { id: 'exportData', label: 'Exporter les données', group: 'Avancé' },
];

const permissionGroups = ['Utilisateurs', 'Écoles', 'Pédagogie', 'Finance', 'Analyse', 'Contenu', 'Support', 'Système', 'Avancé'];

export default function AdminRolesPage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<AdminRole & { id: string } | null>(null);

    const rolesQuery = useMemoFirebase(() => query(collection(firestore, 'admin_roles')), [firestore]);
    const { data: rolesData, loading: rolesLoading } = useCollection(rolesQuery);
    
    const roles: (AdminRole & { id: string })[] = useMemo(() => rolesData?.map(doc => ({ id: doc.id, ...doc.data() } as AdminRole & { id: string })) || [], [rolesData]);

    const form = useForm<RoleFormValues>({
        resolver: zodResolver(roleSchema),
        defaultValues: {
            name: '',
            description: '',
            level: 3,
            permissions: {},
        }
    });

    // DEV ONLY: Grant admin rights to a specific email for development
    const isAdmin = user?.customClaims?.role === 'admin' || user?.email === "VOTRE_EMAIL_ADMIN@example.com";

    useEffect(() => {
        if (!userLoading && !isAdmin) {
            toast({
                variant: 'destructive',
                title: 'Accès non autorisé',
                description: "Vous n'avez pas les droits pour accéder à cette page."
            });
            router.push('/dashboard');
        }
    }, [user, userLoading, router, toast, isAdmin]);

    useEffect(() => {
        if (isFormOpen) {
            form.reset(editingRole ? {
                ...editingRole,
                level: editingRole.level || 3,
                permissions: editingRole.permissions || {},
            } : {
                name: '',
                description: '',
                level: 3,
                permissions: {},
            });
        }
    }, [isFormOpen, editingRole, form]);

    const handleOpenForm = (role: AdminRole & { id: string } | null) => {
        setEditingRole(role);
        setIsFormOpen(true);
    };

    const handleSaveRole = async (values: RoleFormValues) => {
        try {
            if (editingRole) {
                const roleRef = doc(firestore, 'admin_roles', editingRole.id);
                await setDoc(roleRef, values, { merge: true });
                toast({ title: 'Rôle modifié' });
            } else {
                const rolesCollectionRef = collection(firestore, `admin_roles`);
                await addDoc(rolesCollectionRef, values);
                toast({ title: 'Rôle créé' });
            }
            setIsFormOpen(false);
        } catch (e) {
            const path = editingRole ? `admin_roles/${editingRole.id}` : 'admin_roles';
            const operation = editingRole ? 'update' : 'create';
            const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: values });
            errorEmitter.emit('permission-error', permissionError);
        }
    };

    const isLoading = userLoading || rolesLoading;

    if (isLoading || !isAdmin) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
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
                        <p className="text-muted-foreground">Créez et gérez les rôles administratifs de la plateforme.</p>
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
                                    <TableHead>Niveau</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {roles.length > 0 ? roles.map(role => (
                                    <TableRow key={role.id}>
                                        <TableCell className="font-medium">{role.name}</TableCell>
                                        <TableCell>{role.description}</TableCell>
                                        <TableCell><Badge>{role.level}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenForm(role)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            {/* La suppression sera ajoutée plus tard */}
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom du rôle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="level" render={({ field }) => (<FormItem><FormLabel>Niveau</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            
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
        </>
    );
}
