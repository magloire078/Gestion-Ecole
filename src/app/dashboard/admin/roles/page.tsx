'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
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
} from "@/components/ui/accordion"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

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


  const rolesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/admin_roles`)) : null, [firestore, schoolId]);
  const { data: rolesData, loading: rolesLoading } = useCollection(rolesQuery);
  const roles: (AdminRole & { id: string })[] = useMemo(() => rolesData?.map(d => ({ id: d.id, ...d.data() } as AdminRole & { id: string })) || [], [rolesData]);

  const isLoading = schoolLoading || rolesLoading;

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
  }
  
  const formatPermissionName = (name: string) => {
    const result = name.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Gestion des Rôles et Permissions</h1>
            <p className="text-muted-foreground">Créez et configurez les rôles administratifs de votre école.</p>
          </div>
          {canManageSettings && (
            <Button onClick={() => handleOpenForm(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Ajouter un rôle
            </Button>
          )}
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Rôles existants</CardTitle>
                <CardDescription>Liste des rôles définis pour votre établissement.</CardDescription>
            </CardHeader>
            <CardContent>
               {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : (
                <Accordion type="multiple" className="w-full">
                    {roles.map(role => (
                        <AccordionItem value={role.id} key={role.id}>
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex justify-between items-center w-full">
                                    <div className="flex flex-col text-left">
                                        <span className="font-semibold text-lg">{role.name}</span>
                                        <span className="text-sm text-muted-foreground">{role.description}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {role.isSystem && <Badge variant="secondary">Système</Badge>}
                                        {canManageSettings && !role.isSystem && (
                                            <DropdownMenu onOpenChange={(open) => { if(open) event?.stopPropagation()}}>
                                                <DropdownMenuTrigger asChild>
                                                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                     </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenForm(role)}><Edit className="mr-2 h-4 w-4"/>Modifier</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(role)}><Trash2 className="mr-2 h-4 w-4"/>Supprimer</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <h4 className="font-semibold mb-3">Permissions accordées :</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                        {Object.entries(role.permissions || {}).map(([key, value]) => value ? (
                                            <Badge key={key} variant="outline" className="font-normal">{formatPermissionName(key)}</Badge>
                                        ) : null)}
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
                )}
            </CardContent>
        </Card>
      </div>

       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editingRole ? 'Modifier le rôle' : 'Nouveau Rôle'}</DialogTitle>
                    <DialogDescription>
                        {editingRole ? `Modification des permissions pour le rôle "${editingRole.name}".` : "Définissez un nouveau rôle et ses permissions."}
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
                    <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cette action est irréversible. Le rôle <strong>"{roleToDelete?.name}"</strong> sera supprimé. Les utilisateurs ayant ce rôle perdront les permissions associées.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteRole} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
