
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Copy, Check, Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

interface ParentAccessGeneratorProps {
    schoolId: string;
    studentId: string;
    studentName: string;
}

function generateAccessCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function ParentAccessGenerator({ schoolId, studentId, studentName }: ParentAccessGeneratorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [accessCode, setAccessCode] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleGenerateCode = async () => {
        setIsLoading(true);
        setAccessCode(null);
        
        const code = generateAccessCode();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

        const sessionData = {
            schoolId,
            studentIds: [studentId], // Pour l'instant, un seul élève par session
            accessCode: code,
            isActive: true,
            createdAt: serverTimestamp(),
            expiresAt: expiresAt,
        };

        try {
            const sessionCollectionRef = collection(firestore, 'sessions_parents');
            await addDoc(sessionCollectionRef, sessionData);
            setAccessCode(code);
        } catch (error) {
            const permissionError = new FirestorePermissionError({
                path: 'sessions_parents',
                operation: 'create',
                requestResourceData: sessionData,
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopy = () => {
        if (!accessCode) return;
        navigator.clipboard.writeText(accessCode);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <>
            <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)} className="w-full">
                <KeyRound className="mr-2 h-4 w-4" />
                Générer Accès Parent
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Générer un Code d'Accès Parent</DialogTitle>
                        <DialogDescription>
                            Créez un code unique et temporaire pour que les parents de <strong>{studentName}</strong> puissent accéder à son profil.
                        </DialogDescription>
                    </DialogHeader>
                    {accessCode ? (
                        <div className="space-y-4 pt-4">
                            <Label htmlFor="access-code">Code d'Accès (valide 24h)</Label>
                            <div className="flex items-center gap-2">
                                <Input id="access-code" value={accessCode} readOnly className="font-mono text-lg tracking-widest text-center" />
                                <Button size="icon" onClick={handleCopy}>
                                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Communiquez ce code au parent. Il pourra l'utiliser sur la page du portail parents.</p>
                        </div>
                    ) : (
                         <div className="flex justify-center py-8">
                            <Button onClick={handleGenerateCode} disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isLoading ? "Génération en cours..." : "Générer le code"}
                            </Button>
                         </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Fermer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

    