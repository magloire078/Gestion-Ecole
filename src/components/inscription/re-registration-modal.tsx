'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, UserCheck, AlertCircle } from 'lucide-react';
import type { class_type as Class, student as Student } from '@/lib/data-types';

interface ReRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  schoolData: any;
  classes: Class[];
}

export function ReRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
  schoolId,
  schoolData,
  classes,
}: ReRegistrationModalProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [selectedPrevClassId, setSelectedPrevClassId] = useState<string>('');
  const [selectedTargetClassId, setSelectedTargetClassId] = useState<string>('');
  const [prevStudents, setPrevStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentAcademicYear = schoolData?.currentAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  
  // Calculer l'année N-1 (ex: 2026-2027 -> 2025-2026)
  const prevAcademicYear = useMemo(() => {
    const parts = currentAcademicYear.split('-');
    if (parts.length === 2) {
      const start = parseInt(parts[0]) - 1;
      const end = parseInt(parts[1]) - 1;
      return `${start}-${end}`;
    }
    return `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;
  }, [currentAcademicYear]);

  // Charger les élèves de la classe sélectionnée (année précédente)
  useEffect(() => {
    if (!isOpen || !selectedPrevClassId || !schoolId) {
      setPrevStudents([]);
      return;
    }

    const loadPrevStudents = async () => {
      setLoadingStudents(true);
      try {
        const elevesRef = collection(firestore, `ecoles/${schoolId}/eleves`);
        // Recherche des élèves de cette classe qui ne sont pas encore inscrits à l'année courante
        const q = query(
          elevesRef,
          where('classId', '==', selectedPrevClassId),
          where('academicYear', '==', prevAcademicYear)
        );

        const snap = await getDocs(q);
        const list: Student[] = [];
        snap.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() } as Student);
        });
        setPrevStudents(list);

        // Sélectionner par défaut tous les élèves trouvés
        const initialSelected: Record<string, boolean> = {};
        list.forEach(s => {
          if (s.id) initialSelected[s.id] = true;
        });
        setSelectedStudentIds(initialSelected);
      } catch (err) {
        console.error(err);
        toast({
          variant: "destructive",
          title: "Erreur de chargement",
          description: "Impossible de charger les anciens élèves.",
        });
      } finally {
        setLoadingStudents(false);
      }
    };

    loadPrevStudents();
  }, [selectedPrevClassId, isOpen, prevAcademicYear, schoolId, firestore, toast]);

  const toggleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {};
    if (checked) {
      prevStudents.forEach(s => {
        if (s.id) updated[s.id] = true;
      });
    }
    setSelectedStudentIds(updated);
  };

  const toggleSelectStudent = (id: string, checked: boolean) => {
    setSelectedStudentIds(prev => ({
      ...prev,
      [id]: checked
    }));
  };

  const handleReRegister = async () => {
    const studentsToRegister = prevStudents.filter(s => s.id && selectedStudentIds[s.id]);
    if (studentsToRegister.length === 0) {
      toast({
        variant: "destructive",
        title: "Aucun élève sélectionné",
        description: "Veuillez sélectionner au moins un élève à réinscrire.",
      });
      return;
    }
    if (!selectedTargetClassId) {
      toast({
        variant: "destructive",
        title: "Classe cible manquante",
        description: "Veuillez sélectionner la classe d'accueil pour la nouvelle année.",
      });
      return;
    }

    setIsSubmitting(true);
    const batch = writeBatch(firestore);

    try {
      const targetClassInfo = classes.find(c => c.id === selectedTargetClassId);

      for (const student of studentsToRegister) {
        if (!student.id) continue;
        const studentRef = doc(firestore, `ecoles/${schoolId}/eleves/${student.id}`);
        
        // Mettre à jour l'élève avec la nouvelle classe et la nouvelle année académique
        batch.update(studentRef, {
          classId: selectedTargetClassId,
          class: targetClassInfo?.name || 'N/A',
          academicYear: currentAcademicYear,
          inscriptionYear: parseInt(currentAcademicYear.split('-')[0]),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      toast({
        title: "Réinscriptions terminées !",
        description: `${studentsToRegister.length} élèves ont été transférés avec succès.`,
      });

      onSuccess();
      onClose();
      setSelectedPrevClassId('');
      setSelectedTargetClassId('');
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erreur de réinscription",
        description: err?.message || "Impossible de traiter la réinscription.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full p-6 rounded-2xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="border-b pb-4 mb-4">
          <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin" /> Réinscription Historique des Élèves
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
              Classe d&apos;origine ({prevAcademicYear})
            </label>
            <Select value={selectedPrevClassId} onValueChange={setSelectedPrevClassId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sélectionner la classe précédente" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
              Nouvelle classe d&apos;affectation ({currentAcademicYear})
            </label>
            <Select value={selectedTargetClassId} onValueChange={setSelectedTargetClassId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sélectionner la classe d'accueil" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedPrevClassId && (
          <div className="border border-slate-100 rounded-xl overflow-hidden mb-6">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[50px] text-center">
                    <Checkbox
                      checked={prevStudents.length > 0 && prevStudents.every(s => s.id && selectedStudentIds[s.id])}
                      onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                    />
                  </TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Matricule</TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Nom & Prénoms</TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Sexe</TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Nationalité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingStudents ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Chargement des anciens dossiers...
                    </TableCell>
                  </TableRow>
                ) : prevStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                      <AlertCircle className="h-6 w-6 mx-auto mb-2 text-indigo-500" /> Aucun élève à réinscrire dans cette classe pour {prevAcademicYear}.
                    </TableCell>
                  </TableRow>
                ) : (
                  prevStudents.map(student => (
                    <TableRow key={student.id}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={!!student.id && !!selectedStudentIds[student.id]}
                          onCheckedChange={(checked) => student.id && toggleSelectStudent(student.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{student.matricule}</TableCell>
                      <TableCell className="font-bold">{student.lastName} {student.firstName}</TableCell>
                      <TableCell>{student.gender}</TableCell>
                      <TableCell>{student.nationality || 'Ivoirienne'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-xl">
            Fermer
          </Button>
          <Button
            type="button"
            onClick={handleReRegister}
            disabled={isSubmitting || prevStudents.length === 0}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 transition-all hover:scale-105 active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Transfert en cours...
              </>
            ) : (
              <>
                Réinscrire la sélection <UserCheck className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
