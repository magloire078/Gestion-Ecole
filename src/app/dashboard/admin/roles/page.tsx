
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
import { admin_role as AdminRole } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export default function AdminRolesPage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<AdminRole & { id: string } | null>(null);
    const [roleName, setRoleName] = useState('');
    const [roleDescription, setRoleDescription] = useState('');
    const [roleLevel, setRoleLevel] = useState(3);

    const rolesQuery = useMemoFirebase(() => query(collection(firestore, 'admin_roles')), [firestore]);
    const { data: rolesData, loading: rolesLoading } = useCollection(rolesQuery);
    
    const roles: (AdminRole & { id: string })[] = useMemo(() => rolesData?.map(doc => ({ id: doc.id, ...doc.data() } as AdminRole & { id: string })) || [], [rolesData]);

    useEffect(() => {
        if (!userLoading && (!user || user.customClaims?.role !== 'admin')) {
            toast({
                variant: 'destructive',
                title: 'Accès non autorisé',
                description: "Vous n'avez pas les droits pour accéder à cette page."
            });
            router.push('/dashboard');
        }
    }, [user, userLoading, router, toast]);

    const handleOpenForm = (role: AdminRole & { id: string } | null) => {
        setEditingRole(role);
        setRoleName(role?.name || '');
        setRoleDescription(role?.description || '');
        setRoleLevel(role?.level || 3);
        setIsFormOpen(true);
    };

    const handleSaveRole = async () => {
        if (!roleName) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Le nom du rôle est requis.' });
            return;
        }

        const roleData: Omit<AdminRole, 'id'> = {
            name: roleName,
            description: roleDescription,
            level: roleLevel,
            permissions: editingRole?.permissions || {} // Pour l'instant, on ne modifie pas les permissions ici
        };

        if (editingRole) {
            const roleRef = doc(firestore, 'admin_roles', editingRole.id);
            await setDoc(roleRef, roleData, { merge: true }).catch(e => {
                 const permissionError = new FirestorePermissionError({ path: roleRef.path, operation: 'update', requestResourceData: roleData });
                 errorEmitter.emit('permission-error', permissionError);
            });
            toast({ title: 'Rôle modifié' });
        } else {
            const rolesCollectionRef = collection(firestore, `admin_roles`);
            await addDoc(rolesCollectionRef, roleData).catch(e => {
                const permissionError = new FirestorePermissionError({ path: rolesCollectionRef.path, operation: 'create', requestResourceData: roleData });
                 errorEmitter.emit('permission-error', permissionError);
            });
            toast({ title: 'Rôle créé' });
        }
        setIsFormOpen(false);
    };

    const isLoading = userLoading || rolesLoading;

    if (isLoading || !user || user.customClaims?.role !== 'admin') {
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
                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Rôle
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingRole ? 'Modifier' : 'Nouveau'} Rôle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input placeholder="Nom du rôle" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
                        <Input placeholder="Description" value={roleDescription} onChange={(e) => setRoleDescription(e.target.value)} />
                        <Input type="number" placeholder="Niveau" value={roleLevel} onChange={(e) => setRoleLevel(Number(e.target.value))} />
                         <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Permissions</CardTitle>
                                <CardDescription className="text-xs">La modification des permissions sera bientôt disponible.</CardDescription>
                            </CardHeader>
                         </Card>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                        <Button onClick={handleSaveRole}>Enregistrer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
