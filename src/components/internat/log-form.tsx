'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import type { occupant as Occupant, log as Log } from '@/lib/data-types';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LogFormProps {
    schoolId: string;
    occupants: (Occupant & { studentName?: string, id: string })[];
    onSave: () => void;
}

export function LogForm({ schoolId, occupants, onSave }: LogFormProps) {
    const { user } = useUser();
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isSavingLog, setIsSavingLog] = useState(false);
    
    const [logStudentId, setLogStudentId] = useState('');
    const [logType, setLogType] = useState<'entree' | 'sortie'>('sortie');
    const [logReason, setLogReason] = useState('');

    const handleSaveLog = async () => {
        if (!logStudentId || !logReason || !user?.authUser) {
          toast({ variant: 'destructive', title: 'Champs requis', description: "Veuillez sélectionner un élève et indiquer un motif." });
          return;
        }
        setIsSavingLog(true);
    
        const logData: Omit<Log, 'id'> = {
          studentId: logStudentId,
          type: logType,
          reason: logReason,
          timestamp: new Date().toISOString(),
          status: 'pending',
          authorizedBy: user.authUser.displayName || user.authUser.email,
        };
        
        try {
            await addDoc(collection(firestore, `ecoles/${schoolId}/internat_entrees_sorties`), logData);
            toast({ title: 'Mouvement enregistré', description: `La ${logType} de l'élève a bien été enregistrée.` });
            setLogStudentId('');
            setLogReason('');
            onSave();
        } catch(e) {
            const permissionError = new FirestorePermissionError({
                path: `ecoles/${schoolId}/internat_entrees_sorties`,
                operation: 'create',
                requestResourceData: logData,
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSavingLog(false);
        }
    };

    return (
        <div className="mt-6 p-4 border rounded-lg bg-muted/50">
          <h3 className="font-semibold mb-3">Enregistrer un mouvement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label>Élève</Label>
                 <Select value={logStudentId} onValueChange={setLogStudentId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un élève" />
                    </SelectTrigger>
                    <SelectContent>
                        {occupants.map(o => <SelectItem key={o.id} value={o.studentId}>{o.studentName}</SelectItem>)}
                    </SelectContent>
                 </Select>
            </div>
            <div>
                <Label>Type</Label>
                <Select value={logType} onValueChange={(v: 'entree' | 'sortie') => setLogType(v)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="sortie">Sortie</SelectItem>
                        <SelectItem value="entree">Entrée</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="md:col-span-2">
                <Label>Motif</Label>
                <Input placeholder="Rendez-vous, course..." value={logReason} onChange={(e) => setLogReason(e.target.value)} />
            </div>
          </div>
          <Button className="mt-4" onClick={handleSaveLog} disabled={isSavingLog}>
            {isSavingLog && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            {isSavingLog ? 'Enregistrement...' : 'Enregistrer le mouvement'}
          </Button>
        </div>
    );
}
