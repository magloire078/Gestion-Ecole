
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Loader2, Wrench } from 'lucide-react';

export const SystemSettings = () => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const settingsRef = useMemoFirebase(() => doc(firestore, 'system_settings/default'), [firestore]);
    const { data: settingsData, loading: settingsLoading } = useDoc(settingsRef);
    
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if (settingsData) {
            setMaintenanceMode(settingsData.maintenanceMode || false);
        }
    }, [settingsData]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setDoc(settingsRef, { maintenanceMode }, { merge: true });
            toast({ title: "Paramètres sauvegardés", description: "Le mode maintenance a été mis à jour."});
        } catch (e) {
             const permissionError = new FirestorePermissionError({
                path: settingsRef.path,
                operation: 'write',
                requestResourceData: { maintenanceMode },
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSaving(false);
        }
    };
    
    if (settingsLoading) {
        return <Skeleton className="h-48 w-full" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Maintenance & Configuration Globale
                </CardTitle>
                <CardDescription>Gérez l'état de la plateforme.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <Label htmlFor="maintenance-mode" className="font-semibold">Mode Maintenance</Label>
                        <p className="text-sm text-muted-foreground">
                            Lorsque activé, seuls les super-admins peuvent se connecter.
                        </p>
                    </div>
                    <Switch
                        id="maintenance-mode"
                        checked={maintenanceMode}
                        onCheckedChange={setMaintenanceMode}
                    />
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Enregistrer les modifications
                </Button>
            </CardFooter>
        </Card>
    );
};
