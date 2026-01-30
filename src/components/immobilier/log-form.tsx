'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { key_log as KeyLog, key_trousseau as KeyTrousseau, staff } from '@/lib/data-types';
import { Loader2 } from 'lucide-react';

interface LogFormProps {
  schoolId: string;
  trousseaux: (KeyTrousseau & { id: string })[];
  staffMembers: (staff & { id: string })[];
  onSave: () => void;
}

export function LogForm({ schoolId, trousseaux, staffMembers, onSave }: LogFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [logType, setLogType] = useState<'emprunt' | 'retour'>('emprunt');
  const [selectedTrousseauForLog, setSelectedTrousseauForLog] = useState<string>('');
  const [selectedStaffForLog, setSelectedStaffForLog] = useState<string>('');
  const [isSavingLog, setIsSavingLog] = useState(false);

  const handleLogSubmit = async () => {
    if (!schoolId || !selectedTrousseauForLog || !selectedStaffForLog) {
      toast({ variant: 'destructive', title: "Champs manquants" });
      return;
    }
    setIsSavingLog(true);
    const logData: Omit<KeyLog, 'id'> = {
      trousseauId: selectedTrousseauForLog,
      staffId: selectedStaffForLog,
      type: logType,
      timestamp: new Date().toISOString(),
      notes: '',
    };

    try {
      await addDoc(collection(firestore, `ecoles/${schoolId}/cles_log`), logData);
      const trousseauRef = doc(firestore, `ecoles/${schoolId}/cles_trousseaux`, selectedTrousseauForLog);
      await updateDoc(trousseauRef, {
        status: logType === 'emprunt' ? 'emprunté' : 'disponible',
        lastHolderId: logType === 'emprunt' ? selectedStaffForLog : null,
      });
      toast({ title: "Mouvement enregistré" });
      onSave();
    } catch (e) {
      console.error("Error saving log:", e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'enregistrer le mouvement.' });
    } finally {
      setIsSavingLog(false);
      // Reset form state
      setSelectedTrousseauForLog('');
      setSelectedStaffForLog('');
      setLogType('emprunt');
    }
  };

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Type de Mouvement</Label>
          <Select value={logType} onValueChange={(v: any) => setLogType(v)}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent><SelectItem value="emprunt">Emprunt</SelectItem><SelectItem value="retour">Retour</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Trousseau</Label>
          <Select value={selectedTrousseauForLog} onValueChange={setSelectedTrousseauForLog}>
            <SelectTrigger><SelectValue placeholder="Choisir un trousseau..."/></SelectTrigger>
            <SelectContent>
              {trousseaux
                .filter(t => logType === 'emprunt' ? t.status === 'disponible' : t.status === 'emprunté')
                .map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
              }
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Membre du personnel</Label>
          <Select value={selectedStaffForLog} onValueChange={setSelectedStaffForLog}>
            <SelectTrigger><SelectValue placeholder="Choisir un membre..."/></SelectTrigger>
            <SelectContent>
              {staffMembers.map(s => <SelectItem key={s.id} value={s.id}>{s.displayName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onSave}>Annuler</Button>
        <Button onClick={handleLogSubmit} disabled={isSavingLog}>
          {isSavingLog ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
          {isSavingLog ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </DialogFooter>
    </>
  );
}
