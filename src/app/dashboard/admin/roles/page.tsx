
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Search, Users, Shield, ShieldCheck, UserCheck, MoreVertical, LayoutGrid, List } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, doc, deleteDoc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { admin_role as AdminRole } from '@/lib/data-types';
import { RoleForm } from '@/components/admin/role-form';
import { Badge } from '@/components/ui/badge';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useStaff } from '@/hooks/use-staff';
import { allPermissionsList, permissionCategories } from '@/lib/permissions';
import { StatCard } from '@/components/ui/stat-card';

export default function RolesPage() {
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const canManageSettings = !!user?.profile?.permissions?.manageSettings;

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<(AdminRole & { id: string }) | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<(AdminRole & { id: string }) | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch Roles
    const rolesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/admin_roles`)) : null, [firestore, schoolId]);
    const { data: rolesData, loading: rolesLoading } = useCollection(rolesQuery);
    const roles: (AdminRole & { id: string })[] = useMemo(() => rolesData?.map(d => ({ id: d.id, ...d.data() } as AdminRole & { id: string })) || [], [rolesData]);

    // Fetch Staff for statistics
    const { staff, loading: staffLoading } = useStaff(schoolId);

    const isLoading = schoolLoading || rolesLoading || staffLoading;

    // Filter roles
    const filteredRoles = useMemo(() => {
        return roles.filter(role => 
            role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [roles, searchTerm]);

    // Calculate user counts per role
    const usersByRole = useMemo(() => {
        const counts: Record<string, number> = {};
        staff.forEach(s => {
            if (s.role) {
                counts[s.role] = (counts[s.role] || 0) + 1;
            }
        });
        return counts;
    }, [staff]);

    const handleOpenForm = (role: (AdminRole & { id: string }) | null) => {
        setEditingRole(role);
        setIsFormOpen(true);
    };

    const handleFormSave = () => {
        setIsFormOpen(false);
        setEditingRole(null);
    };

    const handleOpenDeleteDialog = (role: AdminRole & { id: string }) => {
        setRoleToDelete(role);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteRole = async () => {
        if (!schoolId || !roleToDelete) return;
        const docRef = doc(firestore, `ecoles/${schoolId}/admin_roles`, roleToDelete.id);
        deleteDoc(docRef)
            .then(() => {
                toast({ title: 'Rôle supprimé', description: `Le rôle "${roleToDelete.name}" a été supprimé.` });
            }).catch(error => {
                console.error("Error deleting role: ", error);
                toast({
                    variant: "destructive",
                    title: "Erreur de suppression",
                    description: "Impossible de supprimer le rôle. Vérifiez vos permissions.",
                });
            }).finally(() => {
                setIsDeleteDialogOpen(false);
                setRoleToDelete(null);
            })
    };

    const formatPermissionName = (name: string) => {
        const perm = allPermissionsList.find(p => p.id === name);
        return perm ? perm.label : name;
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Gestion des Accès</h1>
                        <p className="text-muted-foreground">Pilotez les permissions et les rôles de votre équipe administrative.</p>
                    </div>
                    {canManageSettings && (
                        <Button onClick={() => handleOpenForm(null)} size="lg" className="shadow-lg hover:shadow-xl transition-all">
                            <PlusCircle className="mr-2 h-5 w-5" />
                            Nouveau rôle
                        </Button>
                    )}
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard 
                        title="Total Rôles" 
                        value={roles.length} 
                        icon={Shield} 
                        description="Rôles configurés"
                        loading={isLoading} 
                    />
                    <StatCard 
                        title="Rôles Système" 
                        value={roles.filter(r => r.isSystem).length} 
                        icon={ShieldCheck} 
                        description="Rôles non modifiables"
                        loading={isLoading} 
                    />
                    <StatCard 
                        title="Personnel Affecté" 
                        value={staff.filter(s => s.role).length} 
                        icon={UserCheck} 
                        description="Membres avec accès"
                        loading={isLoading} 
                    />
                    <StatCard 
                        title="Total Personnel" 
                        value={staff.length} 
                        icon={Users} 
                        description="Inscrits dans l'école"
                        loading={isLoading} 
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher un rôle (titre ou description)..."
                            className="pl-10 h-11"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <Card className="border-none shadow-none bg-transparent">
                    <CardHeader className="px-0 pt-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Rôles & Permissions</CardTitle>
                                <CardDescription>Détail des accès par profil administratif.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-0">
                        {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-20 w-full rounded-xl" />
                                <Skeleton className="h-20 w-full rounded-xl" />
                                <Skeleton className="h-20 w-full rounded-xl" />
                            </div>
                        ) : filteredRoles.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {filteredRoles.map(role => (
                                    <Card key={role.id} className="overflow-hidden border hover:border-primary/50 transition-colors group">
                                        <div className="p-0">
                                            <Accordion type="single" collapsible className="w-full">
                                                <AccordionItem value={role.id} className="border-none">
                                                    <div className="flex items-center justify-between px-6 py-4">
                                                        <div className="flex flex-col flex-1 cursor-pointer">
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-bold text-xl group-hover:text-primary transition-colors">{role.name}</span>
                                                                {role.isSystem && <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">Système</Badge>}
                                                                <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-transparent">
                                                                    {usersByRole[role.id] || 0} utilisateur{(usersByRole[role.id] || 0) > 1 ? 's' : ''}
                                                                </Badge>
                                                            </div>
                                                            <span className="text-sm text-muted-foreground mt-1">{role.description || "Aucune description fournie."}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <AccordionTrigger className="hover:no-underline py-0" />
                                                            {canManageSettings && !role.isSystem && (
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <MoreVertical className="h-5 w-5" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-40">
                                                                        <DropdownMenuItem onClick={() => handleOpenForm(role)} className="cursor-pointer">
                                                                            <Edit className="mr-2 h-4 w-4" />Modifier
                                                                        </DropdownMenuItem>
                                                                        <Separator className="my-1" />
                                                                        <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => handleOpenDeleteDialog(role)}>
                                                                            <Trash2 className="mr-2 h-4 w-4" />Supprimer
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <AccordionContent className="px-6 pb-6 pt-2 border-t bg-muted/20">
                                                        <div className="space-y-6">
                                                            {permissionCategories.map(cat => {
                                                                const catPerms = Object.entries(role.permissions || {})
                                                                    .filter(([key, value]) => {
                                                                        if (!value) return false;
                                                                        const perm = allPermissionsList.find(p => p.id === key);
                                                                        return perm?.category === cat.id;
                                                                    });
                                                                
                                                                if (catPerms.length === 0) return null;

                                                                return (
                                                                    <div key={cat.id} className="space-y-3">
                                                                        <h4 className="text-sm font-semibold text-primary/80 uppercase tracking-wider">{cat.label}</h4>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                                            {catPerms.map(([key]) => (
                                                                                <div key={key} className="flex items-center gap-2 p-2 bg-background border rounded-md shadow-sm">
                                                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                                                    <span className="text-xs font-medium">{formatPermissionName(key)}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                            
                                                            {Object.values(role.permissions || {}).every(v => !v) && (
                                                                <div className="text-center py-4 text-muted-foreground italic text-sm">
                                                                    Aucune permission configurée pour ce rôle.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-2xl border-2 border-dashed">
                                <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <h3 className="text-xl font-semibold text-muted-foreground text-center">
                                    {searchTerm ? "Aucun rôle ne correspond à votre recherche." : "Aucun rôle configuré."}
                                </h3>
                                <p className="text-muted-foreground mt-2 mb-6 text-center max-w-sm">
                                    {searchTerm ? "Essayez d'autres mots-clés ou effacez la recherche." : "Commencez par créer votre premier rôle pour gérer les accès."}
                                </p>
                                {canManageSettings && !searchTerm && (
                                    <Button onClick={() => handleOpenForm(null)}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Créer maintenant
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) handleFormSave(); }}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">{editingRole ? 'Modifier le rôle' : 'Nouveau Rôle'}</DialogTitle>
                        <DialogDescription>
                            {editingRole ? `Ajustez les accès pour "${editingRole.name}".` : "Définissez les responsabilités et les accès."}
                        </DialogDescription>
                    </DialogHeader>
                    <RoleForm
                        key={editingRole?.id || 'new-role'}
                        schoolId={schoolId!}
                        role={editingRole}
                        onSave={handleFormSave}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce rôle ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Le rôle <strong>&quot;{roleToDelete?.name}&quot;</strong> sera supprimé. 
                            <br /><br />
                            <strong>Note :</strong> Les {usersByRole[roleToDelete?.id || ''] || 0} utilisateur(s) ayant ce rôle perdront leurs accès administratifs immédiatement.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteRole} className="bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20">
                            Confirmer la suppression
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

