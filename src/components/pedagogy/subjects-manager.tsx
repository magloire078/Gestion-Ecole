'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, doc, deleteDoc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import type { subject as Subject } from '@/lib/data-types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SubjectForm } from './subject-form'; // Import the new form component

export function SubjectsManager() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isDirectorOrAdmin = !!user?.profile?.permissions?.manageClasses || user?.profile?.role === 'directeur';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<(Subject & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<(Subject & { id: string }) | null>(null);

  const subjectsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/matieres`)) : null, [schoolId, firestore]);
  const { data: subjectsData, loading: subjectsLoading } = useCollection(subjectsQuery);
  const subjects: (Subject & { id: string })[] = useMemo(() => subjectsData?.map(d => ({ id: d.id, ...d.data() } as Subject & { id: string })) || [], [subjectsData]);
  
  const handleOpenForm = (subject: (Subject & { id: string }) | null) => {
    setEditingSubject(subject);
    setIsFormOpen(true);
  };

  const handleSave = () => {
      setIsFormOpen(false);
      setEditingSubject(null);
  };

  const handleDelete = async () => {
    if (!schoolId || !itemToDelete) return;
    await deleteDoc(doc(firestore, `ecoles/${schoolId}/matieres`, itemToDelete.id));
    toast({ title: 'Matière supprimée' });
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const isLoading = schoolLoading || subjectsLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Matières Enseignées</CardTitle>
                <CardDescription>Gérez les matières proposées dans l'établissement.</CardDescription>
            </div>
            {isDirectorOrAdmin && <Button size="sm" onClick={() => handleOpenForm(null)}><PlusCircle className="mr-2 h-4 w-4"/>Nouvelle Matière</Button>}
          </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
            ) : subjects.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {subjects.map(subject => (
                      <Card key={subject.id} className="group">
                          <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: subject.color }} />
                                  <div>
                                      <p className="font-semibold">{subject.name}</p>
                                      <p className="text-xs text-muted-foreground font-mono">{subject.code}</p>
                                  </div>
                              </div>
                              {isDirectorOrAdmin && (
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                                  <MoreHorizontal className="h-4 w-4" />
                                              </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                              <DropdownMenuItem onClick={() => handleOpenForm(subject)}>
                                                  <Edit className="mr-2 h-4 w-4" /> Modifier
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => { setItemToDelete(subject); setIsDeleteDialogOpen(true); }} className="text-destructive">
                                                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                              </DropdownMenuItem>
                                          </DropdownMenuContent>
                                      </DropdownMenu>
                                  </div>
                              )}
                          </CardContent>
                      </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center h-24 flex items-center justify-center text-muted-foreground">Aucune matière créée.</div>
              )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSubject ? 'Modifier' : 'Nouvelle'} Matière</DialogTitle></DialogHeader>
          <SubjectForm 
            schoolId={schoolId!}
            subject={editingSubject}
            onSave={handleSave}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle><AlertDialogDescription>L'élément <strong>"{itemToDelete?.name}"</strong> sera supprimé. Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
