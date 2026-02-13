
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Wrench, Banknote, Key, Shield, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export const SystemSettings = () => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const settingsRef = useMemo(() => doc(firestore, 'system_settings/default'), [firestore]);
    const { data: settingsData, loading: settingsLoading } = useDoc(settingsRef);

    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [registrationEnabled, setRegistrationEnabled] = useState(true);
    const [paymentProviders, setPaymentProviders] = useState({
        genius: true,
        stripe: false,
        orangeMoney: false,
        mtn: false,
        wave: true,
        paydunya: false,
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (settingsData) {
            setMaintenanceMode(settingsData.maintenanceMode || false);
            setRegistrationEnabled(settingsData.registrationEnabled === false ? false : true);
            if (settingsData.paymentProviders) {
                setPaymentProviders(prev => ({ ...prev, ...settingsData.paymentProviders }));
            }
        }
    }, [settingsData]);

    const handleSave = async () => {
        setIsSaving(true);
        const dataToSave = { maintenanceMode, registrationEnabled, paymentProviders };
        try {
            await setDoc(settingsRef, dataToSave, { merge: true });
            toast({ title: "Paramètres sauvegardés", description: "Les paramètres système ont été mis à jour." });
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

    // Vérifier si les clés API sont configurées
    const isGeniusConfigured = !!(process.env.NEXT_PUBLIC_GENIUS_PAY_CLIENT_ID || process.env.GENIUS_PAY_CLIENT_ID);
    const isStripeConfigured = !!(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || process.env.STRIPE_SECRET_KEY);

    const getProviderStatus = (provider: string) => {
        switch (provider) {
            case 'genius':
                return isGeniusConfigured ? 'configured' : 'not-configured';
            case 'stripe':
                return isStripeConfigured ? 'configured' : 'not-configured';
            case 'wave':
            case 'orangeMoney':
            case 'mtn':
            case 'paydunya':
                return 'partial'; // Providers qui nécessitent configuration
            default:
                return 'not-configured';
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'configured':
                return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Configuré</Badge>;
            case 'partial':
                return <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertCircle className="h-3 w-3 mr-1" />À configurer</Badge>;
            default:
                return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Non configuré</Badge>;
        }
    };

    if (settingsLoading) {
        return <Skeleton className="h-96 w-full" />
    }

    return (
        <div className="space-y-6">
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="general">
                        <Wrench className="h-4 w-4 mr-2" />
                        Général
                    </TabsTrigger>
                    <TabsTrigger value="payments">
                        <Banknote className="h-4 w-4 mr-2" />
                        Paiements
                    </TabsTrigger>
                    <TabsTrigger value="api-keys">
                        <Key className="h-4 w-4 mr-2" />
                        Clés API
                    </TabsTrigger>
                    <TabsTrigger value="security">
                        <Shield className="h-4 w-4 mr-2" />
                        Sécurité
                    </TabsTrigger>
                </TabsList>

                {/* Onglet Général */}
                <TabsContent value="general" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuration Globale</CardTitle>
                            <CardDescription>Paramètres généraux de la plateforme</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
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
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label htmlFor="registration-enabled" className="font-semibold">Inscriptions Ouvertes</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Autorise ou bloque la création de nouveaux comptes et de nouvelles écoles.
                                    </p>
                                </div>
                                <Switch
                                    id="registration-enabled"
                                    checked={registrationEnabled}
                                    onCheckedChange={setRegistrationEnabled}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Onglet Paiements */}
                <TabsContent value="payments" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Moyens de Paiement</CardTitle>
                            <CardDescription>Activez ou désactivez les fournisseurs de paiement pour les abonnements.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Genius Pay */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Label htmlFor="genius-switch" className="font-semibold">Genius Pay</Label>
                                        <StatusBadge status={getProviderStatus('genius')} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Paiements mobile money en Côte d'Ivoire
                                    </p>
                                </div>
                                <Switch
                                    id="genius-switch"
                                    checked={paymentProviders.genius}
                                    onCheckedChange={() => handleProviderToggle('genius')}
                                />
                            </div>

                            {/* Wave */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Label htmlFor="wave-switch" className="font-semibold">Wave</Label>
                                        <StatusBadge status={getProviderStatus('wave')} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Paiements mobile money en Afrique de l'Ouest
                                    </p>
                                </div>
                                <Switch
                                    id="wave-switch"
                                    checked={paymentProviders.wave}
                                    onCheckedChange={() => handleProviderToggle('wave')}
                                />
                            </div>

                            {/* Stripe */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Label htmlFor="stripe-switch" className="font-semibold">Stripe</Label>
                                        <StatusBadge status={getProviderStatus('stripe')} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Cartes bancaires internationales
                                    </p>
                                </div>
                                <Switch
                                    id="stripe-switch"
                                    checked={paymentProviders.stripe}
                                    onCheckedChange={() => handleProviderToggle('stripe')}
                                />
                            </div>

                            {/* Orange Money */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Label htmlFor="orange-switch" className="font-semibold">Orange Money</Label>
                                        <StatusBadge status={getProviderStatus('orangeMoney')} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Paiements mobile money Orange
                                    </p>
                                </div>
                                <Switch
                                    id="orange-switch"
                                    checked={paymentProviders.orangeMoney}
                                    onCheckedChange={() => handleProviderToggle('orangeMoney')}
                                />
                            </div>

                            {/* MTN Mobile Money */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Label htmlFor="mtn-switch" className="font-semibold">MTN Mobile Money</Label>
                                        <StatusBadge status={getProviderStatus('mtn')} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Paiements mobile money MTN
                                    </p>
                                </div>
                                <Switch
                                    id="mtn-switch"
                                    checked={paymentProviders.mtn}
                                    onCheckedChange={() => handleProviderToggle('mtn')}
                                />
                            </div>

                            {/* PayDunya */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Label htmlFor="paydunya-switch" className="font-semibold">PayDunya</Label>
                                        <StatusBadge status={getProviderStatus('paydunya')} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Agrégateur de paiements africains
                                    </p>
                                </div>
                                <Switch
                                    id="paydunya-switch"
                                    checked={paymentProviders.paydunya}
                                    onCheckedChange={() => handleProviderToggle('paydunya')}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Onglet Clés API */}
                <TabsContent value="api-keys" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Clés API Configurées</CardTitle>
                            <CardDescription>
                                Les clés sensibles sont stockées dans les variables d'environnement pour des raisons de sécurité.
                                Contactez un développeur pour les modifier.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Genius Pay */}
                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <Label className="font-semibold">Genius Pay</Label>
                                    <StatusBadge status={getProviderStatus('genius')} />
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Client ID:</span>
                                        <code className="bg-muted px-2 py-1 rounded text-xs">
                                            {isGeniusConfigured ? "GPAY-****" : "Non défini"}
                                        </code>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">API URL:</span>
                                        <code className="bg-muted px-2 py-1 rounded text-xs">
                                            {process.env.GENIUS_PAY_API_URL || "Non défini"}
                                        </code>
                                    </div>
                                </div>
                            </div>

                            {/* Stripe */}
                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <Label className="font-semibold">Stripe</Label>
                                    <StatusBadge status={getProviderStatus('stripe')} />
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Public Key:</span>
                                        <code className="bg-muted px-2 py-1 rounded text-xs">
                                            {isStripeConfigured ? "pk_****" : "Non défini"}
                                        </code>
                                    </div>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    <strong>💡 Note :</strong> Pour configurer ou modifier les clés API, éditez le fichier <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">.env.local</code> à la racine du projet.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Onglet Sécurité */}
                <TabsContent value="security" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Paramètres de Sécurité</CardTitle>
                            <CardDescription>Configuration des options de sécurité de la plateforme</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label className="font-semibold">Logs d'audit détaillés</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Enregistrer toutes les actions administratives
                                    </p>
                                </div>
                                <Switch defaultChecked disabled />
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label className="font-semibold">Limite de tentatives de connexion</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Bloquer après 5 tentatives échouées
                                    </p>
                                </div>
                                <Switch defaultChecked disabled />
                            </div>

                            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    <strong>⚠️ Fonctionnalités à venir :</strong> Les options de sécurité avancées seront disponibles dans une prochaine version.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Enregistrer les modifications
                </Button>
            </div>
        </div>
    );
};
