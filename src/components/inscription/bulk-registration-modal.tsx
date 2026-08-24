'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useFirestore, useUser } from '@/firebase';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash, Loader2, CheckCircle2, Table as TableIcon } from 'lucide-react';
import type { class_type as Class, fee as Fee, niveau as Niveau } from '@/lib/data-types';
import { getTuitionInfoForClass } from '@/lib/school-utils';
import { formatCurrency } from '@/lib/currency-utils';
import { Label } from '@/components/ui/label';

interface BulkRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  schoolData: any;
  classes: Class[];
  niveaux: Niveau[];
  fees: Fee[];
}

interface StudentRow {
  id: string;
  lastName: string;
  firstName: string;
  gender: 'Masculin' | 'Féminin';
  dateOfBirth: string;
  placeOfBirth: string;
  nationality: string;
  statusAff: 'Affecté' | 'Non-Affecté';
  isRepeater: 'Oui' | 'Non';
  classId: string;
  parentContact: string;
  
  // Comptabilité (Masquée en mode simplifié)
  inscriptionFee: string;
  scolariteFee: string;
  annexesFee: string;
  paymentAmount: string;
  paymentMethod: 'Espèce' | 'Mobile Money' | 'Chèque' | 'Virement';
}

export function BulkRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
  schoolId,
  schoolData,
  classes,
  niveaux,
  fees,
}: BulkRegistrationModalProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSimplifiedMode, setIsSimplifiedMode] = useState(true);

  // Ligne par défaut pour initialiser le tableau
  const createEmptyRow = (): StudentRow => ({
    id: Math.random().toString(36).substr(2, 9),
    lastName: '',
    firstName: '',
    gender: 'Masculin',
    dateOfBirth: '',
    placeOfBirth: '',
    nationality: 'Ivoirienne',
    statusAff: 'Non-Affecté',
    isRepeater: 'Non',
    classId: '',
    parentContact: '',
    inscriptionFee: '0',
    scolariteFee: '0',
    annexesFee: '0',
    paymentAmount: '0',
    paymentMethod: 'Espèce',
  });

  const [rows, setRows] = useState<StudentRow[]>(() => [createEmptyRow()]);

  const addRow = () => {
    setRows([...rows, createEmptyRow()]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);
  };

  const updateRowField = (index: number, field: keyof StudentRow, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };

    // Si on change la classe, on charge automatiquement les frais par défaut
    if (field === 'classId' && value) {
      const { fee } = getTuitionInfoForClass(value, classes, niveaux, fees);
      // Ventilation par défaut d'EcolePro : 20% Inscription, 60% Scolarité, 20% Frais Annexes
      newRows[index].inscriptionFee = Math.round(fee * 0.2).toString();
      newRows[index].scolariteFee = Math.round(fee * 0.6).toString();
      newRows[index].annexesFee = Math.round(fee * 0.2).toString();
    }

    setRows(newRows);
  };

  const handleSaveAll = async () => {
    if (!user) return;

    // Validation des champs requis
    const invalidRow = rows.find(r => !r.lastName || !r.firstName || !r.classId || !r.parentContact || !r.dateOfBirth);
    if (invalidRow) {
      toast({
        variant: "destructive",
        title: "Champs requis manquants",
        description: "Veuillez remplir le Nom, Prénom, Date de Naissance, Classe et Contact Parent pour chaque élève.",
      });
      return;
    }

    setIsSubmitting(true);
    const batch = writeBatch(firestore);
    const currentYear = schoolData?.currentAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    try {
      for (const row of rows) {
        const studentRef = doc(collection(firestore, `ecoles/${schoolId}/eleves`));
        const selectedClass = classes.find(c => c.id === row.classId);
        const selectedNiveau = niveaux.find(n => n.id === selectedClass?.niveauId);
        
        // Calcul du total de scolarité
        const totalFee = isSimplifiedMode 
          ? getTuitionInfoForClass(row.classId, classes, niveaux, fees).fee
          : parseFloat(row.inscriptionFee) + parseFloat(row.scolariteFee) + parseFloat(row.annexesFee);

        const studentData = {
          schoolId,
          matricule: `MAT-${Math.floor(100000 + Math.random() * 900000)}`,
          lastName: row.lastName,
          firstName: row.firstName,
          gender: row.gender,
          dateOfBirth: row.dateOfBirth,
          placeOfBirth: row.placeOfBirth || '',
          nationality: row.nationality,
          statusAff: row.statusAff,
          isRepeater: row.isRepeater === 'Oui',
          classId: row.classId,
          class: selectedClass?.name || 'N/A',
          grade: selectedNiveau?.name || 'N/A',
          cycle: selectedClass?.cycleId || 'Secondaire',
          parent1LastName: row.lastName, // Fallback parent name is student's lastName
          parent1FirstName: 'Parent',
          parent1Contact: row.parentContact,
          status: 'Actif',
          tuitionFee: totalFee,
          amountDue: totalFee,
          tuitionStatus: totalFee === 0 ? 'Soldé' : 'Partiel',
          inscriptionYear: parseInt(currentYear.split('-')[0]),
          academicYear: currentYear,
          createdAt: serverTimestamp(),
        };

        batch.set(studentRef, studentData);

        // Si paiement enregistré supérieur à 0
        const paymentVal = parseFloat(row.paymentAmount);
        if (!isSimplifiedMode && paymentVal > 0) {
          const paymentRef = doc(collection(firestore, `ecoles/${schoolId}/eleves/${studentRef.id}/paiements`));
          batch.set(paymentRef, {
            studentId: studentRef.id,
            amount: paymentVal,
            date: new Date().toISOString().split('T')[0],
            method: row.paymentMethod,
            reference: `REC-${Date.now().toString().slice(-6)}`,
            academicYear: currentYear,
            notes: 'Acompte initial d\'inscription en lot',
            createdAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();

      toast({
        title: "Grille enregistrée !",
        description: `${rows.length} élèves ont été inscrits avec succès.`,
      });

      onSuccess();
      onClose();
      setRows([createEmptyRow()]);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erreur lors de l'enregistrement",
        description: err?.message || "Impossible de sauvegarder la saisie en lot.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-full p-6 rounded-2xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="border-b pb-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TableIcon className="h-6 w-6 text-indigo-600 animate-bounce" /> Saisie des Élèves en Lot (Grille Interactive)
          </DialogTitle>
          <div className="flex items-center gap-3">
            <Label htmlFor="simplified-mode" className="text-xs font-black uppercase tracking-widest text-slate-400 cursor-pointer">
              Mode Simplifié (Masquer compta)
            </Label>
            <Switch
              id="simplified-mode"
              checked={isSimplifiedMode}
              onCheckedChange={setIsSimplifiedMode}
            />
          </div>
        </DialogHeader>

        <div className="overflow-x-auto border border-slate-100 rounded-xl mb-4 max-h-[50vh]">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[50px] text-center text-xs font-black uppercase tracking-widest text-slate-400">#</TableHead>
                <TableHead className="w-[150px] text-xs font-black uppercase tracking-widest text-slate-400">Nom *</TableHead>
                <TableHead className="w-[180px] text-xs font-black uppercase tracking-widest text-slate-400">Prénoms *</TableHead>
                <TableHead className="w-[110px] text-xs font-black uppercase tracking-widest text-slate-400">Sexe *</TableHead>
                <TableHead className="w-[140px] text-xs font-black uppercase tracking-widest text-slate-400">Né le *</TableHead>
                <TableHead className="w-[130px] text-xs font-black uppercase tracking-widest text-slate-400">Lieu Nais.</TableHead>
                <TableHead className="w-[120px] text-xs font-black uppercase tracking-widest text-slate-400">Nat.</TableHead>
                <TableHead className="w-[150px] text-xs font-black uppercase tracking-widest text-slate-400">Classe *</TableHead>
                <TableHead className="w-[120px] text-xs font-black uppercase tracking-widest text-slate-400">Statut CI</TableHead>
                <TableHead className="w-[100px] text-xs font-black uppercase tracking-widest text-slate-400">Redoub.</TableHead>
                <TableHead className="w-[140px] text-xs font-black uppercase tracking-widest text-slate-400">Tél Parent *</TableHead>
                
                {/* Colonnes Comptables */}
                {!isSimplifiedMode && (
                  <>
                    <TableHead className="w-[100px] text-xs font-black uppercase tracking-widest text-slate-400">Inscrip. (F)</TableHead>
                    <TableHead className="w-[100px] text-xs font-black uppercase tracking-widest text-slate-400">Scolarité (F)</TableHead>
                    <TableHead className="w-[100px] text-xs font-black uppercase tracking-widest text-slate-400">Annexes (F)</TableHead>
                    <TableHead className="w-[110px] text-xs font-black uppercase tracking-widest text-slate-400">Acompte (F)</TableHead>
                    <TableHead className="w-[120px] text-xs font-black uppercase tracking-widest text-slate-400">Règlement</TableHead>
                  </>
                )}
                <TableHead className="w-[60px] text-center"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="text-center font-mono text-xs text-slate-400">{index + 1}</TableCell>
                  
                  {/* Nom */}
                  <TableCell>
                    <Input
                      value={row.lastName}
                      onChange={(e) => updateRowField(index, 'lastName', e.target.value.toUpperCase())}
                      placeholder="Ex: KOFFI"
                      className="rounded-xl h-9 text-xs"
                    />
                  </TableCell>

                  {/* Prénom */}
                  <TableCell>
                    <Input
                      value={row.firstName}
                      onChange={(e) => updateRowField(index, 'firstName', e.target.value)}
                      placeholder="Ex: Jean-Marie"
                      className="rounded-xl h-9 text-xs"
                    />
                  </TableCell>

                  {/* Sexe */}
                  <TableCell>
                    <Select
                      value={row.gender}
                      onValueChange={(val) => updateRowField(index, 'gender', val)}
                    >
                      <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masculin">MASC.</SelectItem>
                        <SelectItem value="Féminin">FÉM.</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Date de Naissance */}
                  <TableCell>
                    <Input
                      type="date"
                      value={row.dateOfBirth}
                      onChange={(e) => updateRowField(index, 'dateOfBirth', e.target.value)}
                      className="rounded-xl h-9 text-xs"
                    />
                  </TableCell>

                  {/* Lieu de Naissance */}
                  <TableCell>
                    <Input
                      value={row.placeOfBirth}
                      onChange={(e) => updateRowField(index, 'placeOfBirth', e.target.value)}
                      placeholder="Ex: Bouaké"
                      className="rounded-xl h-9 text-xs"
                    />
                  </TableCell>

                  {/* Nationalité */}
                  <TableCell>
                    <Input
                      value={row.nationality}
                      onChange={(e) => updateRowField(index, 'nationality', e.target.value)}
                      placeholder="Ex: Ivoirienne"
                      className="rounded-xl h-9 text-xs"
                    />
                  </TableCell>

                  {/* Classe */}
                  <TableCell>
                    <Select
                      value={row.classId}
                      onValueChange={(val) => updateRowField(index, 'classId', val)}
                    >
                      <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        {classes.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Statut CI */}
                  <TableCell>
                    <Select
                      value={row.statusAff}
                      onValueChange={(val) => updateRowField(index, 'statusAff', val)}
                    >
                      <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Non-Affecté">Privé</SelectItem>
                        <SelectItem value="Affecté">Affecté</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Redoublant */}
                  <TableCell>
                    <Select
                      value={row.isRepeater}
                      onValueChange={(val) => updateRowField(index, 'isRepeater', val)}
                    >
                      <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Non">Non</SelectItem>
                        <SelectItem value="Oui">Oui</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Parent Contact */}
                  <TableCell>
                    <Input
                      value={row.parentContact}
                      onChange={(e) => updateRowField(index, 'parentContact', e.target.value)}
                      placeholder="Ex: 0700000000"
                      className="rounded-xl h-9 text-xs font-mono"
                    />
                  </TableCell>

                  {/* Comptabilité additionnelle */}
                  {!isSimplifiedMode && (
                    <>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.inscriptionFee}
                          onChange={(e) => updateRowField(index, 'inscriptionFee', e.target.value)}
                          className="rounded-xl h-9 text-xs font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.scolariteFee}
                          onChange={(e) => updateRowField(index, 'scolariteFee', e.target.value)}
                          className="rounded-xl h-9 text-xs font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.annexesFee}
                          onChange={(e) => updateRowField(index, 'annexesFee', e.target.value)}
                          className="rounded-xl h-9 text-xs font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.paymentAmount}
                          onChange={(e) => updateRowField(index, 'paymentAmount', e.target.value)}
                          className="rounded-xl h-9 text-xs font-mono text-emerald-600 font-bold"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.paymentMethod}
                          onValueChange={(val) => updateRowField(index, 'paymentMethod', val)}
                        >
                          <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Espèce">Espèce</SelectItem>
                            <SelectItem value="Mobile Money">M. Money</SelectItem>
                            <SelectItem value="Chèque">Chèque</SelectItem>
                            <SelectItem value="Virement">Virement</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </>
                  )}

                  {/* Suppression */}
                  <TableCell className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(index)}
                      disabled={rows.length === 1}
                      className="text-rose-600 hover:bg-rose-50 rounded-xl h-8 w-8"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={addRow}
            className="rounded-xl border-dashed border-indigo-400 text-indigo-600 hover:bg-indigo-50/50 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" /> Ajouter une ligne
          </Button>

          <div className="flex gap-3 w-full sm:w-auto justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-xl">
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleSaveAll}
              disabled={isSubmitting}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...
                </>
              ) : (
                <>
                  Enregistrer la Grille <CheckCircle2 className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
