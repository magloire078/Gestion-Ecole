
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, doc, deleteDoc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import type { occupant, student as Student, room as Room } from '@/lib/data-types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OccupantForm } from '@/components/internat/occupant-form';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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

interface OccupantWithDetails extends occupant {
    studentName?: string;
    roomNumber?: string;
    id: string;
}

export default function OccupantsPage() {
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const canManageContent = !!user?.profile?.permissions?.manageInternat;
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingOccupant, setEditingOccupant] = useState<(occupant & { id: string }) | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [occupantToDelete, setOccupantToDelete] = useState<(OccupantWithDetails & { id: string }) | null>(null);

    const occupantsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/internat_occupants`)) : null, [firestore, schoolId]);
    const { data: occupantsData, loading: occupantsLoading } = useCollection(occupantsQuery);

    const studentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [firestore, schoolId]);
    const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
    
    const students = useMemo(() => studentsData?.map(doc => ({ id: doc.id, ...doc.data() } as Student & { id: string })) || [], [studentsData]);

    const roomsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/internat_chambres`)) : null, [firestore, schoolId]);
    const { data: roomsData, loading: roomsLoading } = useCollection(roomsQuery);
    
    const rooms = useMemo(() => roomsData?.map(doc => ({ id: doc.id, ...doc.data() } as Room & { id: string })) || [], [roomsData]);

    const occupants: OccupantWithDetails[] = useMemo(() => {
        if (!occupantsData || !studentsData || !roomsData) return [];
        const studentsMap = new Map(studentsData.map(doc => [doc.id, doc.data() as Student]));
        const roomsMap = new Map(roomsData.map(doc => [doc.id, doc.data() as Room]));

        return occupantsData.map(doc => {
            const occ = { id: doc.id, ...doc.data() } as occupant & { id: string };
            const student = studentsMap.get(occ.studentId);
            const room = roomsMap.get(occ.roomId);
            return {
                ...occ,
                studentName: student ? `${student.firstName} ${student.lastName}` : 'Élève inconnu',
                roomNumber: room ? room.number : 'Chambre inconnue',
            };
        });
    }, [occupantsData, studentsData, roomsData]);
    
    const isLoading = schoolLoading || occupantsLoading || studentsLoading || roomsLoading;
    
    const handleOpenForm = (occupant: (occupant & { id: string }) | null) => {
        setEditingOccupant(occupant);
        setIsFormOpen(true);
    };

    const handleFormSave = () => {
        setIsFormOpen(false);
        setEditingOccupant(null);
    };
    
    const handleOpenDeleteDialog = (occupant: OccupantWithDetails) => {
        setOccupantToDelete(occupant);
        setIsDeleteDialogOpen(true);
    }
    
    const handleDeleteOccupant = async () => {
        if (!schoolId || !occupantToDelete) return;
        try {
            await deleteDoc(doc(firestore, `ecoles/${schoolId}/internat_occupants`, occupantToDelete.id));
            toast({ title: 'Occupation supprimée', description: "L'occupation a bien été supprimée." });
        } catch (e) {
             const permissionError = new FirestorePermissionError({
                path: `ecoles/${schoolId}/internat_occupants/${occupantToDelete.id}`,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsDeleteDialogOpen(false);
            setOccupantToDelete(null);
        }
    }

    const getStatusBadgeVariant = (status: string) => {
        switch(status) {
            case 'active': return 'secondary';
            case 'pending': return 'default';
            case 'terminated': return 'outline';
            case 'suspended': return 'destructive';
            default: return 'default';
        }
    };

  return (
    <>
    <div className="space-y-6">
       <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Gestion des Occupants</CardTitle>
                  <CardDescription>
                    Gérez les élèves hébergés dans l'internat.
                  </CardDescription>
                </div>
                {canManageContent && (
                    <Button onClick={() => handleOpenForm(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Assigner une chambre
                    </Button>
                )}
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Élève</TableHead><TableHead>Chambre</TableHead><TableHead>Période</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
              ) : occupants.length > 0 ? (
                occupants.map(occ => (
                  <TableRow key={occ.id}>
                    <TableCell className="font-medium">{occ.studentName}</TableCell>
                    <TableCell>{occ.roomNumber}</TableCell>
                    <TableCell>
                        {format(new Date(occ.startDate), 'dd/MM/yy', { locale: fr })}
                        {occ.endDate && ` - ${format(new Date(occ.endDate), 'dd/MM/yy', { locale: fr })}`}
                    </TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(occ.status)}>{occ.status}</Badge></TableCell>
                    <TableCell className="text-right">
                       {canManageContent && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenForm(occ)}><Edit className="mr-2 h-4 w-4"/>Modifier</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(occ)}><Trash2 className="mr-2 h-4 w-4"/>Supprimer</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                       )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">Aucun occupant trouvé.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingOccupant ? "Modifier l'occupation" : "Assigner une Chambre"}</DialogTitle>
                <DialogDescription>Renseignez les informations de l'occupation.</DialogDescription>
            </DialogHeader>
            <OccupantForm 
                schoolId={schoolId!}
                students={students}
                rooms={rooms}
                occupant={editingOccupant}
                onSave={handleFormSave}
            />
        </DialogContent>
    </Dialog>

    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Cette action est irréversible et supprimera l'occupation de <strong>{occupantToDelete?.studentName}</strong>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteOccupant} className="bg-destructive hover:bg-destructive/90">
                    Supprimer
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
