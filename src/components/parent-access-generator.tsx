'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { KeyRound, Copy, Loader2, RefreshCw } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addHours, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ParentAccessGeneratorProps {
    schoolId: string;
    studentId: string;
    studentName: string;
}

export function ParentAccessGenerator({ schoolId, studentId, studentName }: ParentAccessGeneratorProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [accessCode, setAccessCode] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);

    const handleGenerateCode = async () => {
        setIsLoading(true);
        setAccessCode(null);
        setExpiresAt(null);

        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expirationDate = addHours(new Date(), 24);

        try {
            await addDoc(collection(firestore, 'sessions_parents'), {
                schoolId,
                studentIds: [studentId],
                accessCode: newCode,
                isActive: true,
                createdAt: serverTimestamp(),
                expiresAt: expirationDate.toISOString(),
            });

            setAccessCode(newCode);
            setExpiresAt(expirationDate);
            toast({ title: "Code généré avec succès !" });

        } catch (error) {
            console.error("Erreur lors de la génération du code:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de générer le code.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopyCode = () => {
        if (accessCode) {
            navigator.clipboard.writeText(accessCode);
            toast({ title: "Code copié !" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" className="w-full">
                    <KeyRound className="mr-2 h-4 w-4" />
                    Gérer l'accès parent
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Accès Parent pour {studentName}</DialogTitle>
                    <DialogDescription>
                        Générez un code unique à partager avec un parent ou tuteur pour lui donner accès aux informations de cet élève. Ce code est valable 24 heures.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6 text-center">
                    {accessCode && expiresAt ? (
                        <div className="space-y-4">
                             <p className="text-sm text-muted-foreground">Partagez ce code avec le parent :</p>
                             <div className="flex items-center justify-center gap-2">
                                <code className="text-3xl font-bold tracking-widest p-3 bg-muted rounded-lg">{accessCode}</code>
                                <Button variant="outline" size="icon" onClick={handleCopyCode}><Copy className="h-4 w-4"/></Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Expire le {format(expiresAt, 'd MMMM yyyy à HH:mm', { locale: fr })}</p>
                             <Button variant="outline" size="sm" onClick={handleGenerateCode} disabled={isLoading}>
                                <RefreshCw className="mr-2 h-3 w-3" />
                                Générer un nouveau code
                            </Button>
                        </div>
                    ) : (
                        <Button onClick={handleGenerateCode} disabled={isLoading}>
                            {isLoading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Génération en cours...</>
                            ) : (
                                "Générer un code d'accès"
                            )}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
