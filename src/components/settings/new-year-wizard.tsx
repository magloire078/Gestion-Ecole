'use client';

import { useState } from 'react';
import { useSchoolData } from '@/hooks/use-school-data';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import {
    cloneClassesForNewYear,
    finalizeAcademicYear,
} from '@/services/academic-year-service';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCompleted?: () => void;
}

function nextYearGuess(current?: string): string {
    if (!current) {
        const y = new Date().getFullYear();
        return `${y}-${y + 1}`;
    }
    const [start, end] = current.split('-').map(s => parseInt(s, 10));
    if (Number.isFinite(start) && Number.isFinite(end)) {
        return `${start + 1}-${end + 1}`;
    }
    return current;
}

export function NewYearWizard({ open, onOpenChange, onCompleted }: Props) {
    const { schoolId, schoolData } = useSchoolData();
    const { user } = useUser();
    const { toast } = useToast();

    const fromYear = schoolData?.currentAcademicYear ?? '';
    const [toYear, setToYear] = useState(nextYearGuess(fromYear));
    const [notes, setNotes] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [busy, setBusy] = useState(false);

    const confirmationPhrase = `OUI ${toYear}`;
    const canConfirm = !busy
        && schoolId
        && fromYear
        && /^\d{4}-\d{4}$/.test(toYear)
        && confirmation.trim().toUpperCase() === confirmationPhrase
        && toYear !== fromYear;

    const handleRun = async () => {
        if (!schoolId || !user?.uid || !canConfirm) return;
        setBusy(true);
        try {
            const cloneResult = await cloneClassesForNewYear(schoolId, fromYear, toYear, user.uid);
            await finalizeAcademicYear(schoolId, fromYear, toYear, {
                classesCloned: cloneResult.cloned,
                studentsPromoted: 0,
                notes,
            }, user.uid);
            toast({
                title: 'Année basculée',
                description: `${cloneResult.cloned} classe(s) clonée(s) et ${cloneResult.archived} archivée(s). Vous travaillez maintenant sur ${toYear}.`,
            });
            onCompleted?.();
            onOpenChange(false);
            setConfirmation('');
            setNotes('');
        } catch (err: any) {
            console.error('[NewYearWizard]', err);
            toast({
                variant: 'destructive',
                title: 'Échec',
                description: err?.message ?? 'Impossible de finaliser la nouvelle année.',
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Démarrer une nouvelle année scolaire
                    </DialogTitle>
                    <DialogDescription>
                        Clone les classes actives de <strong>{fromYear || '…'}</strong> vers la nouvelle
                        année, archive les anciennes et pose la nouvelle année comme année courante.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label>Année source</Label>
                        <Input value={fromYear} readOnly className="bg-muted/50" />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="toYear">Nouvelle année (format AAAA-AAAA)</Label>
                        <Input
                            id="toYear"
                            value={toYear}
                            onChange={e => setToYear(e.target.value.trim())}
                            placeholder="2026-2027"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="notes">Notes (optionnel)</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Contexte, décisions du conseil, particularités…"
                            rows={3}
                        />
                    </div>

                    <Alert variant="default" className="border-amber-300/70 bg-amber-50 text-amber-900">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Ce que cette action fait</AlertTitle>
                        <AlertDescription className="text-xs space-y-1">
                            <p>• Chaque classe active de {fromYear || 'l\'année courante'} est dupliquée pour {toYear || 'la nouvelle année'} (élèves non inclus).</p>
                            <p>• L&apos;ancienne classe passe en <strong>archivée</strong> — les notes, paiements et absences restent consultables via le sélecteur d&apos;année.</p>
                            <p>• <strong>currentAcademicYear</strong> de l&apos;école est mis à jour. Les périodes (trimestres) sont vidées : redéfinissez-les ensuite.</p>
                            <p>• La promotion individuelle des élèves se fait ensuite (écran dédié).</p>
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-1.5">
                        <Label htmlFor="confirm" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Tapez « {confirmationPhrase} » pour confirmer
                        </Label>
                        <Input
                            id="confirm"
                            value={confirmation}
                            onChange={e => setConfirmation(e.target.value)}
                            placeholder={confirmationPhrase}
                            disabled={busy}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                        Annuler
                    </Button>
                    <Button onClick={handleRun} disabled={!canConfirm}>
                        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Basculer vers {toYear || 'la nouvelle année'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
