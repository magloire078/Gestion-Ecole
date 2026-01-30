
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Wrench, Banknote } from 'lucide-react';

export const SystemSettings = () => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const settingsRef = useMemo(() => doc(firestore, 'system_settings/default'), [firestore]);
    const { data: settingsData, loading: settingsLoading } = useDoc(settingsRef);
    
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [paymentProviders, setPaymentProviders] = useState({
        stripe: true,
        orangeMoney: true,
        mtn: true,
        wave: true,
        paydunya: true,
    });
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if (settingsData) {
            setMaintenanceMode(settingsData.maintenanceMode || false);
            if (settingsData.paymentProviders) {
                setPaymentProviders(prev => ({...prev, ...settingsData.paymentProviders}));
            }
        }
    }, [settingsData]);

    const handleSave = async () => {
        setIsSaving(true);
        const dataToSave = { maintenanceMode, paymentProviders };
        try {
            await setDoc(settingsRef, dataToSave, { merge: true });
            toast({ title: "Paramètres sauvegardés", description: "Les paramètres système ont été mis à jour."});
        } catch (e) {
             console.error("Error saving system settings:", e);
             toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'enregistrer les paramètres.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleProviderToggle = (provider: keyof typeof paymentProviders) => {
        setPaymentProviders(prev => ({ ...prev, [provider]: !prev[provider] }));
    }

    if (settingsLoading) {
        return <Skeleton className="h-96 w-full" />
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wrench className="h-5 w-5" />
                        Maintenance & Configuration Globale
                    </CardTitle>
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
            </Card>

            <Card>
                <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <Banknote className="h-5 w-5" />
                        Moyens de Paiement
                    </CardTitle>
                    <CardDescription>Activez ou désactivez les fournisseurs de paiement pour les abonnements.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <Label htmlFor="stripe-switch" className="font-semibold">Stripe (Carte Bancaire)</Label>
                        <Switch id="stripe-switch" checked={paymentProviders.stripe} onCheckedChange={() => handleProviderToggle('stripe')} />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <Label htmlFor="orange-switch" className="font-semibold">Orange Money</Label>
                        <Switch id="orange-switch" checked={paymentProviders.orangeMoney} onCheckedChange={() => handleProviderToggle('orangeMoney')} />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <Label htmlFor="mtn-switch" className="font-semibold">MTN Mobile Money</Label>
                        <Switch id="mtn-switch" checked={paymentProviders.mtn} onCheckedChange={() => handleProviderToggle('mtn')} />
                    </div>
                     <div className="flex items-center justify-between p-4 border rounded-lg">
                        <Label htmlFor="wave-switch" className="font-semibold">Wave</Label>
                        <Switch id="wave-switch" checked={paymentProviders.wave} onCheckedChange={() => handleProviderToggle('wave')} />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <Label htmlFor="paydunya-switch" className="font-semibold">PayDunya</Label>
                        <Switch id="paydunya-switch" checked={paymentProviders.paydunya} onCheckedChange={() => handleProviderToggle('paydunya')} />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                 <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Enregistrer les modifications
                </Button>
            </div>
        </div>
    );
};
