'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { admin_role as AdminRole } from '@/lib/data-types';
import { RoleForm } from '@/components/admin/role-form';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function RolesPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const canManageSettings = !!user?.profile?.permissions?.manageSettings;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<(AdminRole & { id: string }) | null>(null);

  const rolesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/admin_roles`)) : null, [firestore, schoolId]);
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
  
  // Convert camelCase to Title Case for display
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
                                    {role.isSystem && <Badge variant="secondary" className="mr-4">Système</Badge>}
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
                                    <div className="flex justify-end mt-4">
                                        <Button variant="outline" size="sm" onClick={() => handleOpenForm(role)} disabled={role.isSystem}>
                                            <Edit className="h-4 w-4 mr-2"/>
                                            Modifier
                                        </Button>
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
                    schoolId={schoolId!}
                    role={editingRole}
                    onSave={handleFormSave}
                />
            </DialogContent>
        </Dialog>
    </>
  );
}
