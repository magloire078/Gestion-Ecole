
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { MoreHorizontal, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, deleteDoc, doc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import type { route as Route, bus as Bus } from '@/lib/data-types';
import { RouteForm } from '@/components/transport/route-form';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export default function RoutesManagementPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageContent = !!user?.profile?.permissions?.manageTransport;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<(Route & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<(Route & { id: string }) | null>(null);

  const routesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/transport_lignes`)) : null, [firestore, schoolId]);
  const { data: routesData, loading: routesLoading } = useCollection(routesQuery);
  const routes: (Route & { id: string })[] = useMemo(() => routesData?.map(d => ({ id: d.id, ...d.data() } as Route & { id: string })) || [], [routesData]);

  const busesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/transport_bus`)) : null, [firestore, schoolId]);
  const { data: busesData, loading: busesLoading } = useCollection(busesQuery);
  const buses: (Bus & { id: string })[] = useMemo(() => busesData?.map(d => ({ id: d.id, ...d.data() } as Bus & { id: string })) || [], [busesData]);

  const busMap = useMemo(() => new Map(buses.map(b => [b.id, b.registrationNumber])), [buses]);

  const handleOpenForm = (route: (Route & { id: string }) | null) => {
    setEditingRoute(route);
    setIsFormOpen(true);
  };
  
  const handleFormSave = () => {
    setIsFormOpen(false);
    setEditingRoute(null);
  };

  const handleOpenDeleteDialog = (route: Route & { id: string }) => {
    setRouteToDelete(route);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteRoute = async () => {
    if (!schoolId || !routeToDelete) return;
    try {
      await deleteDoc(doc(firestore, `ecoles/${schoolId}/transport_lignes`, routeToDelete.id));
      toast({ title: 'Ligne supprimée', description: 'La ligne de transport a été supprimée.' });
    } catch(e) {
      const permissionError = new FirestorePermissionError({
        path: `ecoles/${schoolId}/transport_lignes/${routeToDelete.id}`,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsDeleteDialogOpen(false);
    }
  }

  const getStatusBadgeVariant = (status?: string) => {
    switch(status) {
        case 'on_time': return 'secondary';
        case 'delayed': return 'destructive';
        case 'cancelled': return 'outline';
        default: return 'default';
    }
  };
  
  const isLoading = schoolLoading || routesLoading || busesLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gestion des Lignes de Transport</CardTitle>
              <CardDescription>Définissez les lignes de bus, les arrêts et les horaires.</CardDescription>
            </div>
            {canManageContent && (
              <Button onClick={() => handleOpenForm(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter une ligne
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nom de la ligne</TableHead><TableHead>Bus assigné</TableHead><TableHead>Statut actuel</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
              ) : routes.length > 0 ? (
                routes.map(route => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">{route.name}</TableCell>
                    <TableCell>{busMap.get(route.busId) || 'N/A'}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(route.status)}>{route.status || 'N/A'}</Badge></TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenForm(route)}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(route)}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="h-24 text-center">Aucune ligne de transport n'a été créée.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingRoute ? 'Modifier la ligne' : 'Ajouter une nouvelle ligne'}</DialogTitle>
             <DialogDescription>
                Configurez les détails de la ligne de transport.
              </DialogDescription>
          </DialogHeader>
          <RouteForm
            schoolId={schoolId!}
            buses={buses}
            route={editingRoute}
            onSave={handleFormSave}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Cette action est irréversible. La ligne <strong>"{routeToDelete?.name}"</strong> sera définitivement supprimée.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteRoute} className="bg-destructive hover:bg-destructive/90">
                    Supprimer
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
