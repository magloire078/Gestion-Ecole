'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AcademicPeriodForm } from '@/components/settings/academic-period-form';

type AcademicPeriod = {
    name: string;
    startDate: string;
    endDate: string;
};

export default function AcademicYearPage() {
  const { schoolData, loading: schoolLoading, updateSchoolData } = useSchoolData();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageSettings = !!user?.profile?.permissions?.manageSettings;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<AcademicPeriod | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<AcademicPeriod | null>(null);
  
  const academicPeriods = schoolData?.academicPeriods || [];

  const handleOpenForm = (period: AcademicPeriod | null) => {
    setEditingPeriod(period);
    setIsFormOpen(true);
  };
  
  const handleSavePeriods = async (updatedPeriods: AcademicPeriod[]) => {
      try {
        await updateSchoolData({ academicPeriods: updatedPeriods });
        toast({ title: 'Périodes mises à jour', description: 'La liste des périodes académiques a été enregistrée.' });
        setIsFormOpen(false);
        setEditingPeriod(null);
      } catch (error) {
          toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de sauvegarder les périodes.'});
      }
  };

  const handleOpenDeleteDialog = (period: AcademicPeriod) => {
      setPeriodToDelete(period);
      setIsDeleteDialogOpen(true);
  };

  const handleDeletePeriod = async () => {
      if (!periodToDelete) return;
      const updatedPeriods = academicPeriods.filter((p: AcademicPeriod) => p.name !== periodToDelete.name);
      await handleSavePeriods(updatedPeriods);
      setIsDeleteDialogOpen(false);
      setPeriodToDelete(null);
  };

  const isLoading = schoolLoading;

  return (
    <>
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Périodes Académiques</CardTitle>
                        <CardDescription>
                            Définissez les trimestres ou semestres pour l'année scolaire en cours.
                            Année: {schoolData?.currentAcademicYear || 'N/A'}
                        </CardDescription>
                    </div>
                    {canManageSettings && (
                        <Button onClick={() => handleOpenForm(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Ajouter une période
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
               {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : academicPeriods.length > 0 ? (
                    <div className="space-y-2">
                        {academicPeriods.map((period: AcademicPeriod) => (
                            <div key={period.name} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <p className="font-semibold">{period.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Du {format(new Date(period.startDate), 'dd MMM', { locale: fr })} au {format(new Date(period.endDate), 'dd MMM yyyy', { locale: fr })}
                                    </p>
                                </div>
                                {canManageSettings && (
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleOpenForm(period)}><Edit className="mr-2 h-4 w-4" /> Modifier</Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(period)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        Aucune période académique définie.
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingPeriod ? 'Modifier la' : 'Nouvelle'} Période</DialogTitle>
                </DialogHeader>
                <AcademicPeriodForm 
                    existingPeriods={academicPeriods}
                    editingPeriod={editingPeriod}
                    onSave={(newPeriods) => handleSavePeriods(newPeriods)}
                    onCancel={() => setIsFormOpen(false)}
                />
            </DialogContent>
        </Dialog>
        
         <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        La période <strong>"{periodToDelete?.name}"</strong> sera supprimée.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeletePeriod} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

